/**
 * Runs an asynchronous operation once more after a transient failure.
 * The second error is intentionally propagated to the caller.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @returns {Promise<T>}
 */
export async function withSingleRetry(operation) {
  try {
    return await operation();
  } catch {
    return operation();
  }
}
