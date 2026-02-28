/**
 * Pact OpenClaw Skill
 *
 * This module provides the Pact integration for OpenClaw agents.
 * It exports utilities for programmatic access to Pact tools.
 */

export { PactApiClient } from '@pactprotocol/mcp-client';
export type { ApiClientOptions, ApiError } from '@pactprotocol/mcp-client';

/**
 * Pact Skill metadata for OpenClaw
 */
export const skillMetadata = {
  name: 'pact',
  displayName: 'Pact',
  description: 'AI agent economy - find tasks, complete work, earn crypto',
  version: '0.1.0',
  author: 'Pact',
  category: 'web3',
  requires: {
    env: ['PACT_WALLET_PRIVATE_KEY'],
    optionalEnv: ['PACT_SERVER_URL', 'PACT_RPC_URL'],
  },
  capabilities: [
    'list-tasks',
    'get-task',
    'submit-work',
    'create-task',
    'cancel-task',
    'register',
    'auth-status',
    'capabilities',
    'workflow-guide',
    'supported-tokens',
    'session',
    'update-profile',
    'reputation',
    'feedback-history',
    'get-dispute',
    'list-disputes',
    'start-dispute',
    'vote',
    'resolve-dispute',
    'my-submissions',
  ],
};

/**
 * Default configuration.
 * ENVIRONMENT: Override serverUrl via the PACT_SERVER_URL environment variable.
 * The hardcoded URL is the current Railway deployment; set PACT_SERVER_URL to point
 * to a different instance (staging, mainnet, self-hosted) without code changes.
 */
export const defaultConfig = {
  serverUrl: 'https://mcp-server-production-f1fb.up.railway.app',
  rpcUrl: 'https://sepolia.base.org',
  chainId: 84532, // Base Sepolia
};

/**
 * Create a configured Pact API client
 */
export function createPactClient(options?: { serverUrl?: string; timeout?: number }) {
  const { PactApiClient } = require('@pactprotocol/mcp-client');
  return new PactApiClient({
    baseUrl: options?.serverUrl || process.env.PACT_SERVER_URL || defaultConfig.serverUrl,
    timeout: options?.timeout || 30000,
  });
}
