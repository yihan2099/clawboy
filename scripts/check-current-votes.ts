#!/usr/bin/env bun

/**
 * Quick check of current valid votes on ClawboyAgent post
 */

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';
const MY_POST_ID = '224fbb54-14ea-4d21-8efe-067521c54300';

async function moltbookRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${MOLTBOOK_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 CURRENT VOTE COUNT CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const data = await moltbookRequest(`/posts/${MY_POST_ID}`);
  const comments = data.comments || [];

  console.log(`Post: https://www.moltbook.com/post/${MY_POST_ID}`);
  console.log(`Total comments: ${comments.length}\n`);

  // Find all vote comments
  const voteComments = comments.filter((c: any) =>
    c.content && c.content.includes('#USDCHackathon Vote')
  );

  console.log(`Total vote comments: ${voteComments.length}`);

  // Group by author to find unique voters and duplicates
  const votesByAuthor = new Map<string, any[]>();
  for (const comment of voteComments) {
    const author = comment.author.name;
    if (!votesByAuthor.has(author)) {
      votesByAuthor.set(author, []);
    }
    votesByAuthor.get(author)!.push(comment);
  }

  const uniqueVoters = votesByAuthor.size;
  console.log(`UNIQUE VOTERS: ${uniqueVoters}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 BREAKDOWN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Separate legitimate voters (1 vote) from spam (multiple votes)
  const legitimateVoters: any[] = [];
  const spamVoters: any[] = [];

  for (const [author, votes] of votesByAuthor.entries()) {
    const firstVote = votes[0];
    if (votes.length === 1) {
      legitimateVoters.push({
        author,
        karma: firstVote.author.karma,
        commentId: firstVote.id,
      });
    } else {
      spamVoters.push({
        author,
        voteCount: votes.length,
        karma: firstVote.author.karma,
      });
    }
  }

  console.log(`✅ Legitimate voters (1 vote each): ${legitimateVoters.length}`);
  console.log(`🚨 Spam voters (multiple votes): ${spamVoters.length}\n`);

  if (spamVoters.length > 0) {
    console.log('Spam voters:');
    for (const spammer of spamVoters) {
      console.log(`  ❌ @${spammer.author}: ${spammer.voteCount} votes (only 1 will count)`);
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 TOP VOTERS (by karma)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const topVoters = legitimateVoters
    .sort((a, b) => b.karma - a.karma)
    .slice(0, 20);

  for (let i = 0; i < topVoters.length; i++) {
    const voter = topVoters[i];
    console.log(`  ${(i + 1).toString().padStart(2)}. @${voter.author.padEnd(25)} (${voter.karma.toString().padStart(3)} karma)`);
  }

  if (legitimateVoters.length > 20) {
    console.log(`  ... and ${legitimateVoters.length - 20} more`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 FINAL COUNT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Valid Votes (what Circle will count): ${uniqueVoters}`);
  console.log(`  - Legitimate (1 vote): ${legitimateVoters.length}`);
  console.log(`  - Spam (filtered to 1): ${spamVoters.length}\n`);

  console.log(`Total vote comments: ${voteComments.length}`);
  console.log(`Spam votes that will be filtered: ${voteComments.length - uniqueVoters}\n`);
}

main().catch(console.error);
