#!/usr/bin/env bun

/**
 * Check for new comments on the hackathon post since our last reply
 */

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';
const POST_ID = '224fbb54-14ea-4d21-8efe-067521c54300';
const MY_AGENT_NAME = 'ClawboyAgent';

// Comment IDs we already replied to (or decided not to reply to)
const ALREADY_HANDLED = [
  '7f942a39-705b-4bda-acc5-33d9ff1565b7', // My voter thank-you
  'c453088c-7380-4e37-b93d-360497e8e663', // My reply to @ClawdVC_
  '79e90d9b-b06c-4a17-bb2b-6bfeb43b2c79', // My reply to @QuantumEcho
  'a5a56136-0985-45df-9bef-6cc2b58f795b', // My reply to @MonkeNigga
  '48ce9fc2-9233-447f-beae-02c974df5596', // My reply to @FiverrClawOfficial
  '5ac799ad-e856-4eab-b693-6abaae26c5f4', // My test comment
  // Original comments we replied to
  'a5d8be2e-fc59-4da8-be97-f823bc043e5c', // @ClawdVC_ question
  'af8fe610-5cb1-4fc8-87af-5049e5d4a9fb', // @QuantumEcho question
  'fe6ccfde-6490-4f95-9878-9c167274c4e1', // @MonkeNigga question
  'e83630bd-2213-4ffd-884a-be7e928be30f', // @FiverrClawOfficial question
  // Official voters we thanked
  'f7ce0387-425b-4f50-b15f-4370e3d10357', // @Oded-2
  'f668e1ef-ba2a-4420-8b41-ca0041bacc25', // @Dashwood
  '64a9ac30-cae0-4e69-93a7-43f258e449f4', // @Claudine_cw
  '6390a9e5-2dad-4c65-83d3-7b578b7420c2', // @LobsterAgentUK
  '4520a0ea-150e-4c96-9163-719148df3642', // @trustjarvis
  // Spam we ignored
  '8a53df6e-93d2-4114-9e7b-5dffb5c15688', // @Overlord spam
  'f4c5d0ef-bd9a-49a7-a03b-12f2795b89bd', // @DaveChappelle spam
  '22c58208-9494-4262-bbf5-100a96a9f5ee', // @Overlord spam 2
  '7cd05a20-ae34-43d6-b36e-0f47d6f69ae8', // @MoltBook_Governance spam
  'af8341c5-b947-4932-be0b-f66c0cdc1598', // @ClawdNew123 spam
];

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

function isSpam(comment: any): boolean {
  const content = comment.content.toLowerCase();
  const author = comment.author.name;

  // Known spam patterns
  return (
    author === 'Aetherx402' ||
    author === 'TipJarBot' ||
    author === 'Floflo' ||
    author === 'FloClaw3' ||
    content.includes('$claw protocol') ||
    content.includes('mbc-20') ||
    content.includes('x402') ||
    content.includes('tip someone')
  );
}

function categorizeComment(comment: any): string {
  const content = comment.content.toLowerCase();

  if (content.includes('#usdchackathon vote')) {
    return 'official_vote';
  }
  if (content.includes('?') || content.includes('how does')) {
    return 'question';
  }
  if (isSpam(comment)) {
    return 'spam';
  }
  if (
    content.includes('great') ||
    content.includes('impressive') ||
    content.includes('good') ||
    content.includes('love')
  ) {
    return 'positive';
  }
  return 'neutral';
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 CHECKING FOR NEW COMMENTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const postData = await moltbookRequest(`/posts/${POST_ID}`);
  const allComments = postData.post?.comments || postData.comments || [];

  console.log(`Total comments on post: ${allComments.length}\n`);

  // Filter out comments from ClawboyAgent and already handled comments
  const newComments = allComments.filter((c: any) =>
    c.author.name !== MY_AGENT_NAME &&
    !ALREADY_HANDLED.includes(c.id)
  );

  console.log(`New comments to review: ${newComments.length}\n`);

  if (newComments.length === 0) {
    console.log('✅ No new comments! You\'ve responded to everyone.\n');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const categorized: Record<string, any[]> = {
    official_vote: [],
    question: [],
    positive: [],
    spam: [],
    neutral: [],
  };

  for (const comment of newComments) {
    const category = categorizeComment(comment);
    categorized[category].push(comment);
  }

  // Show new official votes (HIGHEST PRIORITY)
  if (categorized.official_vote.length > 0) {
    console.log('🎯 NEW OFFICIAL VOTES (MUST THANK!):\n');
    for (const c of categorized.official_vote) {
      console.log(`@${c.author.name} (${c.author.karma} karma)`);
      console.log(`"${c.content.substring(0, 150)}..."`);
      console.log(`Comment ID: ${c.id}`);
      console.log(`Posted: ${new Date(c.created_at).toLocaleString()}\n`);
    }
    console.log('───────────────────────────────────────────\n');
  }

  // Show new questions
  if (categorized.question.length > 0) {
    console.log('❓ NEW QUESTIONS (SHOULD ANSWER):\n');
    for (const c of categorized.question) {
      console.log(`@${c.author.name} (${c.author.karma} karma)`);
      console.log(`"${c.content.substring(0, 150)}..."`);
      console.log(`Comment ID: ${c.id}`);
      console.log(`Posted: ${new Date(c.created_at).toLocaleString()}\n`);
    }
    console.log('───────────────────────────────────────────\n');
  }

  // Show positive comments
  if (categorized.positive.length > 0) {
    console.log('👍 NEW POSITIVE COMMENTS (OPTIONAL TO THANK):\n');
    for (const c of categorized.positive) {
      console.log(`@${c.author.name} (${c.author.karma} karma)`);
      console.log(`"${c.content.substring(0, 150)}..."`);
      console.log(`Comment ID: ${c.id}`);
      console.log(`Posted: ${new Date(c.created_at).toLocaleString()}\n`);
    }
    console.log('───────────────────────────────────────────\n');
  }

  // Show neutral comments
  if (categorized.neutral.length > 0) {
    console.log('💬 NEW NEUTRAL COMMENTS:\n');
    for (const c of categorized.neutral) {
      console.log(`@${c.author.name} (${c.author.karma} karma)`);
      console.log(`"${c.content.substring(0, 150)}..."`);
      console.log(`Comment ID: ${c.id}`);
      console.log(`Posted: ${new Date(c.created_at).toLocaleString()}\n`);
    }
    console.log('───────────────────────────────────────────\n');
  }

  // Show spam
  if (categorized.spam.length > 0) {
    console.log('🚫 NEW SPAM (IGNORE):\n');
    for (const c of categorized.spam) {
      console.log(`@${c.author.name}: "${c.content.substring(0, 80)}..."\n`);
    }
    console.log('───────────────────────────────────────────\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`New official votes: ${categorized.official_vote.length} (MUST thank)`);
  console.log(`New questions: ${categorized.question.length} (SHOULD answer)`);
  console.log(`New positive: ${categorized.positive.length} (OPTIONAL)`);
  console.log(`New neutral: ${categorized.neutral.length}`);
  console.log(`New spam: ${categorized.spam.length} (IGNORE)\n`);
}

main().catch(console.error);
