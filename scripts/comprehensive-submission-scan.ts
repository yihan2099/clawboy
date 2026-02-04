#!/usr/bin/env bun

/**
 * Comprehensive scan of ALL hackathon submissions in m/usdc
 * Searches through more posts and checks multiple patterns
 */

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';

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

function analyzeAuthor(author: any): string {
  const signals: string[] = [];
  const name = author.name.toLowerCase();
  const bio = (author.description || '').toLowerCase();

  if (name.includes('agent')) signals.push('agent-name');
  if (name.includes('bot')) signals.push('bot-name');
  if (name.includes('ai')) signals.push('ai-name');
  if (name.includes('clawd') || name.includes('claude')) signals.push('claude-name');
  if (bio.includes('autonomous')) signals.push('autonomous-bio');
  if (bio.includes('ai assistant')) signals.push('ai-bio');

  const agentCount = signals.length;
  const hasHumanOwner = author.owner?.x_handle ? 1 : 0;

  if (agentCount > 0) return '🤖 AGENT';
  if (hasHumanOwner && agentCount === 0) return '👤 HUMAN';
  return '❓ UNCLEAR';
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 COMPREHENSIVE SUBMISSION SCAN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Fetch more posts from feed
  console.log('Fetching posts from m/usdc (limit 200)...\n');
  const feed = await moltbookRequest('/feed?submolt=usdc&limit=200');
  const posts = feed.posts || [];

  console.log(`Fetched ${posts.length} posts\n`);
  console.log('Scanning for hackathon submissions...\n');

  // Search patterns
  const patterns = [
    '#USDCHackathon ProjectSubmission',
    '#usdchackathon projectsubmission',
    'ProjectSubmission AgenticCommerce',
    'ProjectSubmission SmartContract',
    'ProjectSubmission Skill',
  ];

  const submissions: Record<string, any[]> = {
    AgenticCommerce: [],
    SmartContract: [],
    Skill: [],
    Unknown: [],
  };

  for (const post of posts) {
    const content = post.content || '';
    const title = post.title || '';
    const combined = (title + ' ' + content).toLowerCase();

    // Check if this is a submission
    const isSubmission = patterns.some(pattern =>
      combined.includes(pattern.toLowerCase())
    );

    if (isSubmission) {
      // Determine track
      let track = 'Unknown';
      if (combined.includes('agenticcommerce')) track = 'AgenticCommerce';
      else if (combined.includes('smartcontract')) track = 'SmartContract';
      else if (combined.includes('skill')) track = 'Skill';

      submissions[track].push(post);
    }
  }

  const total = Object.values(submissions).flat().length;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUBMISSIONS BY TRACK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`AgenticCommerce: ${submissions.AgenticCommerce.length}`);
  console.log(`SmartContract: ${submissions.SmartContract.length}`);
  console.log(`Skill: ${submissions.Skill.length}`);
  console.log(`Unknown track: ${submissions.Unknown.length}`);
  console.log(`Total: ${total}\n`);

  // Analyze each track
  for (const [track, trackSubmissions] of Object.entries(submissions)) {
    if (trackSubmissions.length === 0) continue;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 ${track.toUpperCase()} TRACK`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Fetch full details for each submission
    for (const post of trackSubmissions) {
      console.log(`📝 ${post.title || 'Untitled'}`);
      console.log(`   Author: @${post.author.name}`);
      console.log(`   Type: ${analyzeAuthor(post.author)}`);
      console.log(`   Posted: ${new Date(post.created_at).toLocaleString()}`);
      console.log(`   URL: https://www.moltbook.com/post/${post.id}`);

      // Fetch comments to count votes
      try {
        const postData = await moltbookRequest(`/posts/${post.id}`);
        const comments = postData.post?.comments || postData.comments || [];
        const votes = comments.filter((c: any) =>
          c.content.includes('#USDCHackathon Vote')
        ).length;

        console.log(`   📊 Upvotes: ${post.upvotes} | Comments: ${post.comment_count} | Official Votes: ${votes}`);
      } catch (error) {
        console.log(`   ❌ Could not fetch vote count`);
      }

      console.log(`   Preview: ${post.content.substring(0, 120).replace(/\n/g, ' ')}...\n`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏆 AGENTICCOMMERCE LEADERBOARD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (submissions.AgenticCommerce.length === 0) {
    console.log('❌ No AgenticCommerce submissions found!\n');
    console.log('⚠️  This is suspicious. Let me check if ClawboyAgent post exists...\n');

    const MY_POST_ID = '224fbb54-14ea-4d21-8efe-067521c54300';
    try {
      const myPost = await moltbookRequest(`/posts/${MY_POST_ID}`);
      console.log('✅ ClawboyAgent post exists but NOT in feed results!\n');
      console.log('Possible reasons:');
      console.log('  1. Feed pagination/sorting issue');
      console.log('  2. Post was posted too early (before feed window)');
      console.log('  3. Feed filtered by certain criteria\n');
    } catch (error) {
      console.log('❌ Could not fetch ClawboyAgent post\n');
    }
  } else {
    // Sort by votes
    const leaderboard: any[] = [];

    for (const post of submissions.AgenticCommerce) {
      try {
        const postData = await moltbookRequest(`/posts/${post.id}`);
        const comments = postData.post?.comments || postData.comments || [];
        const votes = comments.filter((c: any) =>
          c.content.includes('#USDCHackathon Vote')
        ).length;

        leaderboard.push({
          author: post.author.name,
          votes,
          url: `https://www.moltbook.com/post/${post.id}`,
        });
      } catch (error) {
        // Skip
      }
    }

    leaderboard.sort((a, b) => b.votes - a.votes);

    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`${medal} ${i + 1}. @${entry.author}: ${entry.votes} votes`);
      console.log(`      ${entry.url}\n`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 ANALYSIS COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
