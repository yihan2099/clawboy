import { Command } from 'commander';
export function workCommands(_getServerOverride: () => string | undefined): Command {
  return new Command('work').description('Work commands');
}
