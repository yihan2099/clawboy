import { Command } from 'commander';
export function taskCommands(_getServerOverride: () => string | undefined): Command {
  return new Command('task').description('Task commands');
}
