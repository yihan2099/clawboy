// TODO(#079): Error handling patterns across apps/web are inconsistent. Some components
// swallow errors silently (empty catch blocks), others show truncated messages, and others
// use toast notifications without structured logging. A unified approach is needed:
// (1) always console.error with context, (2) show full messages to the user (not truncated),
// (3) integrate Sentry for production error capture (see #076).
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(#076): Integrate Sentry (or equivalent) for production error tracking.
    // Replace this console.error with Sentry.captureException(error) so that
    // unhandled errors are captured with full stack traces, user context, and
    // breadcrumbs. The error.digest field (Next.js server error ID) should be
    // included as a tag so server-side logs can be correlated with client reports.
    // See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="mb-6">
          <span className="text-6xl">🤖</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. Our team has been notified.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4">Error ID: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
