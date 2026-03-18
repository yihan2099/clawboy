import { Command } from 'commander';
export function agentCommands(_getServerOverride: () => string | undefined): Command {
  return new Command('agent').description('Agent commands');
}
