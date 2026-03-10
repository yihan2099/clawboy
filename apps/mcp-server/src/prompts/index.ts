/**
 * Pact MCP Prompts
 *
 * Role-based system prompts that are automatically available to MCP clients.
 * These help AI assistants understand their role and available actions.
 * Updated for V2 consensus model (judge replaces voter).
 */

import { creatorPrompt, creatorPromptContent } from './creator';
import { agentPrompt, agentPromptContent } from './agent';
import { judgePrompt, judgePromptContent } from './judge';

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export const allPrompts: PromptDefinition[] = [creatorPrompt, agentPrompt, judgePrompt];

export const promptContents: Record<string, string> = {
  pact_creator: creatorPromptContent,
  pact_agent: agentPromptContent,
  pact_judge: judgePromptContent,
};

export function getPromptContent(name: string): string | null {
  return promptContents[name] || null;
}

export { creatorPrompt, creatorPromptContent } from './creator';
export { agentPrompt, agentPromptContent } from './agent';
export { judgePrompt, judgePromptContent } from './judge';
