/**
 * tasks/list Handler
 *
 * List tasks for the current session.
 */

import type { Context } from 'hono';
import type { A2AJsonRpcResponse, TasksListParams } from '../types';
import { A2A_ERROR_CODES, createErrorResponse, createSuccessResponse } from '../types';
import { listA2ATasksBySession } from '../task-store';
import { getServerContext, getSessionIdFromContext } from '../a2a-auth';

/**
 * Handle tasks/list JSON-RPC method
 */
export async function handleTasksList(
  c: Context,
  id: string | number,
  params: TasksListParams = {}
): Promise<A2AJsonRpcResponse> {
  const context = getServerContext(c);
  const sessionId = getSessionIdFromContext(c);

  // Require authentication to list tasks.
  // ANONYMOUS SESSION LIMITATION: Unlike message/send (which assigns an ephemeral
  // anonymous-<uuid> session for public skills), tasks/list requires a real authenticated
  // session. This means unauthenticated callers cannot list tasks they may have initiated
  // via public skills. This is intentional — A2A tasks are keyed by sessionId, and
  // anonymous sessions are not persisted beyond the originating request, so there are
  // no tasks to list without a stable session. Callers must authenticate via the
  // wallet-signature flow to use tasks/list.
  if (!context.isAuthenticated || !sessionId) {
    return createErrorResponse(
      id,
      A2A_ERROR_CODES.SESSION_REQUIRED,
      'Authentication required to list tasks'
    );
  }

  const { limit = 20, offset = 0, status } = params;

  // Validate pagination params
  const validLimit = Math.min(Math.max(1, limit), 100);
  const validOffset = Math.max(0, offset);

  // Get tasks for this session
  const result = await listA2ATasksBySession(sessionId, {
    limit: validLimit,
    offset: validOffset,
    status,
  });

  return createSuccessResponse(id, {
    tasks: result.tasks,
    total: result.total,
    limit: validLimit,
    offset: validOffset,
  });
}
