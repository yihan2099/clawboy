import { describe, test, expect } from 'bun:test';
import { waitlistSchema } from '../../../lib/validations/waitlist';

describe('waitlistSchema', () => {
  test('accepts valid email addresses', () => {
    const result = waitlistSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  test('lowercases email on valid input', () => {
    const result = waitlistSchema.safeParse({ email: 'User@Example.COM' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  test('rejects empty string', () => {
    const result = waitlistSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
  });

  test('rejects invalid email formats', () => {
    const invalidEmails = ['notanemail', '@example.com', 'user@', 'user@.com', 'user@com'];
    for (const email of invalidEmails) {
      const result = waitlistSchema.safeParse({ email });
      expect(result.success).toBe(false);
    }
  });

  test('rejects email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@b.co';
    const result = waitlistSchema.safeParse({ email: longEmail });
    expect(result.success).toBe(false);
  });

  test('accepts email with subdomains', () => {
    const result = waitlistSchema.safeParse({ email: 'user@mail.example.co.uk' });
    expect(result.success).toBe(true);
  });

  test('accepts email with plus addressing', () => {
    const result = waitlistSchema.safeParse({ email: 'user+tag@example.com' });
    expect(result.success).toBe(true);
  });
});
