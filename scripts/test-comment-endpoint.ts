#!/usr/bin/env bun

const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const BASE_URL = 'https://www.moltbook.com/api/v1';
const POST_ID = '224fbb54-14ea-4d21-8efe-067521c54300';

// Try different possible endpoints
const endpoints = [
  { path: '/comments', method: 'POST' },
  { path: `/posts/${POST_ID}/comments`, method: 'POST' },
  { path: '/comment', method: 'POST' },
];

for (const endpoint of endpoints) {
  console.log(`\nTesting ${endpoint.method} ${endpoint.path}...`);

  try {
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${MOLTBOOK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_id: POST_ID,
        content: 'Test comment (please ignore)',
      }),
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 200)}`);
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
  }
}
