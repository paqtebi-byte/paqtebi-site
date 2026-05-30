import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Euro } from 'lucide-react';

export const CurrencyWidget: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-right duration-700 delay-100">
      
      {/* USD */}
      <div className="flex items-center gap-3 text-white group cursor-default">
        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
            <DollarSign size={20} className="text-green-400 drop-shadow-md" />
        </div>
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold drop-shadow-md">2.7150</span>
                <TrendingUp size={14} className="text-green-400" />
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
                <span className="text-xl font-bold drop-shadow-md">2.9430</span>
                <TrendingDown size={14} className="text-red-400" />
            </div>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-medium drop-shadow-md">EUR / GEL</span>
        </div>
      </div>

    </div>
  );
};