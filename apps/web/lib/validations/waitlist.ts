import { z } from "zod";

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .max(254, "Email too long")
    .email("Invalid email")
    .transform((email) => email.trim().toLowerCase()),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
