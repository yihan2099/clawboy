#!/usr/bin/env bun

/**
 * Deep search using multiple strategies to find ALL submissions
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
  console.log('🔍 DEEP SEARCH FOR ALL SUBMISSIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Strategy 1: Check the official hackathon announcement post for linked submissions
  console.log('Strategy 1: Checking hackathon announcement post...\n');
  const HACKATHON_POST_ID = 'b021cdea-de86-4460-8c4b-8539842423fe';

  try {
    const hackathonPost = await moltbookRequest(`/posts/${HACKATHON_POST_ID}`);
    const comments = hackathonPost.post?.comments || hackathonPost.comments || [];

    console.log(`Hackathon post has ${comments.length} comments\n`);

    // Look for submission links in comments
    const submissionComments = comments.filter((c: any) => {
      const content = c.content.toLowerCase();
      return content.includes('projectsubmission') ||
             content.includes('github.com') ||
             content.includes('my submission') ||
             content.includes('i built');
    });

    console.log(`Found ${submissionComments.length} potential submission-related comments\n`);

    if (submissionComments.length > 0) {
      console.log('Sample comments:\n');
      for (const comment of submissionComments.slice(0, 5)) {
        console.log(`  @${comment.author.name}:`);
        console.log(`  "${comment.content.substring(0, 100)}..."\n`);
      }
    }
  } catch (error: any) {
    console.log(`❌ Could not fetch hackathon post: ${error.message}\n`);
  }

  // Strategy 2: Check who voted on MY post - they might have submissions too
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Strategy 2: Checking voters on my post for their submissions...\n');

  try {
    const myPost = await moltbookRequest(`/posts/${MY_POST_ID}`);
    const comments = myPost.post?.comments || myPost.comments || [];

    const voters = comments.filter((c: any) =>
      c.content.includes('#USDCHackathon Vote')
    );

    console.log(`Found ${voters.length} voters on my post\n`);

    // Check each voter's profile for their own posts
    const submissions: any[] = [];

    for (const voter of voters) {
      console.log(`Checking @${voter.author.name}...`);

      // Try to get their posts (if API supports it)
      // This might not work, but worth trying
      try {
        const agentInfo = await moltbookRequest(`/agents/${voter.author.name}`);
        console.log(`  Stats: ${agentInfo.stats?.posts || 0} posts\n`);

        // If they have posts, they might have a submission
        if (agentInfo.stats?.posts > 0) {
          submissions.push({
            author: voter.author.name,
            karma: voter.author.karma,
            postCount: agentInfo.stats.posts,
          });
        }
      } catch (error) {
        // API doesn't support this, skip
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (submissions.length > 0) {
      console.log('\n🎯 Voters who have made posts (potential submissions):\n');
      for (const sub of submissions) {
        console.log(`  @${sub.author} - ${sub.postCount} posts, ${sub.karma} karma`);
      }
      console.log('');
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Strategy 3: Try different feed parameters
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Strategy 3: Trying different feed parameters...\n');

  const feedVariations = [
    '/feed?submolt=usdc&sort=new&limit=100',
    '/feed?submolt=usdc&sort=top&limit=100',
    '/feed?submolt=usdc&limit=100',
    '/feed/usdc?limit=100',
  ];

  const allFoundPosts = new Set<string>();

  for (const endpoint of feedVariations) {
    try {
      console.log(`Trying: ${endpoint}`);
      const feed = await moltbookRequest(endpoint);
      const posts = feed.posts || [];

      for (const post of posts) {
        const combined = ((post.title || '') + ' ' + (post.content || '')).toLowerCase();
        if (combined.includes('projectsubmission') ||
            combined.includes('#usdchackathon')) {
          allFoundPosts.add(post.id);
        }
      }

      console.log(`  Found ${posts.length} posts, ${allFoundPosts.size} unique submissions so far\n`);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message}\n`);
    }
  }

  console.log(`Total unique submissions found: ${allFoundPosts.size}\n`);

  // Strategy 4: Directly check known submission IDs
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Strategy 4: Checking known submission IDs...\n');

  const knownSubmissions = [
    { id: MY_POST_ID, name: 'ClawboyAgent' },
    { id: '6284d7cf-62e2-44cf-8433-a2fe5387c61b', name: '@Clawd42' },
  ];

  console.log('📊 CONFIRMED SUBMISSIONS:\n');

  for (const sub of knownSubmissions) {
    try {
      const postData = await moltbookRequest(`/posts/${sub.id}`);
      const post = postData.post || postData;
      const comments = post.comments || [];
      const votes = comments.filter((c: any) =>
        c.content.includes('#USDCHackathon Vote')
      ).length;

      // Determine track
      const content = post.content || '';
      let track = 'Unknown';
      if (content.includes('AgenticCommerce')) track = 'AgenticCommerce';
      else if (content.includes('SmartContract')) track = 'SmartContract';
      else if (content.includes('Skill')) track = 'Skill';

      console.log(`📝 ${post.title || 'Untitled'}`);
      console.log(`   Author: @${post.author.name}`);
      console.log(`   Track: ${track}`);
      console.log(`   Votes: ${votes} official votes`);
      console.log(`   Posted: ${new Date(post.created_at).toLocaleString()}`);
      console.log(`   URL: https://www.moltbook.com/post/${post.id}\n`);
    } catch (error: any) {
      console.log(`❌ Could not fetch ${sub.name}: ${error.message}\n`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 FINAL ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('The m/usdc feed API has limitations:');
  console.log('  • Hard limit of 100 posts per request');
  console.log('  • Sorted by recent activity (not post date)');
  console.log('  • Older posts fall out of feed window\n');
  console.log('This means we can only confirm submissions we already know about.\n');
  console.log('Circle judges will have access to all posts regardless of feed visibility.\n');
}

main().catch(console.error);
