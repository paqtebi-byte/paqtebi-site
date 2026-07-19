/**
 * Server-side proxy for the National Bank of Georgia (NBG) currency API.
 * Bypasses CORS restrictions by fetching from the backend.
 */

const NBG_API_URL = "https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json";

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("access-control-allow-origin", "*");
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.setHeader("access-control-allow-origin", "*");
    response.setHeader("access-control-allow-methods", "GET, OPTIONS");
    response.end();
    return;
  }

  if (request.method !== "GET") {
    return json(response, 405, { error: "Method not allowed" });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let nbgResponse;
    try {
      nbgResponse = await fetch(NBG_API_URL, {
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; paqtebi-proxy/1.0)",
          "accept": "application/json",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!nbgResponse.ok) {
      console.error(`[currency-proxy] NBG API responded with status ${nbgResponse.status}`);
      return json(response, 502, { error: `NBG API error: ${nbgResponse.status}` });
    }

    const data = await nbgResponse.json();

    if (!data || !data.length || !data[0]?.currencies) {
      console.error("[currency-proxy] Unexpected NBG API response format:", JSON.stringify(data).slice(0, 200));
      return json(response, 502, { error: "Invalid NBG API response format" });
    }

    const currencies = data[0].currencies;
    const usdItem = currencies.find(c => c.code === "USD");
    const eurItem = currencies.find(c => c.code === "EUR");

    console.log(`[currency-proxy] USD=${usdItem?.rate} EUR=${eurItem?.rate}`);

    return json(response, 200, {
      usd: usdItem ? { code: "USD", rate: usdItem.rate, diff: usdItem.diff } : null,
      eur: eurItem ? { code: "EUR", rate: eurItem.rate, diff: eurItem.diff } : null,
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("[currency-proxy] Fetch error:", error.message);
    return json(response, 502, {
      error: isTimeout ? "NBG API request timed out" : "Failed to fetch currency data",
    });
  }
}
