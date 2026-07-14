import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Euro, Minus } from 'lucide-react';
import { fetchCurrencyData, CurrencyData } from '../services/currencyService';

export const CurrencyWidget: React.FC = () => {
  const [data, setData] = useState<CurrencyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const getData = async () => {
      try {
        const result = await fetchCurrencyData();
        if (active) {
          setData(result);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    getData();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 transition-opacity duration-700 delay-100 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20"></div>
          <div className="flex flex-col space-y-2">
            <div className="h-5 w-16 bg-white/20 rounded-sm"></div>
            <div className="h-3 w-12 bg-white/20 rounded-sm"></div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-full bg-white/20"></div>
          <div className="flex flex-col space-y-2">
            <div className="h-5 w-16 bg-white/20 rounded-sm"></div>
            <div className="h-3 w-12 bg-white/20 rounded-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  const renderTrend = (diff?: number) => {
    if (!diff) return <Minus size={14} className="text-gray-400" />;
    if (diff > 0) return <TrendingUp size={14} className="text-green-400" />;
    return <TrendingDown size={14} className="text-red-400" />;
  };

  const renderRate = (rate?: number) => {
    if (!rate) return <span className="text-xl font-bold drop-shadow-md text-gray-400">---</span>;
    return <span className="text-xl font-bold drop-shadow-md">{rate.toFixed(4)}</span>;
  };

  return (
    <div className="flex flex-col gap-2 transition-opacity duration-700 delay-100">
      
      {/* USD */}
      <div className="flex items-center gap-3 text-white group cursor-default">
        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
            <DollarSign size={20} className="text-green-400 drop-shadow-md" />
        </div>
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                {renderRate(data?.usd?.rate)}
                {renderTrend(data?.usd?.diff)}
            </div>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-medium drop-shadow-md">USD / GEL</span>
        </div>
      </div>

      {/* EUR */}
      <div className="flex items-center gap-3 text-white group cursor-default">
        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <Euro size={20} className="text-blue-400 drop-shadow-md" />
        </div>
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                {renderRate(data?.eur?.rate)}
                {renderTrend(data?.eur?.diff)}
            </div>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-medium drop-shadow-md">EUR / GEL</span>
        </div>
      </div>

    </div>
  );
};