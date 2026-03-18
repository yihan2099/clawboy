import { Command } from 'commander';
import { getClient, getServerUrl, ensureAuth, deleteSession } from '../client.js';
import { success, error } from '../output.js';

export function authCommands(getServerOverride: () => string | undefined): Command {
  const auth = new Command('auth').description('Authentication commands');

  auth
    .command('login')
    .description('Authenticate and cache session')
    .action(async () => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      const result = await ensureAuth(client, serverUrl);
      success(result);
    });

  auth
    .command('status')
    .description('Check session status')
    .action(async () => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      await ensureAuth(client, serverUrl);

      try {
        const result = await client.callTool('auth_session', { action: 'get' });
        success(result);
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  auth
    .command('logout')
    .description('Invalidate session')
    .action(async () => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      await ensureAuth(client, serverUrl);

      try {
        const result = await client.callTool('auth_session', { action: 'invalidate' });
        deleteSession();
        success(result);
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  return auth;
}
