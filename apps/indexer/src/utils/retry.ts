/**
 * Retry utilities with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  /**
   * Optional predicate to determine if an error is retryable.
   * Return true to retry, false to throw immediately without further attempts.
   * Defaults to {@link isTransientError} which only retries on network/timeout/5xx/ECONNRESET
   * errors. Pass `() => true` to restore the old "retry everything" behavior.
   *
   * Example — only retry on a specific status code:
   *   shouldRetry: (err) => err.message.includes('503')
   */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Default transient-error predicate.
 *
 * Only retries on errors that are likely transient (network blips, server-side
 * 5xx, connection resets, and timeouts). Permanent failures such as 404 Not Found
 * or invalid IPFS CIDs are NOT retried, preventing wasted retries and masking
 * of logic bugs.
 *
 * Pass a custom `shouldRetry` to `withRetry` / `withRetryResult` to override.
 */
export function isTransientError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket') ||
    msg.includes('fetch failed') ||
    // HTTP 5xx status codes
    /\b5\d{2}\b/.test(msg)
  );
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'shouldRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  // Exponential backoff: initialDelay * multiplier^attempt
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);

  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Execute a function with retry and exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const { onRetry, shouldRetry } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Use the caller-supplied shouldRetry predicate, falling back to the default
      // transient-error predicate. This prevents wasting retries on permanent failures
      // (404, invalid CID, etc.) while still retrying on network/timeout/5xx errors.
      const retryPredicate = shouldRetry ?? isTransientError;
      if (!retryPredicate(lastError)) {
        throw lastError;
      }

      if (attempt === maxAttempts) {
        // Final attempt failed, throw the error
        break;
      }

      const delayMs = calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier);

      if (onRetry) {
        onRetry(attempt, lastError, delayMs);
      }

      await sleep(delayMs);
    }
  }

  throw lastError!;
}

/**
 * Result type for operations that can fail but we want to continue
 */
export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
}

/**
 * Execute a function with retry, returning a result object instead of throwing
 */
export async function withRetryResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<FetchResult<T>> {
  let attempts = 0;

  const wrappedFn = async (): Promise<T> => {
    attempts++;
    return fn();
  };

  try {
    const data = await withRetry(wrappedFn, {
      ...options,
      onRetry: (attempt, error, delayMs) => {
        options.onRetry?.(attempt, error, delayMs);
      },
    });
    return { success: true, data, attempts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      attempts,
    };
  }
}
