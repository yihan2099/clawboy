/**
 * Webhook Notification Service
 *
 * Delivers signed webhook payloads to agents after indexer events.
 * - Fire-and-forget with 5-second timeout
 * - HMAC-SHA256 payload signing per agent
 * - Logs delivery attempts to webhook_deliveries table
 * - Retries failed deliveries up to 3 times with exponential backoff
 *
 * Updated for V2 consensus model.
 */

import {
  getAgentsWithWebhooks,
  getAgentsWebhookInfoByAddresses,
  getAgentWebhookInfo,
  createWebhookDelivery,
  updateWebhookDelivery,
  getRetryableWebhookDeliveries,
  getSubmissionsByTaskId,
  type AgentWebhookInfo,
} from '@pactprotocol/database';

const WEBHOOK_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;
// Overall batch timeout prevents the whole batch from blocking indefinitely.
const _batchTimeoutEnv = parseInt(process.env.WEBHOOK_BATCH_TIMEOUT_MS ?? '', 10);
const BATCH_TIMEOUT_MS = Number.isFinite(_batchTimeoutEnv) && _batchTimeoutEnv > 0
  ? _batchTimeoutEnv
  : 30_000;

// Circuit breaker: track consecutive batch timeouts to detect systemic delivery failures.
// After CIRCUIT_BREAKER_THRESHOLD consecutive timeouts, escalate to error-level logging.
const CIRCUIT_BREAKER_THRESHOLD = 5;
let consecutiveTimeouts = 0;

export interface WebhookPayload {
  event: string;
  taskId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Compute HMAC-SHA256 signature for a payload.
 *
 * NOTE: crypto.subtle requires a "secure context" in browsers (HTTPS origin).
 * In Bun/Node.js runtimes this is always available. If this code is ever used
 * in a browser environment, ensure it runs on an HTTPS page or crypto.subtle
 * will be undefined and throw at runtime.
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Send a webhook to a single agent (fire-and-forget)
 */
async function deliverWebhook(agent: AgentWebhookInfo, payload: WebhookPayload): Promise<void> {
  const payloadJson = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Pact-Webhook/1.0',
    'X-Pact-Event': payload.event,
  };

  // Sign payload if agent has a webhook secret
  if (agent.webhook_secret) {
    const signature = await signPayload(payloadJson, agent.webhook_secret);
    headers['X-Pact-Signature'] = `sha256=${signature}`;
  }

  // Record delivery attempt
  let deliveryId: string | null = null;
  try {
    const delivery = await createWebhookDelivery({
      agent_address: agent.address,
      event_name: payload.event,
      payload: payload as unknown as import('@pactprotocol/database').Json,
      status: 'pending',
      attempt: 1,
      max_attempts: MAX_ATTEMPTS,
    });
    deliveryId = delivery.id;
  } catch (err) {
    console.warn(`Failed to record webhook delivery for ${agent.address}:`, err);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(agent.webhook_url, {
      method: 'POST',
      headers,
      body: payloadJson,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (deliveryId) {
      if (response.ok) {
        await updateWebhookDelivery(deliveryId, {
          status: 'delivered',
          status_code: response.status,
          delivered_at: new Date().toISOString(),
        }).catch(() => {});
      } else {
        // Schedule retry with exponential backoff
        const nextRetryAt = new Date(Date.now() + 30_000).toISOString(); // 30s for first retry
        await updateWebhookDelivery(deliveryId, {
          status: 'pending',
          status_code: response.status,
          error_message: `HTTP ${response.status}`,
          next_retry_at: nextRetryAt,
        }).catch(() => {});
      }
    }

    if (!response.ok) {
      console.warn(`Webhook delivery to ${agent.address} returned ${response.status}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`Webhook delivery to ${agent.address} failed: ${errorMessage}`);

    if (deliveryId) {
      const nextRetryAt = new Date(Date.now() + 30_000).toISOString();
      await updateWebhookDelivery(deliveryId, {
        status: 'pending',
        error_message: errorMessage,
        next_retry_at: nextRetryAt,
      }).catch(() => {});
    }
  }
}

/**
 * Send webhooks to multiple agents (fire-and-forget, non-blocking)
 */
function notifyAgents(agents: AgentWebhookInfo[], payload: WebhookPayload): void {
  if (agents.length === 0) return;

  const batch = Promise.allSettled(agents.map((agent) => deliverWebhook(agent, payload)));

  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), BATCH_TIMEOUT_MS);
  });

  // Fire-and-forget: don't await, just log errors.
  Promise.race([batch, timeout]).then((results) => {
    if (results === null) {
      consecutiveTimeouts++;
      if (consecutiveTimeouts >= CIRCUIT_BREAKER_THRESHOLD) {
        console.error(
          `[webhook] CIRCUIT BREAKER: ${consecutiveTimeouts} consecutive batch timeouts detected. ` +
            `Webhook delivery system may be failing systemically. ` +
            `Latest: ${payload.event} batch exceeded ${BATCH_TIMEOUT_MS}ms (${agents.length} agents).`
        );
      } else {
        console.warn(
          `[webhook] Batch timeout: ${payload.event} batch exceeded ${BATCH_TIMEOUT_MS}ms ` +
            `(${agents.length} agents). Some deliveries may still be in-flight. ` +
            `(${consecutiveTimeouts}/${CIRCUIT_BREAKER_THRESHOLD} consecutive timeouts)`
        );
      }
      return;
    }
    // Batch completed normally -- reset consecutive timeout counter
    consecutiveTimeouts = 0;
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(
        `[webhook] Delivery failures: ${failures.length}/${agents.length} webhook(s) failed ` +
          `for event ${payload.event} (not a batch timeout -- batch completed normally)`
      );
    }
  });
}

// ============ Event-specific notification functions ============

/**
 * Notify all agents with webhooks about a new task
 */
export async function notifyTaskCreated(
  taskId: string,
  creator: string,
  title: string,
  bountyAmount: string,
  tags: string[]
): Promise<void> {
  try {
    const agents = await getAgentsWithWebhooks();
    // Exclude the creator from notifications
    const recipients = agents.filter((a) => a.address !== creator.toLowerCase());

    notifyAgents(recipients, {
      event: 'TaskCreated',
      taskId,
      timestamp: new Date().toISOString(),
      data: { creator, title, bountyAmount, tags },
    });
  } catch (err) {
    console.warn('Failed to send TaskCreated webhooks:', err);
  }
}

/**
 * Notify task creator about a new submission
 */
export async function notifyWorkSubmitted(
  taskId: string,
  creatorAddress: string,
  worker: string
): Promise<void> {
  try {
    const webhookInfo = await getAgentWebhookInfo(creatorAddress);
    if (!webhookInfo) return;

    notifyAgents([webhookInfo], {
      event: 'WorkSubmitted',
      taskId,
      timestamp: new Date().toISOString(),
      data: { worker },
    });
  } catch (err) {
    console.warn('Failed to send WorkSubmitted webhook:', err);
  }
}

/**
 * Notify task creator about a new judgment
 */
export async function notifyJudgmentSubmitted(
  taskId: string,
  creatorAddress: string,
  judge: string,
  judgmentIndex: number
): Promise<void> {
  try {
    const webhookInfo = await getAgentWebhookInfo(creatorAddress);
    if (!webhookInfo) return;

    notifyAgents([webhookInfo], {
      event: 'JudgmentSubmitted',
      taskId,
      timestamp: new Date().toISOString(),
      data: { judge, judgmentIndex },
    });
  } catch (err) {
    console.warn('Failed to send JudgmentSubmitted webhook:', err);
  }
}

/**
 * Notify all submitters and judges about task resolution
 */
export async function notifyTaskResolved(
  taskId: string,
  dbTaskId: string,
  winningWorkers: string[],
  consensusJudges: string[]
): Promise<void> {
  try {
    // Get all submitters for this task
    const { submissions } = await getSubmissionsByTaskId(dbTaskId);
    const submitterAddresses = submissions.map((s) => s.agent_address);

    // Combine submitters and judges for notification
    const allAddresses = [...new Set([...submitterAddresses, ...consensusJudges])];

    const agents = await getAgentsWebhookInfoByAddresses(allAddresses);
    if (agents.length === 0) return;

    notifyAgents(agents, {
      event: 'TaskResolved',
      taskId,
      timestamp: new Date().toISOString(),
      data: { winningWorkers, consensusJudges },
    });
  } catch (err) {
    console.warn('Failed to send TaskResolved webhooks:', err);
  }
}

/**
 * Process retryable webhook deliveries (called periodically)
 */
export async function processWebhookRetries(): Promise<void> {
  const deliveries = await getRetryableWebhookDeliveries(50);
  if (deliveries.length === 0) return;

  console.log(`Processing ${deliveries.length} webhook retries`);

  // Batch-fetch all agent webhook info to avoid N+1 DB queries
  const uniqueAddresses = [...new Set(deliveries.map((d) => d.agent_address))];
  const agentInfoList = await getAgentsWebhookInfoByAddresses(uniqueAddresses);
  const agentInfoMap = new Map<string, AgentWebhookInfo>();
  for (const agent of agentInfoList) {
    agentInfoMap.set(agent.address, agent);
  }

  for (const delivery of deliveries) {
    const agentInfo = agentInfoMap.get(delivery.agent_address) ?? null;
    if (!agentInfo) {
      // Agent no longer has a webhook, mark as failed
      await updateWebhookDelivery(delivery.id, {
        status: 'failed',
        error_message: 'Agent no longer has a webhook URL',
      }).catch(() => {});
      continue;
    }

    const nextAttempt = delivery.attempt + 1;
    if (nextAttempt > delivery.max_attempts) {
      await updateWebhookDelivery(delivery.id, {
        status: 'failed',
        error_message: `Max attempts (${delivery.max_attempts}) exceeded`,
      }).catch(() => {});
      continue;
    }

    const payload = delivery.payload as unknown as WebhookPayload;
    const payloadJson = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pact-Webhook/1.0',
      'X-Pact-Event': payload.event,
    };

    if (agentInfo.webhook_secret) {
      const signature = await signPayload(payloadJson, agentInfo.webhook_secret);
      headers['X-Pact-Signature'] = `sha256=${signature}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const response = await fetch(agentInfo.webhook_url, {
        method: 'POST',
        headers,
        body: payloadJson,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        await updateWebhookDelivery(delivery.id, {
          status: 'delivered',
          status_code: response.status,
          attempt: nextAttempt,
          delivered_at: new Date().toISOString(),
        }).catch(() => {});
      } else {
        // Exponential backoff: 30s, 120s, 480s
        const backoffMs = 30_000 * Math.pow(4, nextAttempt - 1);
        const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

        await updateWebhookDelivery(delivery.id, {
          status: nextAttempt >= delivery.max_attempts ? 'failed' : 'pending',
          status_code: response.status,
          error_message: `HTTP ${response.status}`,
          attempt: nextAttempt,
          next_retry_at: nextRetryAt,
        }).catch(() => {});
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const backoffMs = 30_000 * Math.pow(4, nextAttempt - 1);
      const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

      await updateWebhookDelivery(delivery.id, {
        status: nextAttempt >= delivery.max_attempts ? 'failed' : 'pending',
        error_message: errorMessage,
        attempt: nextAttempt,
        next_retry_at: nextRetryAt,
      }).catch(() => {});
    }
  }
}
