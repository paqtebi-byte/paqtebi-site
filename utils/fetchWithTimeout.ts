const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'FetchTimeoutError';
  }
}

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const abortFromCaller = () => controller.abort();
  if (init.signal?.aborted) {
    controller.abort();
  } else {
    init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
};
