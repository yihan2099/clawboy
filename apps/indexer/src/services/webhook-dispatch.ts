/**
 * Webhook Dispatch
 *
 * Maps indexer events to the appropriate webhook notification functions.
 * All dispatching is fire-and-forget -- errors are logged but never propagated.
 *
 * Updated for V2 consensus model.
 */

import * as Sentry from '@sentry/bun';
import type { IndexerEvent } from '../listener';
import { getTaskByChainId } from '@pactprotocol/database';
import {
  notifyTaskCreated,
  notifyWorkSubmitted,
  notifyTaskResolved,
  notifyJudgmentSubmitted,
} from './webhook-notifier';

/**
 * Dispatch webhook notifications for a processed event.
 * Fire-and-forget: never throws, logs all errors internally.
 */
export function dispatchWebhookNotifications(event: IndexerEvent): void {
  // Wrap in an immediately-invoked async function so we can await DB queries
  // but still return void synchronously (fire-and-forget)
  (async () => {
    try {
      switch (event.name) {
        case 'TaskCreated': {
          const { taskId, creator, bounty } = event.args as {
            taskId: bigint;
            creator: `0x${string}`;
            bounty: bigint;
          };
          // Look up task from DB for title and tags (just created by handler)
          const task = await getTaskByChainId(taskId.toString(), event.chainId);
          await notifyTaskCreated(
            taskId.toString(),
            creator.toLowerCase(),
            task?.title ?? 'New Task',
            bounty.toString(),
            task?.tags ?? []
          );
          break;
        }

        case 'WorkSubmitted': {
          const { taskId, worker } = event.args as {
            taskId: bigint;
            worker: `0x${string}`;
          };
          const task = await getTaskByChainId(taskId.toString(), event.chainId);
          if (task) {
            await notifyWorkSubmitted(taskId.toString(), task.creator_address, worker.toLowerCase());
          }
          break;
        }

        case 'JudgmentSubmitted': {
          const { taskId, judge, judgmentIndex } = event.args as {
            taskId: bigint;
            judge: `0x${string}`;
            judgmentIndex: number;
          };
          const task = await getTaskByChainId(taskId.toString(), event.chainId);
          if (task) {
            await notifyJudgmentSubmitted(
              taskId.toString(),
              task.creator_address,
              judge.toLowerCase(),
              judgmentIndex
            );
          }
          break;
        }

        case 'TaskResolved': {
          const { taskId, winningWorkers, consensusJudges } = event.args as {
            taskId: bigint;
            winningWorkers: readonly `0x${string}`[];
            consensusJudges: readonly `0x${string}`[];
          };
          const task = await getTaskByChainId(taskId.toString(), event.chainId);
          if (task) {
            await notifyTaskResolved(
              taskId.toString(),
              task.id,
              winningWorkers.map((a) => a.toLowerCase()),
              consensusJudges.map((a) => a.toLowerCase())
            );
          }
          break;
        }

        // No webhook notifications for these events
        case 'PhaseChanged':
        case 'TaskFailed':
        case 'TaskCancelled':
        case 'AgentRegistered':
        case 'AgentProfileUpdated':
          break;

        default:
          break;
      }
    } catch (err) {
      console.error(`[webhook-dispatch] Error dispatching ${event.name}:`, err);
      Sentry.captureException(err, {
        tags: {
          component: 'webhook-dispatch',
          eventName: event.name,
        },
        extra: {
          chainId: event.chainId,
          blockNumber: event.blockNumber.toString(),
          transactionHash: event.transactionHash,
        },
      });
    }
  })();
}
