/**
 * Server Actions Tests
 *
 * Tests the newsletter and statistics action logic.
 *
 * Note: The actual server action files use Next.js path aliases (@/) which
 * don't resolve in Bun's test runner. We test the underlying logic patterns
 * instead of importing the actions directly.
 */
import { describe, test, expect } from 'bun:test';
import { waitlistSchema } from '../../lib/validations/waitlist';

// ============================================================================
// Newsletter Action Logic Tests
// ============================================================================

type NewsletterState = { success: boolean; message: string } | null;

/**
 * Simulates the subscribeNewsletter action logic without Next.js dependencies.
 * Mirrors the logic from app/actions/newsletter.ts.
 */
async function simulateSubscribeNewsletter(
  email: string | null,
  audienceId: string | undefined,
  createContact: (params: { email: string; audienceId: string }) => Promise<unknown>
): Promise<NewsletterState> {
  const parsed = waitlistSchema.safeParse({
    email: typeof email === 'string' ? email.trim() : email,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  if (!audienceId) {
    return {
      success: false,
      message: 'Newsletter is not configured. Please try again later.',
    };
  }

  try {
    await createContact({ email: parsed.data.email, audienceId });
    return { success: true, message: "You're subscribed!" };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return { success: true, message: "You're already subscribed!" };
    }
    return { success: false, message: 'Something went wrong. Please try again.' };
  }
}

describe('Newsletter subscription action', () => {
  test('successfully subscribes a new email', async () => {
    const result = await simulateSubscribeNewsletter(
      'new@example.com',
      'audience-123',
      async () => ({ id: 'contact-1' })
    );
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.message).toContain('subscribed');
  });

  test('returns validation error for invalid email', async () => {
    const result = await simulateSubscribeNewsletter('not-valid', 'audience-123', async () => ({}));
    expect(result).not.toBeNull();
    expect(result!.success).toBe(false);
  });

  test('handles missing audience ID', async () => {
    const result = await simulateSubscribeNewsletter(
      'user@example.com',
      undefined,
      async () => ({})
    );
    expect(result).not.toBeNull();
    expect(result!.success).toBe(false);
    expect(result!.message).toContain('not configured');
  });

  test('handles duplicate contact as success', async () => {
    const result = await simulateSubscribeNewsletter(
      'user@example.com',
      'audience-123',
      async () => {
        throw new Error('Contact already exists in this audience');
      }
    );
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.message).toContain('already subscribed');
  });

  test('handles API errors gracefully', async () => {
    const result = await simulateSubscribeNewsletter(
      'user@example.com',
      'audience-123',
      async () => {
        throw new Error('Internal server error');
      }
    );
    expect(result).not.toBeNull();
    expect(result!.success).toBe(false);
    expect(result!.message).toContain('Something went wrong');
  });

  test('passes correct params to Resend', async () => {
    let capturedParams: Record<string, unknown> = {};
    await simulateSubscribeNewsletter('TEST@Example.Com', 'aud-456', async (params) => {
      capturedParams = params;
    });
    expect(capturedParams.email).toBe('test@example.com');
    expect(capturedParams.audienceId).toBe('aud-456');
  });
});

// ============================================================================
// Statistics Action Logic Tests
// ============================================================================

/**
 * Simulates the cached statistics action pattern from app/actions/statistics.ts.
 * The actual actions use 'use cache' which requires Next.js runtime.
 */
async function simulateCachedAction<T>(fetcher: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}

describe('Statistics fetch actions', () => {
  test('returns data on successful fetch', async () => {
    const stats = { totalTasks: 42, totalAgents: 10, openTasks: 5 };
    const result = await simulateCachedAction(() => Promise.resolve(stats), null);
    expect(result).not.toBeNull();
    expect(result!.totalTasks).toBe(42);
  });

  test('returns null fallback on error for nullable results', async () => {
    const result = await simulateCachedAction<{ totalTasks: number } | null>(() => {
      throw new Error('DB connection failed');
    }, null);
    expect(result).toBeNull();
  });

  test('returns empty array fallback on error for list results', async () => {
    const result = await simulateCachedAction<unknown[]>(() => {
      throw new Error('Query timeout');
    }, []);
    expect(result).toEqual([]);
  });

  test('passes through successful list results', async () => {
    const tasks = [
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ];
    const result = await simulateCachedAction(() => Promise.resolve(tasks), []);
    expect(result.length).toBe(2);
  });
});
