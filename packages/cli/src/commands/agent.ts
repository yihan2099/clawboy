import { Command } from 'commander';
import { getClient, getServerUrl, ensureAuth } from '../client.js';
import { success, error } from '../output.js';

export function agentCommands(getServerOverride: () => string | undefined): Command {
  const agent = new Command('agent').description('Agent commands');

  agent
    .command('register')
    .description('Register as an agent on-chain')
    .requiredOption('--name <name>', 'Display name')
    .requiredOption('--skills <csv>', 'Comma-separated skills')
    .option('--description <text>', 'Bio')
    .option('--task-types <csv>', 'Preferred task types')
    .option('--github <url>', 'GitHub URL')
    .option('--twitter <handle>', 'Twitter handle')
    .option('--website <url>', 'Website URL')
    .action(async (opts) => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      await ensureAuth(client, serverUrl);

      const args: Record<string, unknown> = {
        name: opts.name,
        skills: opts.skills.split(',').map((s: string) => s.trim()),
      };
      if (opts.description) args.description = opts.description;
      if (opts.taskTypes) args.preferredTaskTypes = opts.taskTypes.split(',').map((s: string) => s.trim());

      const links: Record<string, string> = {};
      if (opts.github) links.github = opts.github;
      if (opts.twitter) links.twitter = opts.twitter;
      if (opts.website) links.website = opts.website;
      if (Object.keys(links).length > 0) args.links = links;

      try {
        success(await client.callTool('register_agent', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  agent
    .command('update')
    .description('Update agent profile')
    .option('--name <name>', 'New display name')
    .option('--description <text>', 'New bio')
    .option('--skills <csv>', 'New skills')
    .option('--task-types <csv>', 'Preferred task types')
    .option('--github <url>', 'GitHub URL')
    .option('--twitter <handle>', 'Twitter handle')
    .option('--website <url>', 'Website URL')
    .action(async (opts) => {
      const serverUrl = getServerUrl(getServerOverride());
      const client = getClient(serverUrl);
      await ensureAuth(client, serverUrl);

      const args: Record<string, unknown> = {};
      if (opts.name) args.name = opts.name;
      if (opts.description) args.description = opts.description;
      if (opts.skills) args.skills = opts.skills.split(',').map((s: string) => s.trim());
      if (opts.taskTypes) args.preferredTaskTypes = opts.taskTypes.split(',').map((s: string) => s.trim());

      const links: Record<string, string> = {};
      if (opts.github) links.github = opts.github;
      if (opts.twitter) links.twitter = opts.twitter;
      if (opts.website) links.website = opts.website;
      if (Object.keys(links).length > 0) args.links = links;

      try {
        success(await client.callTool('update_profile', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  agent
    .command('reputation')
    .argument('[address]', 'Wallet address to query')
    .description('Query on-chain reputation')
    .option('--tag1 <tag>', 'Primary tag filter')
    .option('--tag2 <tag>', 'Secondary tag filter')
    .action(async (address, opts) => {
      const client = getClient(getServerUrl(getServerOverride()));
      const args: Record<string, unknown> = {};
      if (address) args.walletAddress = address;
      if (opts.tag1) args.tag1 = opts.tag1;
      if (opts.tag2) args.tag2 = opts.tag2;

      try {
        success(await client.callTool('get_reputation', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  agent
    .command('feedback')
    .argument('[address]', 'Wallet address to query')
    .description('Query feedback history')
    .option('--limit <n>', 'Max entries')
    .action(async (address, opts) => {
      const client = getClient(getServerUrl(getServerOverride()));
      const args: Record<string, unknown> = {};
      if (address) args.walletAddress = address;
      if (opts.limit) args.limit = parseInt(opts.limit);

      try {
        success(await client.callTool('get_feedback_history', args));
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
      }
    });

  return agent;
}
