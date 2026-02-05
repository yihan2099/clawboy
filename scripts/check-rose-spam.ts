const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';
const ROSE_POST_ID = '7dd09bff-412f-475f-8a1c-997a069dac1b';

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
  console.log('🔍 ROSE PROTOCOL SPAM CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get ALL comments with pagination
  let allComments: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log('Fetching Rose Protocol comments...\n');

  while (hasMore) {
    const response = await moltbookRequest(
      `/posts/${ROSE_POST_ID}/comments?limit=${limit}&offset=${offset}`
    );

    const comments = response.comments || [];
    console.log(`  Batch ${offset / limit + 1}: Fetched ${comments.length} comments`);

    if (comments.length === 0) {
      hasMore = false;
    } else {
      allComments.push(...comments);
      offset += limit;

      if (offset > 1000) {
        console.log('  (Stopping at 1000)');
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
  console.log('📊 ROSE PROTOCOL VOTE BREAKDOWN');
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
    for (const [username, count] of spamVoters.slice(0, 20)) {
      console.log(`   ❌ @${username}: ${count} votes`);
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total Comments: ${allComments.length}`);
  console.log(`Vote Comments: ${voteComments.length}`);
  console.log(`Valid Votes (unique): ${uniqueVoters}`);
  console.log(`Spam Votes (filtered): ${voteComments.length - uniqueVoters}`);
  console.log(`Spam Rate: ${((voteComments.length - uniqueVoters) / voteComments.length * 100).toFixed(1)}%\n`);
}

main().catch(console.error);
