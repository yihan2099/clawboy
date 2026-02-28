// TODO(#082): The .transform() on the email field silently lowercases and trims the
// input before it reaches the action handler. This is intentional (email addresses are
// case-insensitive per RFC 5321) but the transformation is not surfaced to the user.
// If a user enters "User@Example.COM", the stored address will be "user@example.com"
// with no visible feedback. Consider adding a UI note ("Email will be normalized to
// lowercase") or reflecting the normalized value back in the success message.
import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Email too long')
    .email('Invalid email')
    .transform((email) => email.trim().toLowerCase()),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
