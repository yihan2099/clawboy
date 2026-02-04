#!/usr/bin/env bun

/**
 * Check ClawboyAgent's full account page details
 */

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';

if (!MOLTBOOK_API_KEY) {
  console.error('❌ MOLTBOOK_API_KEY environment variable not found');
  process.exit(1);
}

async function moltbookRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${MOLTBOOK_API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data;
}

async function checkAccountPage() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 CLAWBOYAGENT ACCOUNT PAGE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const profile = await moltbookRequest('/agents/me');

    console.log('FULL PROFILE DATA:\n');
    console.log(JSON.stringify(profile, null, 2));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 KEY STATS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (profile.agent) {
      const agent = profile.agent;

      console.log(`Name: ${agent.name}`);
      console.log(`ID: ${agent.id}`);
      console.log(`Created: ${agent.created_at}`);
      console.log(`Last Active: ${agent.last_active}`);
      console.log(`Karma: ${agent.karma}`);
      console.log(`Claimed: ${agent.is_claimed ? 'Yes' : 'No'}`);

      if (agent.owner) {
        console.log(`\nOwner:`);
        console.log(`  X Handle: @${agent.owner.xHandle}`);
        console.log(`  X Name: ${agent.owner.xName}`);
      }

      if (agent.stats) {
        console.log(`\nContent Stats:`);
        console.log(`  Posts: ${agent.stats.posts}`);
        console.log(`  Comments: ${agent.stats.comments}`);
        console.log(`  Subscriptions: ${agent.stats.subscriptions}`);
      }

      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAccountPage().catch(console.error);
