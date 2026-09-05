export const METADATA_TIMEOUT = 20_000;
export const TRANSFER_TIMEOUT = 60_000;

/** Keep the deadline alive through body consumption, not just response headers. */
export async function withDeadline<T>(
  signal: AbortSignal | undefined,
  timeout: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("The network request timed out. Please try again.")), timeout);
  try {
    controller.signal.throwIfAborted();
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
