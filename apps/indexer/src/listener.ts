import { getPublicClient, getBlockNumber } from '@pactprotocol/web3-utils';
import { getContractAddresses } from '@pactprotocol/contracts';
import { getLastSyncedBlock, updateSyncState } from '@pactprotocol/database';
import type { Log } from 'viem';

export interface EventListener {
  start(): Promise<void>;
  stop(): void;
  onEvent(handler: (event: IndexerEvent) => Promise<void>): void;
  getLastProcessedBlock(): bigint;
  isRunning(): boolean;
  hasCompletedInitialSync(): boolean;
}

export interface IndexerEvent {
  name: string;
  chainId: number;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  args: Record<string, unknown>;
}

/**
 * Create an event listener for blockchain events
 * Updated for V2 consensus model (N+M workers + judges)
 */
export function createEventListener(
  chainId: number = 84532,
  pollingIntervalMs: number = 5000
): EventListener {
  const publicClient = getPublicClient(chainId);
  const addresses = getContractAddresses(chainId);

  let running = false;
  let lastProcessedBlock: bigint = 0n;
  let completedInitialSync = false;
  let eventHandler: ((event: IndexerEvent) => Promise<void>) | null = null;

  const parseEvent = (log: Log, name: string): IndexerEvent => {
    // viem's Log type doesn't include `args` generically because it varies by ABI.
    // When viem decodes a log with an ABI (via getContractEvents), it adds `args` to the
    // log object at runtime. We access it via a type-safe extension cast rather than `any`.
    const decodedLog = log as Log & { args?: Record<string, unknown> };

    // SECURITY: Validate that the log address matches expected contract addresses.
    // Although viem filters by address in the query, this guards against RPC misbehavior.
    const logAddress = log.address?.toLowerCase();
    const expectedAddresses = [
      addresses.taskManager.toLowerCase(),
      addresses.agentAdapter.toLowerCase(),
    ];
    if (logAddress && !expectedAddresses.includes(logAddress)) {
      console.error(
        `[listener] Unexpected contract address ${logAddress} in ${name} event. ` +
        `Expected one of: ${expectedAddresses.join(', ')}. Skipping event.`
      );
      // Return event with empty args so it gets skipped by handlers
      return {
        name: '__INVALID__',
        chainId,
        blockNumber: log.blockNumber ?? 0n,
        transactionHash: log.transactionHash ?? '0x0',
        logIndex: log.logIndex ?? 0,
        args: {},
      };
    }

    return {
      name,
      chainId,
      blockNumber: log.blockNumber ?? 0n,
      transactionHash: log.transactionHash ?? '0x0',
      logIndex: log.logIndex ?? 0,
      args: decodedLog.args ?? {},
    };
  };

  const pollEvents = async () => {
    if (!running || !eventHandler) return;

    try {
      const currentBlock = await getBlockNumber(chainId);

      if (lastProcessedBlock === 0n) {
        // On first run, start from current block
        lastProcessedBlock = currentBlock;
        console.log(`Starting from block ${currentBlock}`);
        return;
      }

      // Capture fromBlock IMMEDIATELY to prevent race conditions
      // This must be captured before any async operations that could allow
      // concurrent pollEvents calls to modify lastProcessedBlock
      const fromBlock = lastProcessedBlock + 1n;

      // Validate block range and detect potential chain reorgs.
      // A reorg is signalled when lastProcessedBlock jumps ahead of currentBlock,
      // which should not happen under normal operation. Step back by REORG_SAFE_DISTANCE
      // so that re-orged blocks are re-fetched on the next poll cycle.
      const REORG_SAFE_DISTANCE = 10n;
      if (fromBlock > currentBlock) {
        console.warn(
          `[listener] Potential chain reorg detected: fromBlock=${fromBlock} > currentBlock=${currentBlock}. ` +
          `Stepping back ${REORG_SAFE_DISTANCE} blocks to re-process from block ${currentBlock - REORG_SAFE_DISTANCE}.`
        );
        // Step back by REORG_SAFE_DISTANCE to ensure re-orged events are re-processed.
        // Guard against going below block 0.
        lastProcessedBlock =
          currentBlock > REORG_SAFE_DISTANCE ? currentBlock - REORG_SAFE_DISTANCE - 1n : 0n;
        return;
      }

      // ============ TaskManagerV2 Events ============

      // TaskCreated (V2: includes requiredWorkers, requiredJudges, workDeadline, judgeDeadline)
      const taskCreatedLogs = await publicClient.getLogs({
        address: addresses.taskManager,
        event: {
          type: 'event',
          name: 'TaskCreated',
          inputs: [
            { name: 'taskId', type: 'uint256', indexed: true },
            { name: 'creator', type: 'address', indexed: true },
            { name: 'bounty', type: 'uint256', indexed: false },
            { name: 'bountyToken', type: 'address', indexed: false },
            { name: 'specCid', type: 'string', indexed: false },
            { name: 'requiredWorkers', type: 'uint8', indexed: false },
            { name: 'requiredJudges', type: 'uint8', indexed: false },
            { name: 'workDeadline', type: 'uint256', indexed: false },
            { name: 'judgeDeadline', type: 'uint256', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // WorkSubmitted (V2: worker instead of agent, slotIndex instead of submissionIndex)
      const workSubmittedLogs = await publicClient.getLogs({
        address: addresses.taskManager,
        event: {
          type: 'event',
          name: 'WorkSubmitted',
          inputs: [
            { name: 'taskId', type: 'uint256', indexed: true },
            { name: 'worker', type: 'address', indexed: true },
            { name: 'submissionCid', type: 'string', indexed: false },
            { name: 'slotIndex', type: 'uint256', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // JudgmentSubmitted (V2 new event)
      const judgmentSubmittedLogs = await publicClient.getLogs({
        address: addresses.taskManager,
        event: {
          type: 'event',
          name: 'JudgmentSubmitted',
          inputs: [
            { name: 'taskId', type: 'uint256', indexed: true },
            { name: 'judge', type: 'address', indexed: true },
            { name: 'judgmentIndex', type: 'uint8', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // PhaseChanged (V2 new event)
      const phaseChangedLogs = await publicClient.getLogs({
        address: addresses.taskManager,
        event: {
          type: 'event',
          name: 'PhaseChanged',
          inputs: [
            { name: 'taskId', type: 'uint256', indexed: true },
            { name: 'fromPhase', type: 'uint8', indexed: false },
            { name: 'toPhase', type: 'uint8', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // TaskResolved (V2 new event)
      const taskResolvedLogs = await publicClient.getLogs({
        address: addresses.taskManager,
        event: {
          type: 'event',
          name: 'TaskResolved',
          inputs: [
            { name: 'taskId', type: 'uint256', indexed: true },
            { name: 'consensusRanking', type: 'uint8[]', indexed: false },
            { name: 'winningWorkers', type: 'address[]', indexed: false },
            { name: 'consensusJudges', type: 'address[]', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // TaskFailed (V2 new event)
      const taskFailedLogs = await publicClient.getLogs({
        address: addresses.taskManager,
        event: {
          type: 'event',
          name: 'TaskFailed',
          inputs: [
            { name: 'taskId', type: 'uint256', indexed: true },
            { name: 'reason', type: 'string', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // TaskCancelled (unchanged from V1)
      const taskCancelledLogs = await publicClient.getLogs({
        address: addresses.taskManager,
        event: {
          type: 'event',
          name: 'TaskCancelled',
          inputs: [
            { name: 'taskId', type: 'uint256', indexed: true },
            { name: 'creator', type: 'address', indexed: true },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // ============ PactAgentAdapter Events (ERC-8004) ============

      // AgentRegistered (from ERC-8004 adapter)
      const agentRegisteredLogs = await publicClient.getLogs({
        address: addresses.agentAdapter,
        event: {
          type: 'event',
          name: 'AgentRegistered',
          inputs: [
            { name: 'wallet', type: 'address', indexed: true },
            { name: 'agentId', type: 'uint256', indexed: true },
            { name: 'agentURI', type: 'string', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // AgentProfileUpdated (from ERC-8004 adapter)
      const agentProfileUpdatedLogs = await publicClient.getLogs({
        address: addresses.agentAdapter,
        event: {
          type: 'event',
          name: 'AgentProfileUpdated',
          inputs: [
            { name: 'wallet', type: 'address', indexed: true },
            { name: 'agentId', type: 'uint256', indexed: true },
            { name: 'newURI', type: 'string', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // Process all events
      const allEvents = [
        ...taskCreatedLogs.map((l) => parseEvent(l, 'TaskCreated')),
        ...workSubmittedLogs.map((l) => parseEvent(l, 'WorkSubmitted')),
        ...judgmentSubmittedLogs.map((l) => parseEvent(l, 'JudgmentSubmitted')),
        ...phaseChangedLogs.map((l) => parseEvent(l, 'PhaseChanged')),
        ...taskResolvedLogs.map((l) => parseEvent(l, 'TaskResolved')),
        ...taskFailedLogs.map((l) => parseEvent(l, 'TaskFailed')),
        ...taskCancelledLogs.map((l) => parseEvent(l, 'TaskCancelled')),
        ...agentRegisteredLogs.map((l) => parseEvent(l, 'AgentRegistered')),
        ...agentProfileUpdatedLogs.map((l) => parseEvent(l, 'AgentProfileUpdated')),
      ];

      // Sort by block number and log index
      allEvents.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber < b.blockNumber ? -1 : 1;
        }
        return a.logIndex - b.logIndex;
      });

      // Process events and persist checkpoint per-block to minimize re-processing on crash.
      // If the process crashes after handling events but before the checkpoint, only the
      // events in the last un-checkpointed block need to be re-processed (idempotently).
      let lastCheckpointedBlock = lastProcessedBlock;
      for (const event of allEvents) {
        await eventHandler(event);

        // Persist checkpoint when we finish all events in a block
        if (event.blockNumber > lastCheckpointedBlock) {
          try {
            await Promise.all([
              updateSyncState(chainId, addresses.taskManager, event.blockNumber),
              updateSyncState(chainId, addresses.agentAdapter, event.blockNumber),
            ]);
            lastCheckpointedBlock = event.blockNumber;
          } catch (error) {
            console.warn(`Failed to save checkpoint at block ${event.blockNumber}:`, error);
          }
        }
      }

      lastProcessedBlock = currentBlock;
      completedInitialSync = true;

      // Final checkpoint to currentBlock (may be ahead of last event block)
      if (currentBlock > lastCheckpointedBlock) {
        try {
          await Promise.all([
            updateSyncState(chainId, addresses.taskManager, currentBlock),
            updateSyncState(chainId, addresses.agentAdapter, currentBlock),
          ]);
        } catch (error) {
          console.warn('Failed to save final checkpoint:', error);
        }
      }

      if (allEvents.length > 0) {
        console.log(`Processed ${allEvents.length} events up to block ${currentBlock}`);
      }
    } catch (error) {
      console.error('Error polling events:', error);
    }
  };

  let pollTimeout: Timer | null = null;

  return {
    async start() {
      running = true;
      console.log(`Starting event listener for chain ${chainId}`);

      // Load checkpoints from database for all contracts
      try {
        const checkpoints = await Promise.all([
          getLastSyncedBlock(chainId, addresses.taskManager),
          getLastSyncedBlock(chainId, addresses.agentAdapter),
        ]);
        const validCheckpoints = checkpoints.filter((c): c is bigint => c !== null);
        if (validCheckpoints.length > 0) {
          // Use the minimum block across all contracts as the single shared lastProcessedBlock.
          // This is conservative -- see comment in V1 for rationale.
          lastProcessedBlock = validCheckpoints.reduce((min, c) => (c < min ? c : min));
          console.log(
            `Resuming from minimum checkpoint: block ${lastProcessedBlock} (across ${validCheckpoints.length} contracts)`
          );
        } else {
          console.log('No checkpoint found, will start from current block');
        }
      } catch (error) {
        console.warn('Failed to load checkpoint, starting from current block:', error);
      }

      // Use recursive setTimeout instead of setInterval to ensure sequential execution
      // This prevents race conditions where overlapping pollEvents calls could cause
      // fromBlock > toBlock errors
      const poll = async () => {
        if (!running) return;
        await pollEvents();
        if (running) {
          pollTimeout = setTimeout(poll, pollingIntervalMs);
        }
      };

      await poll();
    },

    stop() {
      running = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
      }
      console.log('Event listener stopped');
    },

    onEvent(handler) {
      eventHandler = handler;
    },

    getLastProcessedBlock() {
      return lastProcessedBlock;
    },

    isRunning() {
      return running;
    },

    hasCompletedInitialSync() {
      return completedInitialSync;
    },
  };
}
