import type { IndexerEvent } from './listener';
import { handleTaskCreated } from './handlers/task-created';
import { handleWorkSubmitted } from './handlers/work-submitted';
import { handleJudgmentSubmitted } from './handlers/judgment-submitted';
import { handlePhaseChanged } from './handlers/phase-changed';
import { handleTaskResolved } from './handlers/task-resolved';
import { handleTaskFailed } from './handlers/task-failed';
import { handleTaskCancelled } from './handlers/task-cancelled';
import { handleAgentRegistered } from './handlers/agent-registered';
import { handleAgentProfileUpdated } from './handlers/agent-profile-updated';
import { dispatchWebhookNotifications } from './services/webhook-dispatch';

/**
 * Process an indexer event by routing to the appropriate handler
 * Updated for V2 consensus model (N+M workers + judges)
 */
export async function processEvent(event: IndexerEvent): Promise<void> {
  console.log(`Processing event: ${event.name} at block ${event.blockNumber}`);

  try {
    switch (event.name) {
      // TaskManagerV2 events
      case 'TaskCreated':
        await handleTaskCreated(event);
        break;

      case 'WorkSubmitted':
        await handleWorkSubmitted(event);
        break;

      case 'JudgmentSubmitted':
        await handleJudgmentSubmitted(event);
        break;

      case 'PhaseChanged':
        await handlePhaseChanged(event);
        break;

      case 'TaskResolved':
        await handleTaskResolved(event);
        break;

      case 'TaskFailed':
        await handleTaskFailed(event);
        break;

      case 'TaskCancelled':
        await handleTaskCancelled(event);
        break;

      // PactAgentAdapter events (ERC-8004)
      case 'AgentRegistered':
        await handleAgentRegistered(event);
        break;

      case 'AgentProfileUpdated':
        await handleAgentProfileUpdated(event);
        break;

      default:
        console.warn(`Unknown event type: ${event.name}`);
    }

    // Fire-and-forget webhook notifications after successful event processing.
    // Intentional: webhook failures must never block event indexing or trigger
    // DLQ retries -- database consistency is the primary concern; webhooks are
    // best-effort delivery. dispatchWebhookNotifications() catches all internal
    // errors. Webhook retry logic is handled separately by processWebhookRetries().
    dispatchWebhookNotifications(event);
  } catch (error) {
    console.error(`Failed to process event ${event.name}:`, error);
    throw error; // Re-throw to allow retry logic
  }
}
