#!/usr/bin/env bun

/**
 * Analyze comments on ClawboyAgent's Moltbook post
 */

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';

// Post ID from the hackathon submission
const POST_ID = '224fbb54-14ea-4d21-8efe-067521c54300';

if (!MOLTBOOK_API_KEY) {
  console.error('❌ MOLTBOOK_API_KEY environment variable not found');
  process.exit(1);
}

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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data;
}

function analyzeSentiment(text: string): {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  keywords: string[];
} {
  const lowerText = text.toLowerCase();

  // Positive indicators
  const positiveWords = [
    'great', 'awesome', 'excellent', 'impressive', 'nice', 'good', 'love',
    'amazing', 'beautiful', 'fantastic', 'brilliant', 'solid', 'strong',
    'congrats', 'congratulations', 'well done', 'perfect', 'best', 'winner',
    'clean', 'thorough', 'comprehensive', 'complete', 'shipped', 'real',
    'production', 'legit', 'respect', 'fire', '🔥', '👏', '💯', '🚀'
  ];

  // Negative indicators
  const negativeWords = [
    'bad', 'terrible', 'awful', 'poor', 'weak', 'missing', 'lacking',
    'incomplete', 'broken', 'fail', 'failed', 'wrong', 'issue', 'problem',
    'concern', 'worried', 'disappointed', 'underwhelming', 'overhyped',
    'copy', 'copied', 'stolen', 'fake', 'scam', 'spam'
  ];

  // Question/neutral indicators
  const questionWords = [
    'how', 'what', 'why', 'when', 'where', 'which', 'could', 'would',
    'can you', 'do you', 'will you', 'is this', 'are you', '?'
  ];

  // Critical/constructive indicators
  const criticalWords = [
    'but', 'however', 'although', 'concern', 'missing', 'needs', 'should',
    'could improve', 'suggestion', 'feedback'
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  let questionCount = 0;
  let criticalCount = 0;

  const foundKeywords: string[] = [];

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) {
      positiveCount++;
      foundKeywords.push(`+${word}`);
    }
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) {
      negativeCount++;
      foundKeywords.push(`-${word}`);
    }
  });

  questionWords.forEach(word => {
    if (lowerText.includes(word)) {
      questionCount++;
    }
  });

  criticalWords.forEach(word => {
    if (lowerText.includes(word)) {
      criticalCount++;
    }
  });

  // Calculate sentiment
  const netScore = positiveCount - negativeCount;
  const totalSignals = positiveCount + negativeCount;

  let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  let score: number;

  if (totalSignals === 0) {
    sentiment = questionCount > 2 ? 'neutral' : 'neutral';
    score = 0;
  } else if (netScore > 0 && negativeCount === 0) {
    sentiment = 'positive';
    score = positiveCount;
  } else if (netScore < 0 && positiveCount === 0) {
    sentiment = 'negative';
    score = -negativeCount;
  } else if (Math.abs(netScore) <= 1) {
    sentiment = 'mixed';
    score = netScore;
  } else {
    sentiment = netScore > 0 ? 'positive' : 'negative';
    score = netScore;
  }

  return { sentiment, score, keywords: foundKeywords };
}

async function analyzeComments() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💬 COMMENT SENTIMENT ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get the post details first
    const post = await moltbookRequest(`/posts/${POST_ID}`);
    console.log(`Post: "${post.post.title}"`);
    console.log(`Submolt: m/${post.post.submolt.name}`);
    console.log(`Score: ${post.post.upvotes} upvotes, ${post.post.downvotes} downvotes (net +${post.post.upvotes - post.post.downvotes})`);
    console.log(`Comments: ${post.post.comment_count}\n`);

    // Get comments
    const commentsData = await moltbookRequest(`/posts/${POST_ID}/comments?sort=top`);
    const comments = commentsData.comments || [];

    if (comments.length === 0) {
      console.log('No comments found.');
      return;
    }

    console.log(`Found ${comments.length} comments\n`);

    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    };

    const allComments: any[] = [];

    // Analyze each comment
    comments.forEach((comment: any, index: number) => {
      const analysis = analyzeSentiment(comment.content);
      sentimentCounts[analysis.sentiment]++;

      allComments.push({
        index: index + 1,
        author: comment.author.name,
        content: comment.content,
        upvotes: comment.upvotes || 0,
        sentiment: analysis.sentiment,
        score: analysis.score,
        keywords: analysis.keywords,
        created_at: comment.created_at,
      });
    });

    // Sort by upvotes to show most popular first
    allComments.sort((a, b) => b.upvotes - a.upvotes);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SENTIMENT BREAKDOWN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const total = comments.length;
    console.log(`✅ Positive:  ${sentimentCounts.positive.toString().padStart(2)} (${Math.round(sentimentCounts.positive / total * 100)}%)`);
    console.log(`❌ Negative:  ${sentimentCounts.negative.toString().padStart(2)} (${Math.round(sentimentCounts.negative / total * 100)}%)`);
    console.log(`⚖️  Mixed:     ${sentimentCounts.mixed.toString().padStart(2)} (${Math.round(sentimentCounts.mixed / total * 100)}%)`);
    console.log(`➖ Neutral:   ${sentimentCounts.neutral.toString().padStart(2)} (${Math.round(sentimentCounts.neutral / total * 100)}%)`);

    const positiveRatio = sentimentCounts.positive / total;
    let overallSentiment = '';
    if (positiveRatio >= 0.7) {
      overallSentiment = '🎉 Overwhelmingly Positive';
    } else if (positiveRatio >= 0.5) {
      overallSentiment = '😊 Mostly Positive';
    } else if (positiveRatio >= 0.3) {
      overallSentiment = '🤔 Mixed';
    } else {
      overallSentiment = '😐 Neutral/Skeptical';
    }

    console.log(`\n📈 Overall: ${overallSentiment}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 TOP COMMENTS (by upvotes)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    allComments.slice(0, 10).forEach((comment) => {
      const sentimentEmoji = {
        positive: '✅',
        negative: '❌',
        mixed: '⚖️',
        neutral: '➖',
      }[comment.sentiment];

      console.log(`${sentimentEmoji} [${comment.upvotes} upvotes] @${comment.author} - ${comment.sentiment.toUpperCase()}`);
      console.log(`   "${comment.content.substring(0, 200)}${comment.content.length > 200 ? '...' : ''}"`);
      if (comment.keywords.length > 0) {
        console.log(`   Keywords: ${comment.keywords.join(', ')}`);
      }
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 ALL COMMENTS (chronological)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Sort by created_at for chronological order
    const chronological = [...allComments].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    chronological.forEach((comment) => {
      const sentimentEmoji = {
        positive: '✅',
        negative: '❌',
        mixed: '⚖️',
        neutral: '➖',
      }[comment.sentiment];

      console.log(`${sentimentEmoji} @${comment.author} (${comment.upvotes} upvotes)`);
      console.log(`${comment.content}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeComments().catch(console.error);
