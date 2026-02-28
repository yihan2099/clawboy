import * as Sentry from '@sentry/bun';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

/**
 * Pact Event Indexer
 *
 * Syncs blockchain events to the Supabase database for fast querying.
 * Includes idempotency protection and dead-letter queue for failed events.
 */

import { createEventListener, type IndexerEvent } from './listener';
import { processEvent } from './processor';
import {
  isEventProcessed,
  markEventProcessed,
  addFailedEvent,
  getRetryableFailedEvents,
  updateFailedEventRetry,
  resolveFailedEvent,
} from '@pactprotocol/database';
import { startIpfsRetryJob } from './jobs';
import { startHealthServer } from './health';
import { processWebhookRetries } from './services/webhook-notifier';

const chainId = parseInt(process.env.CHAIN_ID || '84532', 10);

/**
 * Recursively serialize BigInt values to strings for JSON compatibility
 */
function serializeBigInts(obj: unknown): unknown {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, serializeBigInts(v)]));
  }
  return obj;
}

/** Maximum number of events in the dead-letter queue before alerting */
const DLQ_SIZE_LIMIT = parseInt(process.env.DLQ_SIZE_LIMIT || '1000', 10);

/**
 * Check if the DLQ has grown too large and emit a warning.
 * Operators should be alerted when the DLQ grows beyond DLQ_SIZE_LIMIT.
 */
async function checkDlqSize(): Promise<void> {
  try {
    const retryable = await getRetryableFailedEvents(DLQ_SIZE_LIMIT + 1);
    if (retryable.length > DLQ_SIZE_LIMIT) {
      console.error(
        `[ALERT] DLQ size exceeded limit: ${retryable.length} events pending (limit: ${DLQ_SIZE_LIMIT}). ` +
          `Investigate failed events to prevent unbounded queue growth.`
      );
    }
  } catch {
    // Non-fatal: DLQ size check should not interrupt processing
  }
}

/**
 * Process an event with idempotency check and DLQ support
 */
async function processEventWithIdempotency(event: IndexerEvent): Promise<void> {
  // Check if already processed (idempotency)
  const alreadyProcessed = await isEventProcessed(chainId, event.transactionHash, event.logIndex);

  if (alreadyProcessed) {
    console.log(
      `Skipping already processed event: ${event.name} (tx: ${event.transactionHash}, log: ${event.logIndex})`
    );
    return;
  }

  try {
    // Process the event
    await processEvent(event);

    // Mark as processed (idempotency protection)
    await markEventProcessed({
      chainId,
      blockNumber: event.blockNumber.toString(),
      txHash: event.transactionHash,
      logIndex: event.logIndex,
      eventName: event.name,
    });

    console.log(`Successfully processed and marked: ${event.name} (block: ${event.blockNumber})`);
  } catch (error) {
    // Add to dead-letter queue
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`Failed to process event ${event.name}, adding to DLQ:`, errorMessage);

    await addFailedEvent({
      chainId,
      blockNumber: event.blockNumber.toString(),
      txHash: event.transactionHash,
      logIndex: event.logIndex,
      eventName: event.name,
      eventData: serializeBigInts(event.args) as Record<string, unknown>,
      errorMessage,
      errorStack,
    });

    // Don't re-throw - we've recorded the failure
  }
}

/**
 * Process retryable events from the DLQ
 */
async function processRetryableEvents(): Promise<void> {
  const retryableEvents = await getRetryableFailedEvents(10);

  if (retryableEvents.length === 0) {
    return;
  }

  console.log(`Processing ${retryableEvents.length} retryable events from DLQ`);

  for (const failedEvent of retryableEvents) {
    try {
      // Check if event was already processed (may have succeeded before DLQ)
      const alreadyProcessed = await isEventProcessed(
        failedEvent.chain_id,
        failedEvent.tx_hash as `0x${string}`,
        failedEvent.log_index
      );

      if (alreadyProcessed) {
        console.log(
          `DLQ event already processed, resolving: ${failedEvent.event_name} (tx: ${failedEvent.tx_hash})`
        );
        await resolveFailedEvent(failedEvent.id, 'Already processed');
        continue;
      }

      // Reconstruct the event
      const event: IndexerEvent = {
        name: failedEvent.event_name,
        chainId: failedEvent.chain_id,
        blockNumber: BigInt(failedEvent.block_number),
        transactionHash: failedEvent.tx_hash as `0x${string}`,
        logIndex: failedEvent.log_index,
        args: failedEvent.event_data,
      };

      // Try to process again
      await processEvent(event);

      // Mark as processed in both tables
      await markEventProcessed({
        chainId: failedEvent.chain_id,
        blockNumber: failedEvent.block_number,
        txHash: failedEvent.tx_hash,
        logIndex: failedEvent.log_index,
        eventName: failedEvent.event_name,
      });

      // Resolve the DLQ entry
      await resolveFailedEvent(failedEvent.id, 'Successfully processed on retry');

      console.log(
        `Successfully retried event: ${failedEvent.event_name} (attempt ${failedEvent.retry_count + 1})`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Check for duplicate key error using PostgreSQL error code 23505.
      // Supabase errors may expose `code` on the error object; fall back to
      // message matching for errors that have been re-wrapped as plain Error instances.
      const pgCode = (error as { code?: string })?.code;
      const isDuplicateKeyError =
        pgCode === '23505' ||
        errorMessage.includes('duplicate key value violates unique constraint');

      if (isDuplicateKeyError) {
        console.log(
          `DLQ event resulted in duplicate key - record already exists, resolving: ${failedEvent.event_name} (tx: ${failedEvent.tx_hash})`
        );

        // Mark as processed to prevent future re-processing
        await markEventProcessed({
          chainId: failedEvent.chain_id,
          blockNumber: failedEvent.block_number,
          txHash: failedEvent.tx_hash,
          logIndex: failedEvent.log_index,
          eventName: failedEvent.event_name,
        });

        await resolveFailedEvent(failedEvent.id, 'Record already exists in database');
        continue;
      }

      console.error(
        `Retry failed for event ${failedEvent.event_name} (attempt ${failedEvent.retry_count + 1}):`,
        errorMessage
      );

      await updateFailedEventRetry(failedEvent.id, errorMessage, errorStack);
    }
  }
}

async function main() {
  console.log('Starting Pact Indexer...');

  const pollingIntervalMs = parseInt(process.env.POLLING_INTERVAL_MS || '5000', 10);
  const dlqRetryIntervalMs = parseInt(process.env.DLQ_RETRY_INTERVAL_MS || '60000', 10);
  const ipfsRetryIntervalMs = parseInt(process.env.IPFS_RETRY_INTERVAL_MS || '300000', 10);
  const webhookRetryIntervalMs = parseInt(process.env.WEBHOOK_RETRY_INTERVAL_MS || '60000', 10);

  console.log(`Chain ID: ${chainId}`);
  console.log(`Polling interval: ${pollingIntervalMs}ms`);
  console.log(`DLQ retry interval: ${dlqRetryIntervalMs}ms`);
  console.log(`IPFS retry interval: ${ipfsRetryIntervalMs}ms`);
  console.log(`Webhook retry interval: ${webhookRetryIntervalMs}ms`);

  // Create event listener
  const listener = createEventListener(chainId, pollingIntervalMs);

  // Start health server (must be before onEvent so it can wrap the handler)
  const healthPort = parseInt(process.env.HEALTH_PORT || '8080', 10);
  const healthServer = startHealthServer(listener, chainId, healthPort);

  // Set up event handler with idempotency
  listener.onEvent(processEventWithIdempotency);

  // Set up DLQ retry interval
  const dlqRetryInterval = setInterval(async () => {
    try {
      await processRetryableEvents();
      // Alert if DLQ has grown too large (prevents unbounded growth)
      await checkDlqSize();
    } catch (error) {
      console.error('Error processing DLQ:', error);
    }
  }, dlqRetryIntervalMs);

  // Start IPFS retry job for failed IPFS fetches
  const stopIpfsRetryJob = startIpfsRetryJob(ipfsRetryIntervalMs);

  // Set up webhook delivery retry interval
  const webhookRetryInterval = setInterval(async () => {
    try {
      await processWebhookRetries();
    } catch (error) {
      console.error('Error processing webhook retries:', error);
    }
  }, webhookRetryIntervalMs);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down...');
    listener.stop();
    clearInterval(dlqRetryInterval);
    clearInterval(webhookRetryInterval);
    stopIpfsRetryJob();
    healthServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start listening
  try {
    await listener.start();
    console.log('Indexer started successfully');

    // Initial DLQ check
    await processRetryableEvents();
  } catch (error) {
    console.error('Failed to start indexer:', error);
    process.exit(1);
  }
}

main();
