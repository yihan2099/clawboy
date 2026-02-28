import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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
   * Connect to the Pact MCP server.
   *
   * INCOMPLETE: This StdioClientTransport with `args: ['--version']` is a placeholder
   * that runs `node --version` and immediately exits — it cannot actually communicate
   * with the MCP server. This class is not production-ready.
   *
   * Production use should either:
   *   1. Use the HTTP transport via PactApiClient (packages/mcp-client/src/api-client.ts), or
   *   2. Replace the StdioClientTransport args with the real MCP server command, e.g.:
   *      new StdioClientTransport({ command: 'bun', args: ['run', '/path/to/mcp-server'] })
   */
  async connect(): Promise<void> {
    console.warn(
      '[PactMcpClient] connect() is using a placeholder transport (node --version). ' +
      'This is not a working MCP connection. Use PactApiClient for HTTP-based tool calls.'
    );
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['--version'], // Placeholder — replace with real server command
    });

    await this.client.connect(transport);
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
    serverUrl: process.env.PACT_MCP_SERVER_URL,
    rpcUrl: process.env.PACT_RPC_URL,
  });
}
