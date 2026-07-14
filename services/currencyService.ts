export interface CurrencyRate {
  code: string;
  rate: number;
  diff: number;
}

export interface CurrencyData {
  usd: CurrencyRate | null;
  eur: CurrencyRate | null;
}

const NBG_API_URL = "https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json";

/**
 * Fetches current exchange rates from the National Bank of Georgia (NBG).
 * NBG updates rates once per day (published in the afternoon, effective the next day).
 */
export const fetchCurrencyData = async (): Promise<CurrencyData | null> => {
  try {
    const response = await fetch(NBG_API_URL);
    if (!response.ok) {
      throw new Error(`NBG API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.length || !data[0].currencies) {
      throw new Error("Invalid NBG API response format");
    }

    const currencies = data[0].currencies as any[];
    const usdItem = currencies.find(c => c.code === "USD");
    const eurItem = currencies.find(c => c.code === "EUR");

    if (!usdItem && !eurItem) {
      throw new Error("USD and EUR rates not found in NBG response");
    }

    return {
      usd: usdItem ? { code: "USD", rate: usdItem.rate, diff: usdItem.diff } : null,
      eur: eurItem ? { code: "EUR", rate: eurItem.rate, diff: eurItem.diff } : null,
    };
  } catch (error) {
    console.error("Error fetching currency data:", error);
    // Return null to allow the UI to handle the error state gracefully
    return null;
  }
};
