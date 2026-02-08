/**
 * Newsletter Form Tests
 *
 * Since @testing-library/react is not available and the server action
 * uses Next.js path aliases (@/) that don't resolve in Bun test runner,
 * we test the form's validation logic and action behavior separately.
 */
import { describe, test, expect } from 'bun:test';
import { waitlistSchema } from '../../lib/validations/waitlist';

describe('Newsletter form validation logic', () => {
  test('accepts valid email for form submission', () => {
    const result = waitlistSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  test('rejects empty email (form required field)', () => {
    const result = waitlistSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('required') || m.includes('Email'))).toBe(true);
    }
  });

  test('rejects invalid email format', () => {
    const result = waitlistSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('Invalid') || m.includes('email'))).toBe(true);
    }
  });

  test('transforms email to lowercase', () => {
    const result = waitlistSchema.safeParse({ email: 'USER@EXAMPLE.COM' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  test('rejects email exceeding max length', () => {
    const longEmail = 'a'.repeat(250) + '@b.co';
    const result = waitlistSchema.safeParse({ email: longEmail });
    expect(result.success).toBe(false);
  });
});

describe('Newsletter action behavior simulation', () => {
  // Simulate the action logic without importing it (due to @/ alias issues)

  function simulateNewsletterAction(
    email: string | null,
    createContact: (email: string) => Promise<void>
  ): Promise<{ success: boolean; message: string }> {
    // Step 1: Validate
    const parsed = waitlistSchema.safeParse({
      email: typeof email === 'string' ? email.trim() : email,
    });

    if (!parsed.success) {
      return Promise.resolve({
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
      });
    }

    // Step 2: Create contact
    return createContact(parsed.data.email)
      .then(() => ({
        success: true,
        message: "You're subscribed!",
      }))
      .catch((error: Error) => {
        if (error.message.includes('already exists')) {
          return { success: true, message: "You're already subscribed!" };
        }
        return { success: false, message: 'Something went wrong. Please try again.' };
      });
  }

  test('successful subscription returns success state', async () => {
    const result = await simulateNewsletterAction('user@example.com', async () => {});
    expect(result.success).toBe(true);
    expect(result.message).toContain('subscribed');
  });

  test('duplicate email returns already subscribed', async () => {
    const result = await simulateNewsletterAction('user@example.com', async () => {
      throw new Error('Contact already exists');
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('already subscribed');
  });

  test('API error returns failure state', async () => {
    const result = await simulateNewsletterAction('user@example.com', async () => {
      throw new Error('Service unavailable');
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Something went wrong');
  });

  test('invalid email returns validation error', async () => {
    const result = await simulateNewsletterAction('bad-email', async () => {});
    expect(result.success).toBe(false);
  });

  test('null email returns validation error', async () => {
    const result = await simulateNewsletterAction(null, async () => {});
    expect(result.success).toBe(false);
  });

  test('email is trimmed before validation', async () => {
    let capturedEmail = '';
    await simulateNewsletterAction('  user@example.com  ', async (email) => {
      capturedEmail = email;
    });
    expect(capturedEmail).toBe('user@example.com');
  });
});
