type Validator<T> = (value: unknown) => value is T;

export const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const readLocalStorageJson = <T>(
  key: string,
  fallback: T,
  validator?: Validator<T>,
): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      throw new Error(`Invalid localStorage value for ${key}`);
    }

    return parsed as T;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
    return fallback;
  }
};
