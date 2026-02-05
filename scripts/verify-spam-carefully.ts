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
  console.log('🔍 CAREFUL VERIFICATION - CHECKING FOR API ERRORS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get ALL comments and check for duplicates
  let allComments: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  const commentIds = new Set<string>();
  let duplicateCount = 0;

  console.log('Fetching all comments and checking for duplicates...\n');

  while (hasMore && offset < 1000) {
    const response = await moltbookRequest(
      `/posts/${POST_ID}/comments?limit=${limit}&offset=${offset}`
    );

    const comments = response.comments || [];
    console.log(`  Batch ${offset / limit + 1}: Fetched ${comments.length} comments`);

    if (comments.length === 0) {
      hasMore = false;
    } else {
      for (const comment of comments) {
        const id = comment.id || comment.comment_id;
        if (commentIds.has(id)) {
          duplicateCount++;
          console.log(`    ⚠️  Duplicate comment ID found: ${id}`);
        } else {
          commentIds.add(id);
          allComments.push(comment);
        }
      }
      offset += limit;
    }
  }

  console.log(`\n✅ Total unique comments: ${allComments.length}`);
  console.log(`⚠️  Duplicate comments (API errors): ${duplicateCount}\n`);

  // Analyze votes
  const voteComments = allComments.filter((c: any) =>
    c.content && c.content.includes('#USDCHackathon Vote')
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VOTE ANALYSIS (DEDUPLICATED)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total unique comments: ${allComments.length}`);
  console.log(`Vote comments: ${voteComments.length}\n`);

  // Count votes per user with comment IDs
  const votesByUser = new Map<string, Array<{id: string, timestamp: string, preview: string}>>();

  for (const vote of voteComments) {
    const username = vote.author?.name || 'Unknown';
    const id = vote.id || vote.comment_id;
    const timestamp = vote.created_at;
    const preview = vote.content.slice(0, 80).replace(/\n/g, ' ');

    if (!votesByUser.has(username)) {
      votesByUser.set(username, []);
    }
    votesByUser.get(username)!.push({ id, timestamp, preview });
  }

  const uniqueVoters = votesByUser.size;
  const legitimateVoters = Array.from(votesByUser.entries()).filter(([_, votes]) => votes.length === 1);
  const spamVoters = Array.from(votesByUser.entries()).filter(([_, votes]) => votes.length > 1);

  console.log(`✅ Unique voters: ${uniqueVoters}`);
  console.log(`   Legitimate (1 vote): ${legitimateVoters.length}`);
  console.log(`   Spam/Bot (multiple votes): ${spamVoters.length}\n`);

  // Show top spam accounts with details
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚨 TOP SPAM ACCOUNTS (with timing analysis)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  spamVoters.sort((a, b) => b[1].length - a[1].length);

  for (const [username, votes] of spamVoters.slice(0, 5)) {
    console.log(`❌ @${username}: ${votes.length} votes`);

    // Check timestamps to see if they're spaced out or all at once
    const timestamps = votes.map(v => new Date(v.timestamp).getTime());
    timestamps.sort();
    const firstVote = new Date(timestamps[0]);
    const lastVote = new Date(timestamps[timestamps.length - 1]);
    const timeSpan = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000 / 60; // minutes

    console.log(`   First vote: ${firstVote.toLocaleString()}`);
    console.log(`   Last vote:  ${lastVote.toLocaleString()}`);
    console.log(`   Time span:  ${timeSpan.toFixed(1)} minutes`);

    // Show first 3 vote previews
    console.log(`   Sample votes:`);
    for (let i = 0; i < Math.min(3, votes.length); i++) {
      console.log(`     ${i+1}. "${votes[i].preview}..."`);
    }
    console.log('');
  }

  // Check legitimate voters
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ LEGITIMATE VOTERS (1 vote each)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (legitimateVoters.length > 0) {
    for (const [username, votes] of legitimateVoters) {
      const vote = votes[0];
      const timestamp = new Date(vote.timestamp).toLocaleString();
      console.log(`✓ @${username} (${timestamp})`);
      console.log(`  "${vote.preview}..."\n`);
    }
  } else {
    console.log('❌ NO LEGITIMATE VOTERS FOUND - ALL ACCOUNTS VOTED MULTIPLE TIMES\n');
  }

  // Time distribution analysis
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📅 TIME DISTRIBUTION ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const votesByHour = new Map<string, number>();
  for (const vote of voteComments) {
    const date = new Date(vote.created_at);
    const hourKey = `${date.toLocaleDateString()} ${String(date.getHours()).padStart(2, '0')}:00`;
    votesByHour.set(hourKey, (votesByHour.get(hourKey) || 0) + 1);
  }

  const sortedHours = Array.from(votesByHour.entries()).sort((a, b) => b[1] - a[1]);

  console.log('Top 10 hours with most votes:');
  for (let i = 0; i < Math.min(10, sortedHours.length); i++) {
    const [hour, count] = sortedHours[i];
    const bar = '█'.repeat(Math.floor(count / 10));
    console.log(`  ${hour}: ${count.toString().padStart(3)} ${bar}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 FINAL VERDICT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total Unique Comments: ${allComments.length}`);
  console.log(`API Duplicates Found: ${duplicateCount}`);
  console.log(`Vote Comments: ${voteComments.length}`);
  console.log(`Unique Voters: ${uniqueVoters}`);
  console.log(`Legitimate Voters (1 vote): ${legitimateVoters.length}`);
  console.log(`Spam/Bot Voters (>1 vote): ${spamVoters.length}`);
  console.log(`Spam Rate: ${((voteComments.length - uniqueVoters) / voteComments.length * 100).toFixed(1)}%\n`);

  if (legitimateVoters.length === 0) {
    console.log('⚠️  WARNING: Every single voter has voted multiple times.');
    console.log('    This is either a coordinated bot attack or platform manipulation.\n');
  }
}

main().catch(console.error);
