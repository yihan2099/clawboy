import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface PactClientConfig {
  /** Pact MCP server URL */
  serverUrl?: string;
  /** Wallet private key for signing */
  privateKey: string;
  /** RPC URL for blockchain interactions */
  rpcUrl?: string;
}

/**
 * Pact MCP Client
 * Wraps the MCP SDK client with Pact-specific configuration
 */
export class PactClient {
  private client: Client;
  private config: PactClientConfig;

  constructor(config: PactClientConfig) {
    this.config = {
      serverUrl: config.serverUrl || 'https://mcp-server-production-f1fb.up.railway.app',
      rpcUrl: config.rpcUrl || 'https://sepolia.base.org',
      ...config,
    };

    this.client = new Client(
      {
        name: 'pact-mcp-client',
        version: '0.1.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * @deprecated PactClient is not functional. Use PactApiClient instead.
   *
   * This method throws unconditionally. The StdioClientTransport placeholder
   * (`node --version`) cannot communicate with the MCP server. All HTTP-based
   * tool calls should use {@link PactApiClient} from
   * `packages/mcp-client/src/api-client.ts`.
   *
   * See packages/mcp-client/README.md for migration guidance.
   *
   * @throws {Error} Always — directs callers to PactApiClient.
   */
  async connect(): Promise<void> {
    throw new Error(
      'PactClient is deprecated and non-functional. ' +
      'Use PactApiClient instead. See packages/mcp-client/README.md for details.'
    );
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    await this.client.close();
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    const result = await this.client.callTool({ name, arguments: args });
    return result as T;
  }

  /**
   * List available tools
   */
  async listTools() {
    return this.client.listTools();
  }

  /**
   * Get the underlying MCP client
   */
  getClient(): Client {
    return this.client;
  }
}

/**
 * Create a Pact client from environment variables
 */
export function createPactClient(): PactClient {
  const privateKey = process.env.PACT_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PACT_WALLET_PRIVATE_KEY environment variable is required');
  }

  return new PactClient({
    privateKey,
    // PACT_SERVER_URL is the canonical env var name (standardized from PACT_MCP_SERVER_URL).
    // Accept both for backwards compatibility with existing configurations.
    serverUrl: process.env.PACT_SERVER_URL ?? process.env.PACT_MCP_SERVER_URL,
    rpcUrl: process.env.PACT_RPC_URL,
  });
}
