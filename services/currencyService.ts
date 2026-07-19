export interface CurrencyRate {
  code: string;
  rate: number;
  diff: number;
}

export interface CurrencyData {
  usd: CurrencyRate | null;
  eur: CurrencyRate | null;
}

/**
 * Fetches current exchange rates via the server-side proxy (/api/currency-proxy).
 * Direct browser requests to nbg.gov.ge are blocked by CORS, so we route
 * through our backend which fetches on the server and returns the result.
 */
export const fetchCurrencyData = async (): Promise<CurrencyData | null> => {
  try {
    const response = await fetch("/api/currency-proxy");
    if (!response.ok) {
      throw new Error(`Currency proxy responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data || (!data.usd && !data.eur)) {
      throw new Error("Invalid currency proxy response");
    }

    return {
      usd: data.usd ?? null,
      eur: data.eur ?? null,
    };
  } catch (error) {
    console.error("Error fetching currency data:", error);
    return null;
  }
};
