import React, { useEffect, useState } from "react";
import {
  Cloud,
  CloudRain,
  Sun,
  CloudSnow,
  CloudLightning,
  Wind,
  Moon,
} from "lucide-react";
import { fetchWeatherData } from "../services/weatherService";
import { WeatherData } from "../types";

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const getData = async () => {
      try {
        const data = await fetchWeatherData();
        setWeather(data);
      } finally {
        setLoading(false);
      }
    };

    getData();

    // Check if it's night time (6 PM - 6 AM)
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsNight(hour >= 18 || hour < 6);
    };

    checkTime();
    // Update every minute to check if day/night changed
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (code: number) => {
    // For clear weather, show moon at night, sun during day
    if (code <= 1) {
      if (isNight) {
        return <Moon className="text-blue-200 drop-shadow-lg" size={48} />;
      }
      return <Sun className="text-yellow-400 drop-shadow-lg" size={48} />;
    }
    if (code <= 3)
      return <Cloud className="text-gray-200 drop-shadow-lg" size={48} />;
    if (code <= 67)
      return <CloudRain className="text-blue-300 drop-shadow-lg" size={48} />;
    if (code <= 77)
      return <CloudSnow className="text-white drop-shadow-lg" size={48} />;
    if (code <= 99)
      return (
        <CloudLightning className="text-yellow-200 drop-shadow-lg" size={48} />
      );

    // Default fallback
    if (isNight) {
      return <Moon className="text-blue-200 drop-shadow-lg" size={48} />;
    }
    return <Sun className="text-yellow-400 drop-shadow-lg" size={48} />;
  };

  const getWeatherLabel = (code: number) => {
    if (code <= 1) {
      return isNight ? "ღამე" : "მზიანი";
    }
    if (code <= 3) return "მოღრუბლული";
    if (code <= 67) return "წვიმა";
    if (code <= 77) return "თოვლი";
    if (code <= 99) return "ჭექა-ქუხილი";
    return isNight ? "ღამე" : "მზიანი";
  };

  if (loading) {
    return (
      <div
        className="text-white flex flex-col items-end animate-pulse"
        aria-busy="true"
        aria-label="ამინდის პროგნოზი იტვირთება"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end space-y-2">
            <div className="h-10 w-16 bg-white/20 rounded-sm"></div>
            <div className="h-4 w-20 bg-white/20 rounded-sm"></div>
          </div>
          <div className="h-12 w-12 bg-white/20 rounded-full"></div>
        </div>
        <div className="h-3 w-32 bg-white/20 rounded-sm mt-2"></div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="text-white flex flex-col items-end animate-in fade-in slide-in-from-right duration-700">
      <div
        className="flex items-center gap-3"
        role="status"
        aria-label={`ამინდი: ${weather.temp} გრადუსი, ${getWeatherLabel(weather.code)}`}
      >
        <div className="flex flex-col items-end">
          <span className="text-5xl font-bold drop-shadow-md tracking-tighter">
            {weather.temp}°
          </span>
          <span className="text-sm font-medium drop-shadow-md opacity-90">
            {getWeatherLabel(weather.code)}
          </span>
        </div>
        <div className="animate-pulse-slow pb-2" aria-hidden="true">
          {getWeatherIcon(weather.code)}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium drop-shadow-md mt-1 opacity-80">
        <span>თბილისი</span>
        <span aria-hidden="true">•</span>
        <div
          className="flex items-center gap-1"
          aria-label={`ქარის სიჩქარე: ${weather.windSpeed} კილომეტრი საათში`}
        >
          <Wind size={12} aria-hidden="true" />
          <span>{weather.windSpeed} კმ/სთ</span>
        </div>
      </div>
    </div>
  );
};
