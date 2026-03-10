import { TaskManagerABI, getContractAddresses } from '@pactprotocol/contracts';
import { getPublicClient } from '../client/public-client';
import type { TaskPhase } from '@pactprotocol/shared-types';
import { withContractRetry, type RetryConfig } from '../utils/retry';

/**
 * Get default chain ID from environment
 */
function getDefaultChainId(): number {
  return parseInt(process.env.CHAIN_ID || '84532', 10);
}

/**
 * Get TaskManager contract address
 */
export function getTaskManagerAddress(chainId?: number): `0x${string}` {
  const addresses = getContractAddresses(chainId || getDefaultChainId());
  return addresses.taskManager;
}

/**
 * Get task count from contract with automatic retry on transient failures
 */
export async function getTaskCount(chainId?: number, retryConfig?: RetryConfig): Promise<bigint> {
  const resolvedChainId = chainId || getDefaultChainId();
  const publicClient = getPublicClient(resolvedChainId);
  const addresses = getContractAddresses(resolvedChainId);

  return withContractRetry(
    () =>
      publicClient.readContract({
        address: addresses.taskManager,
        abi: TaskManagerABI,
        functionName: 'taskCounter',
      }) as Promise<bigint>,
    retryConfig
  );
}

/**
 * Get task by ID from TaskManagerV2 contract
 */
export async function getTask(
  taskId: bigint,
  chainId?: number,
  retryConfig?: RetryConfig
): Promise<{
  creator: `0x${string}`;
  specCid: string;
  bounty: bigint;
  bountyToken: `0x${string}`;
  requiredWorkers: number;
  requiredJudges: number;
  workDeadline: bigint;
  judgeDeadline: bigint;
  phase: number;
  submissionCount: number;
  judgmentCount: number;
}> {
  const resolvedChainId = chainId || getDefaultChainId();
  const publicClient = getPublicClient(resolvedChainId);
  const addresses = getContractAddresses(resolvedChainId);

  const result = await withContractRetry(
    () =>
      publicClient.readContract({
        address: addresses.taskManager,
        abi: TaskManagerABI,
        functionName: 'getTask',
        args: [taskId],
      }),
    retryConfig
  );

  // TaskManagerV2 returns a Task struct
  const task = result as unknown as {
    creator: `0x${string}`;
    specCid: string;
    bounty: bigint;
    bountyToken: `0x${string}`;
    requiredWorkers: number;
    requiredJudges: number;
    workDeadline: bigint;
    judgeDeadline: bigint;
    phase: number;
    submissionCount: number;
    judgmentCount: number;
  };

  return task;
}

/**
 * Convert contract phase number to TaskPhase enum (V2 phase model)
 */
export function contractPhaseToTaskPhase(phase: number): TaskPhase {
  const phaseMap: Record<number, TaskPhase> = {
    0: 'open' as TaskPhase,
    1: 'work_phase' as TaskPhase,
    2: 'judge_phase' as TaskPhase,
    3: 'resolved' as TaskPhase,
    4: 'cancelled' as TaskPhase,
    5: 'failed' as TaskPhase,
  };

  const mapped = phaseMap[phase];
  if (mapped === undefined) {
    throw new Error(
      `Unknown contract task phase: ${phase}. ` +
        `Update contractPhaseToTaskPhase() to handle the new phase value.`
    );
  }

  return mapped;
}
