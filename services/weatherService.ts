import { WeatherData } from "../types";

const WEATHER_API_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=41.6941&longitude=44.8337&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto";

/**
 * Fetches current weather data for Tbilisi
 * @returns Promise resolving to WeatherData object
 */
export const fetchWeatherData = async (): Promise<WeatherData> => {
  try {
    const response = await fetch(WEATHER_API_URL);
    if (!response.ok) {
      throw new Error(
        `Weather API request failed with status ${response.status}`,
      );
    }

    const data = await response.json();

    // Map the API response to our WeatherData type
    return {
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      windSpeed: Math.round(data.current.wind_speed_10m),
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    // Return default values in case of error
    return {
      temp: 15, // Default temperature
      code: 1, // Clear sky code
      windSpeed: 5, // Default wind speed
    };
  }
};
