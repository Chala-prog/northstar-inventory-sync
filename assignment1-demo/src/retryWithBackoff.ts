import { PermanentError } from "./warehouseApiUnreliable";

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxTotalElapsedMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const startedAt = Date.now();
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    if (options.maxTotalElapsedMs && Date.now() - startedAt > options.maxTotalElapsedMs) {
      throw new Error(`retryWithBackoff: exceeded maxTotalElapsedMs (${options.maxTotalElapsedMs}ms) before succeeding`);
    }
    try {
      return await fn();
    } catch (err) {
      if (err instanceof PermanentError) {
        throw err; // don't waste time retrying something that can't succeed
      }
      if (attempt === options.maxAttempts) {
        throw err; // out of attempts
      }
      const delay = options.baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.random() * delay * 0.5; // up to 50% extra, randomized
      const delayWithJitter = Math.round(delay + jitter);
      console.log(`[retry] attempt ${attempt} failed, waiting ${delayWithJitter}ms before retry (base ${delay}ms + jitter)`);
      await sleep(delayWithJitter);
    }
  }
  throw new Error("unreachable");
}
