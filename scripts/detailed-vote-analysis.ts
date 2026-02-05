const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';
const POST_ID = '224fbb54-14ea-4d21-8efe-067521c54300';

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
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return await response.json();
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DETAILED VOTE ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get post details first
  const post = await moltbookRequest(`/posts/${POST_ID}`);
  console.log('Post Data Keys:', Object.keys(post));
  console.log('Upvotes field:', post.upvotes);
  console.log('Comments_count field:', post.comments_count);
  console.log('Vote_count field:', post.vote_count);
  console.log('\n');

  // Get ALL comments with pagination
  let allComments: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log('Fetching all comments...\n');

  while (hasMore) {
    const response = await moltbookRequest(
      `/posts/${POST_ID}/comments?limit=${limit}&offset=${offset}`
    );

    const comments = response.comments || [];
    console.log(`  Batch ${offset / limit + 1}: Fetched ${comments.length} comments`);

    if (comments.length === 0) {
      hasMore = false;
    } else {
      allComments.push(...comments);
      offset += limit;

      // Safety check to avoid infinite loops
      if (offset > 1000) {
        console.log('  (Stopping at 1000 to avoid infinite loop)');
        hasMore = false;
      }
    }
  }

  console.log(`\n✅ Total comments fetched: ${allComments.length}\n`);

  // Analyze votes
  const voteComments = allComments.filter((c: any) =>
    c.content && c.content.includes('#USDCHackathon Vote')
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VOTE BREAKDOWN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total comments: ${allComments.length}`);
  console.log(`Vote comments: ${voteComments.length}\n`);

  // Count votes per user
  const votesByUser = new Map<string, number>();

  for (const vote of voteComments) {
    const username = vote.author?.name || 'Unknown';
    votesByUser.set(username, (votesByUser.get(username) || 0) + 1);
  }

  const uniqueVoters = votesByUser.size;
  const legitimateVoters = Array.from(votesByUser.entries()).filter(([_, count]) => count === 1);
  const spamVoters = Array.from(votesByUser.entries()).filter(([_, count]) => count > 1);

  console.log(`✅ Unique voters: ${uniqueVoters}`);
  console.log(`   Legitimate (1 vote): ${legitimateVoters.length}`);
  console.log(`   Spam (multiple votes): ${spamVoters.length}\n`);

  if (spamVoters.length > 0) {
    console.log('🚨 Spam Voters:');
    spamVoters.sort((a, b) => b[1] - a[1]);
    for (const [username, count] of spamVoters) {
      console.log(`   ❌ @${username}: ${count} votes`);
    }
    console.log('');
  }

  // Show all unique voters
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 ALL UNIQUE VOTERS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const votersWithKarma: Array<{ name: string; karma: number; votes: number }> = [];

  for (const [username, voteCount] of votesByUser.entries()) {
    // Find the voter's karma from their first vote comment
    const firstVote = voteComments.find(v => v.author?.name === username);
    const karma = firstVote?.author?.karma || 0;

    votersWithKarma.push({ name: username, karma, votes: voteCount });
  }

  votersWithKarma.sort((a, b) => b.karma - a.karma);

  for (let i = 0; i < votersWithKarma.length; i++) {
    const voter = votersWithKarma[i];
    const spamLabel = voter.votes > 1 ? ` 🚨 (${voter.votes} votes)` : '';
    console.log(`${String(i + 1).padStart(4)}. @${voter.name.padEnd(25)} (${String(voter.karma).padStart(3)} karma)${spamLabel}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total Comments: ${allComments.length}`);
  console.log(`Vote Comments: ${voteComments.length}`);
  console.log(`Valid Votes (unique): ${uniqueVoters}`);
  console.log(`Spam Votes (filtered): ${voteComments.length - uniqueVoters}\n`);
}

main().catch(console.error);
