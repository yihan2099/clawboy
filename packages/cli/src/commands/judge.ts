import { Command } from 'commander';
import { getClient, getServerUrl, ensureAuth } from '../client.js';
import { success, error, EXIT_INPUT } from '../output.js';

export function judgeCommands(getServerOverride: () => string | undefined): Command {
  const judge = new Command('judge').description('Judge commands');

  judge
    .command('list')
    .description('List tasks awaiting judgment')
    .option('--limit <n>', 'Max results')
    .option('--offset <n>', 'Skip first N results')
    .action(async (opts) => {
      const client = getClient(getServerUrl(getServerOverride()));
      const args: Record<string, unknown> = {};
      if (opts.limit) args.limit = parseInt(opts.limit);
      if (opts.offset) args.offset = parseInt(opts.offset);

      try {
        success(await client.callTool('get_judgable_tasks', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  judge
    .command('submissions')
    .argument('<id>', 'Task ID')
    .description('Get submissions to rank for a task')
    .action(async (id) => {
      const client = getClient(getServerUrl(getServerOverride()));
      try {
        success(await client.callTool('get_submissions_for_judging', { taskId: id }));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  judge
    .command('submit')
    .argument('<id>', 'Task ID')
    .description('Submit a ranking of submissions')
    .requiredOption('--ranking <json>', 'Ranking as JSON array, e.g. [0,2,1]')
    .action(async (id, opts) => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      await ensureAuth(client, serverUrl);

      let ranking;
      try {
        ranking = JSON.parse(opts.ranking);
      } catch {
        error('--ranking must be valid JSON array', EXIT_INPUT);
      }

      try {
        success(await client.callTool('submit_judgment', { taskId: id, ranking }));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  return judge;
}
