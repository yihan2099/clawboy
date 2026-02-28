import { getSupabaseAdminClient } from '../client';
import type { Database } from '../schema/database';

type FailedEventRow = Database['public']['Tables']['failed_events']['Row'];

export interface EventIdentifier {
  chainId: number;
  blockNumber: string;
  txHash: string;
  logIndex: number;
  eventName: string;
}

export interface FailedEventData extends EventIdentifier {
  eventData: Record<string, unknown>;
  errorMessage: string;
  errorStack?: string;
}

/**
 * Check if an event has already been processed
 */
export async function isEventProcessed(
  chainId: number,
  txHash: string,
  logIndex: number
): Promise<boolean> {
  // Normalize hash to lowercase at function entry to ensure consistency
  // regardless of which code path (RPC or fallback) is taken.
  const normalizedTxHash = txHash.toLowerCase();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('is_event_processed', {
    p_chain_id: chainId,
    p_tx_hash: normalizedTxHash,
    p_log_index: logIndex,
  });

  if (error) {
    // If RPC not available, fall back to direct query
    const { data: directData, error: directError } = await supabase
      .from('processed_events')
      .select('id')
      .eq('chain_id', chainId)
      .eq('tx_hash', normalizedTxHash)
      .eq('log_index', logIndex)
      .single();

    if (directError && directError.code !== 'PGRST116') {
      throw new Error(`Failed to check if event is processed: ${directError.message}`);
    }

    return !!directData;
  }

  return data as boolean;
}

/**
 * Mark an event as successfully processed
 * Returns true if newly inserted, false if already existed
 */
export async function markEventProcessed(event: EventIdentifier): Promise<boolean> {
  // Normalize hash to lowercase at function entry
  const normalizedTxHash = event.txHash.toLowerCase();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('mark_event_processed', {
    p_chain_id: event.chainId,
    p_block_number: event.blockNumber,
    p_tx_hash: normalizedTxHash,
    p_log_index: event.logIndex,
    p_event_name: event.eventName,
  });

  if (error) {
    // Fall back to direct insert
    const { error: insertError } = await supabase.from('processed_events').insert({
      chain_id: event.chainId,
      block_number: event.blockNumber,
      tx_hash: normalizedTxHash,
      log_index: event.logIndex,
      event_name: event.eventName,
    });

    if (insertError) {
      // Unique constraint violation means already processed
      if (insertError.code === '23505') {
        return false;
      }
      throw new Error(`Failed to mark event as processed: ${insertError.message}`);
    }

    return true;
  }

  return data as boolean;
}

/**
 * Add a failed event to the dead-letter queue
 */
export async function addFailedEvent(event: FailedEventData): Promise<string> {
  // Normalize hash to lowercase at function entry
  const normalizedTxHash = event.txHash.toLowerCase();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('add_failed_event', {
    p_chain_id: event.chainId,
    p_block_number: event.blockNumber,
    p_tx_hash: normalizedTxHash,
    p_log_index: event.logIndex,
    p_event_name: event.eventName,
    p_event_data: event.eventData,
    p_error_message: event.errorMessage,
    p_error_stack: event.errorStack || null,
  });

  if (error) {
    // Fall back to direct insert/upsert
    const { data: insertData, error: insertError } = await supabase
      .from('failed_events')
      .upsert(
        {
          chain_id: event.chainId,
          block_number: event.blockNumber,
          tx_hash: normalizedTxHash,
          log_index: event.logIndex,
          event_name: event.eventName,
          event_data: event.eventData,
          error_message: event.errorMessage,
          error_stack: event.errorStack || null,
        },
        {
          onConflict: 'chain_id,tx_hash,log_index',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to add event to DLQ: ${insertError.message}`);
    }

    return insertData.id;
  }

  return data as string;
}

/**
 * Get failed events that can be retried
 */
export async function getRetryableFailedEvents(limit: number = 10): Promise<FailedEventRow[]> {
  const supabase = getSupabaseAdminClient();

  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_retryable_failed_events', {
    p_limit: limit,
  });

  if (!rpcError && rpcData) {
    return rpcData as FailedEventRow[];
  }

  // Fall back to direct query
  const { data, error } = await supabase
    .from('failed_events')
    .select('*')
    .in('status', ['pending', 'retrying'])
    .lt('retry_count', 3) // max_retries default
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get retryable events: ${error.message}`);
  }

  return (data ?? []) as FailedEventRow[];
}

/**
 * Get all failed events with pagination
 */
export async function getFailedEvents(options: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ events: FailedEventRow[]; total: number }> {
  const supabase = getSupabaseAdminClient();
  const { status, limit = 20, offset = 0 } = options;

  let query = supabase.from('failed_events').select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to get failed events: ${error.message}`);
  }

  return {
    events: (data ?? []) as FailedEventRow[],
    total: count ?? 0,
  };
}

/**
 * Resolve a failed event (mark as handled)
 */
export async function resolveFailedEvent(eventId: string, notes?: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('resolve_failed_event', {
    p_event_id: eventId,
    p_notes: notes || null,
  });

  if (error) {
    // Fall back to direct update
    const { error: updateError } = await supabase
      .from('failed_events')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: notes || null,
      })
      .eq('id', eventId);

    if (updateError) {
      throw new Error(`Failed to resolve event: ${updateError.message}`);
    }

    return true;
  }

  return data as boolean;
}

/**
 * Update retry count and status for a failed event
 */
export async function updateFailedEventRetry(
  eventId: string,
  errorMessage: string,
  errorStack?: string
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Atomically increment retry_count in the database and read back the new values.
  // Using a SELECT-then-UPDATE pattern would have a race window where two concurrent
  // retries could both read the same retry_count. The RPC function increments atomically.
  const { data: updated, error: rpcError } = await supabase
    .rpc('increment_failed_event_retry', {
      p_event_id: eventId,
      p_error_message: errorMessage,
      p_error_stack: errorStack || null,
      p_last_retry_at: new Date().toISOString(),
    })
    .single();

  if (!rpcError && updated) {
    // RPC succeeded — atomic increment done
    return;
  }

  // Fallback: RPC not available (function may not exist yet before migration).
  // NOTE: This fallback has a TOCTOU race window — deploy migration to eliminate it.
  console.warn('increment_failed_event_retry RPC not available, using fallback:', rpcError?.message);

  const { data: current, error: fetchError } = await supabase
    .from('failed_events')
    .select('retry_count, max_retries')
    .eq('id', eventId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch failed event: ${fetchError.message}`);
  }

  const newRetryCount = current.retry_count + 1;
  const newStatus = newRetryCount >= current.max_retries ? 'failed' : 'retrying';

  const { error: updateError } = await supabase
    .from('failed_events')
    .update({
      retry_count: newRetryCount,
      last_retry_at: new Date().toISOString(),
      error_message: errorMessage,
      error_stack: errorStack || null,
      status: newStatus,
    })
    .eq('id', eventId);

  if (updateError) {
    throw new Error(`Failed to update retry count: ${updateError.message}`);
  }
}

/**
 * Get statistics about failed events
 */
export async function getFailedEventStats(): Promise<{
  pending: number;
  retrying: number;
  failed: number;
  resolved: number;
  total: number;
}> {
  const supabase = getSupabaseAdminClient();

  const statuses = ['pending', 'retrying', 'failed', 'resolved'];
  const results: Record<string, number> = {};

  for (const status of statuses) {
    const { count, error } = await supabase
      .from('failed_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    if (error) {
      throw new Error(`Failed to get stats for ${status}: ${error.message}`);
    }

    results[status] = count ?? 0;
  }

  return {
    pending: results.pending,
    retrying: results.retrying,
    failed: results.failed,
    resolved: results.resolved,
    total: Object.values(results).reduce((a, b) => a + b, 0),
  };
}

/**
 * Clean up old processed events (for maintenance)
 */
export async function cleanupOldProcessedEvents(daysToKeep: number = 30): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('cleanup_old_processed_events', {
    p_days_to_keep: daysToKeep,
  });

  if (error) {
    // Fall back to direct delete
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error: deleteError } = await supabase
      .from('processed_events')
      .delete()
      .lt('processed_at', cutoffDate.toISOString());

    if (deleteError) {
      throw new Error(`Failed to cleanup old events: ${deleteError.message}`);
    }

    return 0; // Can't get count from direct delete
  }

  return data as number;
}
