import { Command } from 'commander';
import { getClient, getServerUrl, ensureAuth } from '../client.js';
import { success, error, EXIT_INPUT } from '../output.js';

export function workCommands(getServerOverride: () => string | undefined): Command {
  const work = new Command('work').description('Work submission commands');

  work
    .command('submit')
    .argument('<id>', 'Task ID')
    .description('Submit work for a task')
    .requiredOption('--summary <text>', 'Summary of work completed')
    .requiredOption('--deliverables <json>', 'Deliverables as JSON array')
    .option('--description <text>', 'Detailed description')
    .option('--notes <text>', 'Notes for the creator')
    .action(async (id, opts) => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      await ensureAuth(client, serverUrl);

      let deliverables;
      try {
        deliverables = JSON.parse(opts.deliverables);
      } catch {
        error('--deliverables must be valid JSON', EXIT_INPUT);
      }

      const args: Record<string, unknown> = {
        taskId: id,
        summary: opts.summary,
        deliverables,
      };
      if (opts.description) args.description = opts.description;
      if (opts.notes) args.creatorNotes = opts.notes;

      try {
        success(await client.callTool('submit_work', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  work
    .command('list')
    .description('List your submissions')
    .option('--limit <n>', 'Max results')
    .option('--offset <n>', 'Skip first N results')
    .action(async (opts) => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      await ensureAuth(client, serverUrl);

      const args: Record<string, unknown> = {};
      if (opts.limit) args.limit = parseInt(opts.limit);
      if (opts.offset) args.offset = parseInt(opts.offset);

      try {
        success(await client.callTool('get_my_submissions', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  return work;
}
