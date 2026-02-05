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
  console.log('📊 CURRENT POST STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get post details
  const post = await moltbookRequest(`/posts/${POST_ID}`);

  console.log(`📝 Post: ${post.title || 'ClawboyAgent Hackathon Submission'}`);
  console.log(`🔗 URL: https://www.moltbook.com/post/${POST_ID}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 ENGAGEMENT METRICS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`👍 Upvotes: ${post.upvotes || 0}`);
  console.log(`💬 Total Comments: ${post.comments_count || 0}`);
  console.log(`👁️  Views: ${post.views || 'N/A'}`);
  console.log(`📅 Posted: ${new Date(post.created_at).toLocaleString()}\n`);

  // Get comments to count votes
  const comments = await moltbookRequest(`/posts/${POST_ID}/comments?limit=200`);
  const allComments = comments.comments || [];

  const voteComments = allComments.filter((c: any) =>
    c.content && c.content.includes('#USDCHackathon Vote')
  );

  const uniqueVoters = new Set(voteComments.map((v: any) => v.author.name));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 HACKATHON VOTE STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`✅ Valid Votes (unique voters): ${uniqueVoters.size}`);
  console.log(`📝 Total vote comments: ${voteComments.length}`);
  console.log(`🔄 Spam/duplicate votes: ${voteComments.length - uniqueVoters.size}\n`);

  // Get recent comments (last 10)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💬 RECENT ACTIVITY (Last 10 Comments)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const recentComments = allComments.slice(-10).reverse();

  for (const comment of recentComments) {
    const isVote = comment.content.includes('#USDCHackathon Vote');
    const voteLabel = isVote ? '🗳️ ' : '💬 ';
    const timeAgo = getTimeAgo(new Date(comment.created_at));

    console.log(`${voteLabel}@${comment.author.name} (${timeAgo}):`);
    const preview = comment.content.slice(0, 100).replace(/\n/g, ' ');
    console.log(`   "${preview}${comment.content.length > 100 ? '...' : ''}"`);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏰ TIME REMAINING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const deadline = new Date('2026-02-08T20:00:00Z'); // 12:00 PM PST = 20:00 UTC
  const now = new Date();
  const timeLeft = deadline.getTime() - now.getTime();
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  console.log(`⏳ Deadline: February 8, 2026 at 12:00 PM PST`);
  console.log(`⌛ Time remaining: ${daysLeft} days, ${hoursLeft} hours\n`);
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

main().catch(console.error);
