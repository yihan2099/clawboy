/**
 * Simple logging helpers for examples
 */

export function step(n: number, msg: string): void {
  console.log(`\n[${'='.repeat(40)}]`);
  console.log(`  Step ${n}: ${msg}`);
  console.log(`[${'='.repeat(40)}]\n`);
}

export function info(msg: string): void {
  console.log(`  [INFO] ${msg}`);
}

export function success(msg: string): void {
  console.log(`  [OK]   ${msg}`);
}

export function error(msg: string): void {
  console.error(`  [ERR]  ${msg}`);
}

export function json(label: string, data: unknown): void {
  console.log(`  ${label}:`);
  console.log(
    JSON.stringify(data, null, 2)
      .split('\n')
      .map((l) => `    ${l}`)
      .join('\n')
  );
}

/**
 * Retry a function with exponential backoff.
 * Useful for MCP tool calls that may fail transiently (network errors, rate limits).
 *
 * @param fn The async function to retry
 * @param maxRetries Maximum number of retries (default: 3)
 * @param baseDelayMs Base delay between retries in ms (default: 1000, doubles each retry)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`  [RETRY] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
