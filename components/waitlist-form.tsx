"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";

export function WaitlistForm() {
  const [state, formAction, isPending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    null
  );

  if (state?.success) {
    return (
      <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
        <p className="text-lg font-medium text-white">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          disabled={isPending}
          className="h-12 px-5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 min-w-[280px]"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Joining..." : "Join Waitlist"}
        </button>
      </div>
      {state?.message && !state.success && (
        <p className="mt-3 text-sm text-red-400">{state.message}</p>
      )}
    </form>
  );
}
