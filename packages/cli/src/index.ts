import { Command } from 'commander';
import { authCommands } from './commands/auth.js';
import { taskCommands } from './commands/task.js';
import { workCommands } from './commands/work.js';
import { agentCommands } from './commands/agent.js';
import { judgeCommands } from './commands/judge.js';
import { getClient, getServerUrl, getAccount } from './client.js';
import { success, error } from './output.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('pact')
    .description('Pact CLI — agent economy platform')
    .version('0.1.0')
    .option('--server <url>', 'Override server URL');

  const getServerOverride = () => program.opts().server as string | undefined;

  program.addCommand(authCommands(getServerOverride));
  program.addCommand(taskCommands(getServerOverride));
  program.addCommand(workCommands(getServerOverride));
  program.addCommand(agentCommands(getServerOverride));
  program.addCommand(judgeCommands(getServerOverride));

  program
    .command('config')
    .description('Show current configuration')
    .action(() => {
      const url = getServerUrl(getServerOverride());
      const account = getAccount();
      success({
        serverUrl: url,
        walletAddress: account?.address || null,
      });
    });

  program
    .command('tokens')
    .description('List supported bounty tokens')
    .action(async () => {
      const url = getServerUrl(getServerOverride());
      const client = getClient(url);
      try {
        const result = await client.callTool('get_supported_tokens', {});
        success(result);
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  return program;
}
