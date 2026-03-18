import { Command } from 'commander';
import { getClient, getServerUrl, ensureAuth } from '../client.js';
import { success, error, EXIT_INPUT } from '../output.js';

export function taskCommands(getServerOverride: () => string | undefined): Command {
  const task = new Command('task').description('Task commands');

  task
    .command('list')
    .description('List available tasks')
    .option('--phase <phase>', 'Filter by phase (open, work_phase, judge_phase, resolved, cancelled, failed)')
    .option('--bounty-token <symbol>', 'Filter by token (ETH, USDC, USDT, DAI)')
    .option('--min-bounty <amount>', 'Minimum bounty amount')
    .option('--max-bounty <amount>', 'Maximum bounty amount')
    .option('--tags <csv>', 'Comma-separated tag filter')
    .option('--sort-by <field>', 'Sort field (bounty, createdAt, deadline)')
    .option('--order <order>', 'Sort order (asc, desc)')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Skip first N results')
    .action(async (opts) => {
      const client = getClient(getServerUrl(getServerOverride()));
      const args: Record<string, unknown> = {};
      if (opts.phase) args.phase = opts.phase;
      if (opts.bountyToken) args.bountyToken = opts.bountyToken;
      if (opts.minBounty) args.minBounty = opts.minBounty;
      if (opts.maxBounty) args.maxBounty = opts.maxBounty;
      if (opts.tags) args.tags = opts.tags.split(',').map((s: string) => s.trim());
      if (opts.sortBy) args.sortBy = opts.sortBy;
      if (opts.order) args.sortOrder = opts.order;
      if (opts.limit) args.limit = parseInt(opts.limit);
      if (opts.offset) args.offset = parseInt(opts.offset);
      try {
        success(await client.callTool('list_tasks', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  task
    .command('get')
    .argument('<id>', 'Task ID')
    .description('Get task details')
    .action(async (id) => {
      const client = getClient(getServerUrl(getServerOverride()));
      try {
        success(await client.callTool('get_task', { taskId: id }));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  task
    .command('create')
    .description('Create a new task with bounty')
    .requiredOption('--title <title>', 'Task title')
    .requiredOption('--description <desc>', 'Task description')
    .requiredOption('--deliverables <json>', 'Deliverables as JSON array')
    .requiredOption('--bounty <amount>', 'Bounty amount')
    .option('--bounty-token <symbol>', 'Token symbol (default ETH)')
    .option('--deadline <date>', 'ISO 8601 deadline')
    .option('--work-deadline <date>', 'Work phase deadline')
    .option('--judge-deadline <date>', 'Judge phase deadline')
    .option('--workers <n>', 'Required workers')
    .option('--judges <n>', 'Required judges')
    .option('--tags <csv>', 'Comma-separated tags')
    .action(async (opts) => {
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
        title: opts.title,
        description: opts.description,
        deliverables,
        bountyAmount: opts.bounty,
      };
      if (opts.bountyToken) args.bountyToken = opts.bountyToken;
      if (opts.deadline) args.deadline = opts.deadline;
      if (opts.workDeadline) args.workDeadline = opts.workDeadline;
      if (opts.judgeDeadline) args.judgeDeadline = opts.judgeDeadline;
      if (opts.workers) args.requiredWorkers = parseInt(opts.workers);
      if (opts.judges) args.requiredJudges = parseInt(opts.judges);
      if (opts.tags) args.tags = opts.tags.split(',').map((s: string) => s.trim());

      try {
        success(await client.callTool('create_task', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  task
    .command('cancel')
    .argument('<id>', 'Task ID')
    .description('Cancel a task you created')
    .option('--reason <reason>', 'Reason for cancellation')
    .action(async (id, opts) => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      await ensureAuth(client, serverUrl);

      const args: Record<string, unknown> = { taskId: id };
      if (opts.reason) args.reason = opts.reason;

      try {
        success(await client.callTool('cancel_task', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  return task;
}
