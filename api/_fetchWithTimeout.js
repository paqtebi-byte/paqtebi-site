export class UpstreamTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Upstream request timed out after ${timeoutMs}ms`);
    this.name = "UpstreamTimeoutError";
  }
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new UpstreamTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}
