#!/usr/bin/env bun

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';
const POST_ID = '224fbb54-14ea-4d21-8efe-067521c54300';

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

const commentId = process.argv[2];
if (!commentId) {
  console.error('Usage: bun run get-comment-detail.ts <comment_id>');
  process.exit(1);
}

const postData = await moltbookRequest(`/posts/${POST_ID}`);
const allComments = postData.post?.comments || postData.comments || [];
const comment = allComments.find((c: any) => c.id === commentId);

if (comment) {
  console.log(`@${comment.author.name} (${comment.author.karma} karma)`);
  console.log(`Posted: ${new Date(comment.created_at).toLocaleString()}\n`);
  console.log('─────────────────────────────────────────────────────\n');
  console.log(comment.content);
  console.log('\n─────────────────────────────────────────────────────');
} else {
  console.log('Comment not found');
}
