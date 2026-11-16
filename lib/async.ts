/** Run fn over items with limited concurrency; results keep the input order. Stops early on first error. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed) {
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        failed = true;
        throw e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls onTimeout after ms unless the returned cancel function runs first.
 * Used by background jobs so they can mark themselves "failed" before the host kills the function.
 */
export function startDeadline(ms: number, onTimeout: () => void | Promise<void>): () => void {
  const t = setTimeout(() => {
    Promise.resolve(onTimeout()).catch(() => {});
  }, ms);
  return () => clearTimeout(t);
}
