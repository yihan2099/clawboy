"use server";

import { Resend } from "resend";
import { waitlistSchema } from "@/lib/validations/waitlist";

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

  const parsed = waitlistSchema.safeParse({ email: rawEmail });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid email",
    };
  }

  const { email } = parsed.data;

  if (!audienceId) {
    console.error("RESEND_NEWSLETTER_SEGMENT_ID is not configured");
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
      return {
        success: true,
        message: "You're already on the list!",
      };
    }

    console.error("Failed to add contact to waitlist:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
