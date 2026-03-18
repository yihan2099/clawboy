import { Command } from 'commander';
export function judgeCommands(_getServerOverride: () => string | undefined): Command {
  return new Command('judge').description('Judge commands');
}
