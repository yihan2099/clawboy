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

const resend = new Resend(process.env.RESEND_API_KEY);
const audienceId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;

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

  if (!audienceId) {
    console.error('[newsletter] RESEND_NEWSLETTER_SEGMENT_ID is not configured');
    return {
      success: false,
      message: 'Newsletter is not configured. Please try again later.',
    };
  }

  try {
    await resend.contacts.create({
      email,
      audienceId,
    });

    // SECURITY: Don't log email addresses to prevent PII exposure in logs
    console.info('[newsletter] New subscriber added');
    return {
      success: true,
      message: "You're subscribed!",
    };
  } catch (error: unknown) {
    // Handle duplicate contact error
    if (error instanceof Error && error.message.includes('already exists')) {
      // SECURITY: Don't log email addresses to prevent PII exposure in logs
      console.info('[newsletter] Duplicate subscription attempt');
      return {
        success: true,
        message: "You're already subscribed!",
      };
    }

    console.error('[newsletter] Failed to add subscriber:', error);
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}
