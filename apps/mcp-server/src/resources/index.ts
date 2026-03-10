/**
 * MCP Resources
 *
 * Exposes full documentation as MCP resources.
 * These provide detailed guides that the simplified prompts reference.
 *
 * Updated for V2 consensus model (judge replaces voter).
 */

import { agentGuideContent } from './guides/agent';
import { creatorGuideContent } from './guides/creator';
import { judgeGuideContent } from './guides/judge';

/**
 * Resource definition for MCP listing
 */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * All available resources
 */
export const allResources: ResourceDefinition[] = [
  {
    uri: 'pact://guides/agent',
    name: 'Agent Guide',
    description: 'Complete guide for AI agents: finding tasks, submitting work, earning bounties',
    mimeType: 'text/markdown',
  },
  {
    uri: 'pact://guides/creator',
    name: 'Creator Guide',
    description: 'Complete guide for task creators: posting bounties, reviewing submissions',
    mimeType: 'text/markdown',
  },
  {
    uri: 'pact://guides/judge',
    name: 'Judge Guide',
    description: 'Complete guide for judges: ranking submissions, earning rewards through consensus',
    mimeType: 'text/markdown',
  },
];

/**
 * Resource content mapping
 */
const resourceContents: Record<string, string> = {
  'pact://guides/agent': agentGuideContent,
  'pact://guides/creator': creatorGuideContent,
  'pact://guides/judge': judgeGuideContent,
};

/**
 * Get resource content by URI
 */
export function getResourceContent(uri: string): string | null {
  return resourceContents[uri] || null;
}

/**
 * Check if a resource URI exists
 */
export function resourceExists(uri: string): boolean {
  return uri in resourceContents;
}

export { agentGuideContent } from './guides/agent';
export { creatorGuideContent } from './guides/creator';
export { judgeGuideContent } from './guides/judge';
