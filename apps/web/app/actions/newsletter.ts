'use server';

import { Resend } from 'resend';
import { waitlistSchema } from '@/lib/validations/waitlist';

// Validate environment variables at startup
if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not configured');
}
if (!process.env.RESEND_NEWSLETTER_SEGMENT_ID) {
  console.error('RESEND_NEWSLETTER_SEGMENT_ID is not configured');
}

// RELIABILITY: Resend constructor accepts undefined/empty string but all API calls
// will fail with 401. The check above logs the misconfiguration at startup.
// An empty string is equivalent to missing — both result in auth failures.
const resend = new Resend(process.env.RESEND_API_KEY || undefined);
const audienceId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;
const resendApiKey = process.env.RESEND_API_KEY;

export type NewsletterState = {
  success: boolean;
  message: string;
} | null;

export async function subscribeNewsletter(
  _prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const rawEmail = formData.get('email');

  const parsed = waitlistSchema.safeParse({
    email: typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail,
  });

  if (!parsed.success) {
    console.warn('[newsletter] Validation failed:', parsed.error.issues[0]?.message);
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const { email } = parsed.data;

  // Early return: refuse to make API calls if the key is absent. Without this guard the
  // Resend client would attempt the request and receive a 401 auth error, which is a
  // confusing failure mode for both the user and the operator.
  if (!resendApiKey) {
    console.error('[newsletter] RESEND_API_KEY is not configured — cannot send request');
    return {
      success: false,
      message: 'Newsletter is not configured. Please try again later.',
    };
  }

  if (!audienceId) {
    console.error('[newsletter] RESEND_NEWSLETTER_SEGMENT_ID is not configured');
    return {
      success: false,
      message: 'Newsletter is not configured. Please try again later.',
    };
  }

  try {
    // Resend SDK uses a { data, error } response pattern — API errors do NOT throw.
    // Check the returned error object rather than relying on string matching in a catch block.
    const { error } = await resend.contacts.create({
      email,
      audienceId,
    });

    if (error) {
      // 409 = contact already exists in the audience
      // Use statusCode rather than message string matching for robustness.
      if (error.statusCode === 409) {
        // SECURITY: Don't log email addresses to prevent PII exposure in logs
        console.info('[newsletter] Duplicate subscription attempt');
        return {
          success: true,
          message: "You're already subscribed!",
        };
      }

      console.error('[newsletter] Failed to add subscriber:', error.statusCode, error.name);
      return {
        success: false,
        message: 'Something went wrong. Please try again.',
      };
    }

    // SECURITY: Don't log email addresses to prevent PII exposure in logs
    console.info('[newsletter] New subscriber added');
    return {
      success: true,
      message: "You're subscribed!",
    };
  } catch (error: unknown) {
    // Only reaches here for unexpected throws (network errors, etc.)
    console.error('[newsletter] Unexpected error adding subscriber:', error);
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}
