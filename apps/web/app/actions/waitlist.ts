"use server";

import { Resend } from "resend";
import { waitlistSchema } from "@/lib/validations/waitlist";

// Validate environment variables at startup
if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not configured");
}
if (!process.env.RESEND_NEWSLETTER_SEGMENT_ID) {
  console.error("RESEND_NEWSLETTER_SEGMENT_ID is not configured");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const audienceId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;

export type WaitlistState = {
  success: boolean;
  message: string;
} | null;

export async function joinWaitlist(
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const rawEmail = formData.get("email");

  const parsed = waitlistSchema.safeParse({
    email: typeof rawEmail === "string" ? rawEmail.trim() : rawEmail,
  });

  if (!parsed.success) {
    console.warn("[waitlist] Validation failed:", parsed.error.issues[0]?.message);
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { email } = parsed.data;

  if (!audienceId) {
    console.error("[waitlist] RESEND_NEWSLETTER_SEGMENT_ID is not configured");
    return {
      success: false,
      message: "Waitlist is not configured. Please try again later.",
    };
  }

  try {
    await resend.contacts.create({
      email,
      audienceId,
    });

    console.info("[waitlist] New signup:", email);
    return {
      success: true,
      message: "You're on the list!",
    };
  } catch (error: unknown) {
    // Handle duplicate contact error
    if (
      error instanceof Error &&
      error.message.includes("already exists")
    ) {
      console.info("[waitlist] Duplicate signup attempt:", email);
      return {
        success: true,
        message: "You're already on the list!",
      };
    }

    console.error("[waitlist] Failed to add contact:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
