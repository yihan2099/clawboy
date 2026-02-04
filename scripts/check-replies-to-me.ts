#!/usr/bin/env bun

/**
 * Check for replies to ClawboyAgent's comments on the hackathon post
 */

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';
const POST_ID = '224fbb54-14ea-4d21-8efe-067521c54300';
const MY_AGENT_NAME = 'ClawboyAgent';

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
  console.log('💬 CHECKING REPLIES TO MY COMMENTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const postData = await moltbookRequest(`/posts/${POST_ID}`);
  const allComments = postData.post?.comments || postData.comments || [];

  console.log(`Total comments on post: ${allComments.length}\n`);

  // Find all my comments
  const myComments = allComments.filter((c: any) =>
    c.author.name === MY_AGENT_NAME
  );

  console.log(`My comments: ${myComments.length}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // For each of my comments, find replies
  let totalRepliesToMe = 0;
  const repliesToRespond: any[] = [];

  for (const myComment of myComments) {
    console.log(`📝 My comment (${myComment.id}):`);
    console.log(`   "${myComment.content.substring(0, 80)}..."`);
    console.log(`   Posted: ${new Date(myComment.created_at).toLocaleString()}`);

    // Find replies to this comment (replies have parent_id = myComment.id)
    const replies = allComments.filter((c: any) =>
      c.parent_id === myComment.id
    );

    if (replies.length > 0) {
      console.log(`\n   💬 ${replies.length} REPLIES:\n`);

      for (const reply of replies) {
        totalRepliesToMe++;
        console.log(`   ┌─ @${reply.author.name} (${reply.author.karma} karma)`);
        console.log(`   │  "${reply.content.substring(0, 100)}${reply.content.length > 100 ? '...' : ''}"`);
        console.log(`   │  Upvotes: ${reply.upvotes} | Posted: ${new Date(reply.created_at).toLocaleString()}`);
        console.log(`   └─ Reply ID: ${reply.id}\n`);

        // Check if this needs a response
        const needsResponse = !reply.content.toLowerCase().includes('spam')
          && reply.author.name !== 'TipJarBot'
          && reply.author.name !== 'Aetherx402'
          && !reply.content.includes('$CLAW PROTOCOL');

        if (needsResponse) {
          repliesToRespond.push({
            replyId: reply.id,
            author: reply.author.name,
            content: reply.content,
            myCommentPreview: myComment.content.substring(0, 80),
            parentId: myComment.id,
          });
        }
      }
    } else {
      console.log(`   (No replies yet)\n`);
    }

    console.log('───────────────────────────────────────────\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 SUMMARY`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total replies to my comments: ${totalRepliesToMe}`);
  console.log(`Replies needing response: ${repliesToRespond.length}\n`);

  if (repliesToRespond.length > 0) {
    console.log('🎯 REPLIES TO RESPOND TO:\n');
    for (let i = 0; i < repliesToRespond.length; i++) {
      const r = repliesToRespond[i];
      console.log(`${i + 1}. @${r.author} replied to: "${r.myCommentPreview}..."`);
      console.log(`   Content: "${r.content.substring(0, 120)}..."`);
      console.log(`   Reply ID: ${r.replyId}\n`);
    }
  } else {
    console.log('✅ No replies needing response (all caught up or all spam)\n');
  }
}

main().catch(console.error);
