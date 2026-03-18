import { PactApiClient } from '@pactprotocol/mcp-client';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { EXIT_AUTH, error } from './output.js';

const SESSION_PATH = join(homedir(), '.config', 'pact', 'session.json');

interface SessionCache {
  sessionId: string;
  walletAddress: string;
  serverUrl: string;
  expiresAt: string;
}

let clientInstance: PactApiClient | null = null;

export function getServerUrl(override?: string): string {
  return override || process.env.PACT_SERVER_URL || 'https://pact.yihan.app';
}

export function getClient(serverUrl: string): PactApiClient {
  if (!clientInstance) {
    clientInstance = new PactApiClient({ baseUrl: serverUrl });
  }
  return clientInstance;
}

export function getAccount() {
  const key = process.env.PACT_WALLET_PRIVATE_KEY;
  if (!key) return null;
  try {
    return privateKeyToAccount(key as `0x${string}`);
  } catch {
    return null;
  }
}

function readSession(serverUrl: string): SessionCache | null {
  try {
    const data = JSON.parse(readFileSync(SESSION_PATH, 'utf-8')) as SessionCache;
    const account = getAccount();
    if (!account) return null;
    if (data.serverUrl !== serverUrl) return null;
    if (data.walletAddress.toLowerCase() !== account.address.toLowerCase()) return null;
    if (new Date(data.expiresAt) <= new Date()) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSession(session: SessionCache): void {
  mkdirSync(join(homedir(), '.config', 'pact'), { recursive: true });
  writeFileSync(SESSION_PATH, JSON.stringify(session));
}

export function deleteSession(): void {
  try {
    unlinkSync(SESSION_PATH);
  } catch {
    // ignore if file doesn't exist
  }
}

export interface AuthResult {
  authenticated: boolean;
  walletAddress: string;
  serverUrl: string;
  cached: boolean;
}

export async function ensureAuth(client: PactApiClient, serverUrl: string): Promise<AuthResult> {
  const cached = readSession(serverUrl);
  if (cached) {
    client.setSessionId(cached.sessionId);
    return { authenticated: true, walletAddress: cached.walletAddress, serverUrl, cached: true };
  }

  const account = getAccount();
  if (!account) {
    error('PACT_WALLET_PRIVATE_KEY not set', EXIT_AUTH);
  }

  try {
    const challenge = await client.callTool<{ challenge: string }>('auth_get_challenge', {
      walletAddress: account.address,
    });

    const signature = await account.signMessage({ message: challenge.challenge });

    const verify = await client.callTool<{ sessionId: string; expiresAt?: string }>('auth_verify', {
      walletAddress: account.address,
      signature,
      challenge: challenge.challenge,
    });

    client.setSessionId(verify.sessionId);

    writeSession({
      sessionId: verify.sessionId,
      walletAddress: account.address,
      serverUrl,
      expiresAt: verify.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return { authenticated: true, walletAddress: account.address, serverUrl, cached: false };
  } catch (e) {
    error(`Authentication failed: ${e instanceof Error ? e.message : e}`, EXIT_AUTH);
  }
}
