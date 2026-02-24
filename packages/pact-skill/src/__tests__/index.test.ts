import { describe, test, expect, mock } from 'bun:test';

// Mock @pactprotocol/mcp-client before importing the module under test
mock.module('@pactprotocol/mcp-client', () => ({
  PactApiClient: class MockApiClient {
    constructor(public opts: unknown) {}
    callTool = () => Promise.resolve({});
    setSessionId = () => {};
    getSessionId = () => null;
    healthCheck = () => Promise.resolve(true);
    listTools = () => Promise.resolve([]);
  },
}));

import { skillMetadata, defaultConfig, createPactClient } from '../index.js';

describe('pact-skill index exports', () => {
  describe('skillMetadata', () => {
    test('should export skill metadata with correct name and version', () => {
      expect(skillMetadata.name).toBe('pact');
      expect(skillMetadata.displayName).toBe('Pact');
      expect(skillMetadata.version).toBe('0.1.0');
      expect(skillMetadata.category).toBe('web3');
      expect(skillMetadata.author).toBe('Pact');
    });

    test('should require PACT_WALLET_PRIVATE_KEY env var', () => {
      expect(skillMetadata.requires.env).toContain('PACT_WALLET_PRIVATE_KEY');
    });

    test('should list expected capabilities', () => {
      expect(skillMetadata.capabilities).toContain('list-tasks');
      expect(skillMetadata.capabilities).toContain('get-task');
      expect(skillMetadata.capabilities).toContain('submit-work');
      expect(skillMetadata.capabilities).toContain('create-task');
      expect(skillMetadata.capabilities).toContain('cancel-task');
      expect(skillMetadata.capabilities).toContain('register');
      expect(skillMetadata.capabilities).toContain('auth-status');
      expect(skillMetadata.capabilities).toContain('capabilities');
      expect(skillMetadata.capabilities).toContain('workflow-guide');
      expect(skillMetadata.capabilities).toContain('supported-tokens');
      expect(skillMetadata.capabilities).toContain('session');
      expect(skillMetadata.capabilities).toContain('update-profile');
      expect(skillMetadata.capabilities).toContain('reputation');
      expect(skillMetadata.capabilities).toContain('feedback-history');
      expect(skillMetadata.capabilities).toContain('get-dispute');
      expect(skillMetadata.capabilities).toContain('list-disputes');
      expect(skillMetadata.capabilities).toContain('start-dispute');
      expect(skillMetadata.capabilities).toContain('vote');
      expect(skillMetadata.capabilities).toContain('resolve-dispute');
      expect(skillMetadata.capabilities).toContain('my-submissions');
    });
  });

  describe('defaultConfig', () => {
    test('should have correct default server URL', () => {
      expect(defaultConfig.serverUrl).toBe('https://mcp-server-production-f1fb.up.railway.app');
    });

    test('should target Base Sepolia chain', () => {
      expect(defaultConfig.chainId).toBe(84532);
      expect(defaultConfig.rpcUrl).toBe('https://sepolia.base.org');
    });
  });

  describe('createPactClient', () => {
    test('should create a client with default options', () => {
      const client = createPactClient();
      expect(client).toBeDefined();
    });

    test('should create a client with custom serverUrl', () => {
      const client = createPactClient({
        serverUrl: 'http://localhost:3001',
      });
      expect(client).toBeDefined();
    });
  });
});
