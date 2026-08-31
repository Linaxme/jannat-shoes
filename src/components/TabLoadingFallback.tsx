import React from 'react';
import { Loader2 } from 'lucide-react';

export const TabLoadingFallback: React.FC = () => {
  return (
    <div className="w-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-xs font-semibold text-slate-300">লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</div>
        <div className="text-[10px] text-slate-500">মডিউল প্রস্তুত হচ্ছে</div>
      </div>
    </div>
  );
};
