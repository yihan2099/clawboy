import { z } from "zod";

export const waitlistSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  webhookUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
