import { sleep } from "@/lib/async";
import { AIError } from "./types";

/** Retries rate-limit / temporary errors with growing waits (2s, 4s, 8s, ...). */
export async function withRetry<T>(fn: () => Promise<T>, retries = 4, baseMs = 2000): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof AIError) || !e.retryable || attempt >= retries) throw e;
      attempt++;
      await sleep(baseMs * 2 ** (attempt - 1));
    }
  }
}
