/**
 * Retry configuration for contract reads
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Callback for retry attempts */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Custom error class for contract read failures
 */
export class ContractReadError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly attempts?: number
  ) {
    super(message);
    this.name = 'ContractReadError';
  }
}

/**
 * Determines if an error is retryable (transient RPC/network errors)
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Retryable network/RPC errors
  const retryablePatterns = [
    'timeout',
    'network',
    'econnreset',
    'econnrefused',
    'socket hang up',
    'etimedout',
    'enotfound',
    'rate limit',
    '429',
    '503',
    '502',
    '504',
    'temporarily unavailable',
    'internal server error',
    'request failed',
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a contract read with exponential backoff retry
 * @param fn The async function to execute
 * @param config Retry configuration
 * @returns The result of the function
 * @throws ContractReadError if all retries fail
 */
export async function withContractRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_RETRY_CONFIG.maxAttempts,
    initialDelayMs = DEFAULT_RETRY_CONFIG.initialDelayMs,
    maxDelayMs = DEFAULT_RETRY_CONFIG.maxDelayMs,
    backoffMultiplier = DEFAULT_RETRY_CONFIG.backoffMultiplier,
    onRetry,
  } = config;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-transient errors
      if (!isRetryableError(error)) {
        throw new ContractReadError(
          `Contract read failed: ${lastError.message}`,
          lastError,
          attempt
        );
      }

      // Don't retry after last attempt
      if (attempt >= maxAttempts) {
        break;
      }

      // Call onRetry callback
      onRetry?.(attempt, lastError, delay);

      // Wait before retry
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw new ContractReadError(
    `Contract read failed after ${maxAttempts} attempts: ${lastError?.message}`,
    lastError,
    maxAttempts
  );
}
