/**
 * message/send Handler
 *
 * Executes a skill synchronously and returns the completed task.
 */

import type { Context } from 'hono';
import type { A2AJsonRpcResponse, MessageSendParams, A2ATask } from '../types';
import { A2A_ERROR_CODES, createErrorResponse, createSuccessResponse } from '../types';
import { createA2ATask, updateA2ATaskStatus } from '../task-store';
import { executeSkill, skillRequiresAuth } from '../skill-bridge';
import { skillExists } from '../agent-card';
import { getServerContext, getSessionIdFromContext } from '../a2a-auth';

/**
 * Handle message/send JSON-RPC method
 * Executes a skill and waits for completion
 */
export async function handleMessageSend(
  c: Context,
  id: string | number,
  params: MessageSendParams
): Promise<A2AJsonRpcResponse> {
  const context = getServerContext(c);
  const sessionId = getSessionIdFromContext(c);

  // Validate params
  if (!params?.skillId) {
    return createErrorResponse(
      id,
      A2A_ERROR_CODES.INVALID_PARAMS,
      'Missing required parameter: skillId'
    );
  }

  const { skillId, input = {} } = params;

  // Check if skill exists
  if (!skillExists(skillId)) {
    return createErrorResponse(id, A2A_ERROR_CODES.SKILL_NOT_FOUND, `Skill not found: ${skillId}`);
  }

  // Check if authentication is required for this skill
  if (skillRequiresAuth(skillId) && !context.isAuthenticated) {
    return createErrorResponse(
      id,
      A2A_ERROR_CODES.SESSION_REQUIRED,
      'This skill requires authentication. Use wallet-signature auth flow to get a session.'
    );
  }

  // For public skills without a session, we use a temporary session ID
  const effectiveSessionId = sessionId || `anonymous-${crypto.randomUUID()}`;

  // Create the task
  const task = await createA2ATask(skillId, input, effectiveSessionId);

  // Update status to working
  await updateA2ATaskStatus(task.id, 'working');

  // Execute the skill
  const result = await executeSkill(skillId, input, context);

  // Update task with result.
  // ERROR CATEGORIZATION: Errors are separated into transient (retryable) and permanent
  // so callers can decide whether to retry or surface a hard failure to the user.
  // - Permanent: access denied, skill not found, invalid params (caller must fix the request)
  // - Transient: internal errors, network failures (caller may retry)
  let finalTask: A2ATask;
  if (result.success) {
    finalTask = (await updateA2ATaskStatus(task.id, 'completed', {
      type: 'result',
      data: result.data,
    }))!;
  } else {
    const isPermanentError =
      result.error?.code === A2A_ERROR_CODES.ACCESS_DENIED ||
      result.error?.code === A2A_ERROR_CODES.SKILL_NOT_FOUND ||
      result.error?.code === A2A_ERROR_CODES.INVALID_PARAMS;

    finalTask = (await updateA2ATaskStatus(task.id, 'failed', undefined, {
      ...result.error,
      // Attach retryable hint for callers to distinguish transient vs permanent failures
      data: {
        ...(result.error?.data as Record<string, unknown> | undefined),
        retryable: !isPermanentError,
      },
    }))!;
  }

  return createSuccessResponse(id, finalTask);
}
