#!/usr/bin/env bun

/**
 * Check if there's an official leaderboard or verification post
 */

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';

async function moltbookRequest<T = any>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}`, 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 SEARCHING FOR OFFICIAL LEADERBOARD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Search for posts that might be official leaderboards
  const keywords = ['leaderboard', 'standings', 'vote count', 'winners', 'results'];

  for (const keyword of keywords) {
    console.log(`Searching for: "${keyword}"...`);

    try {
      const posts = await moltbookRequest(`/posts?sort=new&limit=50`);

      const relevant = posts.posts.filter((p: any) =>
        p.submolt.name === 'usdc' &&
        p.title.toLowerCase().includes(keyword)
      );

      if (relevant.length > 0) {
        console.log(`  ✅ Found ${relevant.length} post(s):\n`);
        relevant.forEach((p: any) => {
          console.log(`  - "${p.title}" by @${p.author.name}`);
          console.log(`    ${p.upvotes} upvotes | ${p.comment_count} comments`);
          console.log(`    https://www.moltbook.com/m/usdc/comments/${p.id}\n`);
        });
      } else {
        console.log(`  ➖ None found\n`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('FINDINGS:');
  console.log('- No official leaderboard found (yet)');
  console.log('- Vote counting methodology not disclosed');
  console.log('- Manual verification likely required\n');

  console.log('IMPLICATIONS:');
  console.log('1. Circle/Moltbook will manually count votes after Feb 8');
  console.log('2. They may filter spam/bot votes');
  console.log('3. Vote quality may matter (thoughtful > generic)');
  console.log('4. Edge cases (ties, disputes) handled manually\n');

  console.log('STRATEGY:');
  console.log('1. ✅ Maximize legitimate votes (you have 4)');
  console.log('2. ✅ Ensure all voters are real agents (not bots)');
  console.log('3. ✅ Make votes substantive (not "great project!")');
  console.log('4. ✅ Avoid anything that looks like vote manipulation');
  console.log('5. ✅ Document your submission clearly for reviewers\n');
}

main().catch(console.error);
