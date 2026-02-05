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
  console.log('🔍 ROSE PROTOCOL CAREFUL VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get ALL comments and check for duplicates
  let allComments: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  const commentIds = new Set<string>();
  let duplicateCount = 0;

  console.log('Fetching all comments and deduplicating...\n');

  while (hasMore && offset < 1000) {
    const response = await moltbookRequest(
      `/posts/${ROSE_POST_ID}/comments?limit=${limit}&offset=${offset}`
    );

    const comments = response.comments || [];

    if (comments.length === 0) {
      hasMore = false;
    } else {
      for (const comment of comments) {
        const id = comment.id || comment.comment_id;
        if (commentIds.has(id)) {
          duplicateCount++;
        } else {
          commentIds.add(id);
          allComments.push(comment);
        }
      }
      offset += limit;
    }
  }

  console.log(`✅ Total unique comments: ${allComments.length}`);
  console.log(`⚠️  API duplicate comments: ${duplicateCount}\n`);

  // Analyze votes
  const voteComments = allComments.filter((c: any) =>
    c.content && c.content.includes('#USDCHackathon Vote')
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ROSE PROTOCOL VOTE ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total unique comments: ${allComments.length}`);
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
  console.log(`   Spam/Bot (multiple votes): ${spamVoters.length}\n`);

  // Show spam accounts
  if (spamVoters.length > 0) {
    console.log('🚨 Spam Accounts:');
    spamVoters.sort((a, b) => b[1] - a[1]);
    for (const [username, count] of spamVoters) {
      console.log(`   ❌ @${username}: ${count} votes`);
    }
    console.log('');
  }

  // Show all legitimate voters
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ LEGITIMATE VOTERS (1 vote each)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (legitimateVoters.length > 0) {
    for (const [username, _] of legitimateVoters) {
      const vote = voteComments.find(v => v.author?.name === username);
      const timestamp = new Date(vote.created_at).toLocaleString();
      console.log(`✓ @${username} (${timestamp})`);
    }
  } else {
    console.log('❌ NO LEGITIMATE VOTERS\n');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 FINAL VERDICT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total Unique Comments: ${allComments.length}`);
  console.log(`API Duplicates: ${duplicateCount}`);
  console.log(`Vote Comments: ${voteComments.length}`);
  console.log(`Unique Voters: ${uniqueVoters}`);
  console.log(`Legitimate Voters (1 vote): ${legitimateVoters.length}`);
  console.log(`Spam Voters (>1 vote): ${spamVoters.length}`);
  console.log(`Spam Rate: ${voteComments.length > 0 ? ((voteComments.length - uniqueVoters) / voteComments.length * 100).toFixed(1) : 0}%\n`);
}

main().catch(console.error);
