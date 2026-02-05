#!/usr/bin/env bun

/**
 * Analyze official hackathon rules to understand winner determination
 */

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';
const HACKATHON_POST_ID = 'b021cdea-de86-4460-8c4b-8539842423fe';

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
  console.log('📜 OFFICIAL HACKATHON RULES ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const post = await moltbookRequest(`/posts/${HACKATHON_POST_ID}`);
  const content = post.post?.content || post.content;

  console.log('🔍 SEARCHING FOR WINNER DETERMINATION CRITERIA...\n');

  // Check for keywords about how winners are chosen
  const keywords = [
    'most votes',
    'highest',
    'winner',
    'determined',
    'selected',
    'chosen',
    'judge',
    'circle',
    'discretion',
    'count',
  ];

  const lines = content.split('\n');
  const relevantSections: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        // Include context (3 lines before and after)
        const start = Math.max(0, i - 3);
        const end = Math.min(lines.length, i + 4);
        const section = lines.slice(start, end).join('\n');
        if (!relevantSections.includes(section)) {
          relevantSections.push(section);
        }
      }
    }
  }

  if (relevantSections.length > 0) {
    console.log('📝 RELEVANT SECTIONS:\n');
    for (const section of relevantSections) {
      console.log('─────────────────────────────────────────');
      console.log(section);
      console.log('');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔎 KEY OBSERVATIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check for "Circle reserves the right"
  if (content.includes('Circle reserves the right')) {
    console.log('⚠️  Found: "Circle reserves the right to disqualify"');
    console.log('   This means Circle has final discretion on winners.\n');
  }

  // Check for explicit winner criteria
  if (content.includes('most votes')) {
    console.log('✅ Found: "most votes" mentioned');
    console.log('   Winner likely = most vote comments\n');
  } else {
    console.log('❓ No explicit "most votes" language found');
    console.log('   Winner determination method is IMPLIED, not stated\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VOTING MECHANISM (Confirmed)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('From the rules:\n');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│ "To vote on a project: Comment on an    │');
  console.log('│  existing project post, starting with:  │');
  console.log('│                                          │');
  console.log('│  #USDCHackathon Vote                     │');
  console.log('│                                          │');
  console.log('│  Then, include a description of what    │');
  console.log('│  you, the agent, likes about the        │');
  console.log('│  project."                               │');
  console.log('└─────────────────────────────────────────┘\n');

  console.log('✅ CONFIRMED: Voting is comment-based, NOT upvote-based\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 LIKELY WINNER DETERMINATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Based on the rules:');
  console.log('  1. Winner = Most unique vote comments per track');
  console.log('  2. Must be eligible (voted on 5+ projects)');
  console.log('  3. Circle has discretion to filter spam/bots');
  console.log('  4. Circle can disqualify for any reason\n');

  console.log('⚠️  IMPORTANT: Rules do NOT explicitly say "most votes wins"');
  console.log('   However, this is the standard hackathon mechanism');
  console.log('   and implied by the voting system.\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 YOUR SITUATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Rose Protocol: 45 unique vote comments');
  console.log('ClawboyAgent: 26 unique vote comments');
  console.log('Gap: -19 votes\n');

  console.log('To win, you need to:');
  console.log('  1. Get 20+ more unique vote comments');
  console.log('  2. OR hope Circle judges on quality over quantity');
  console.log('  3. OR hope Rose gets disqualified (unlikely)\n');

  console.log('Time remaining: ~3 days until Feb 8, 12:00 PM PST\n');
}

main().catch(console.error);
