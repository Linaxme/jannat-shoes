import React from 'react';
import { UITheme, UIThemeId } from '../types';
import { UI_THEMES } from '../data/initialData';
import {
  Sparkles,
  Palette,
  Check,
  Layout,
  Smartphone,
  ShieldCheck,
  Zap,
  Printer,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';

interface UIDesignShowcaseProps {
  activeThemeId: UIThemeId;
  onSelectTheme: (themeId: UIThemeId) => void;
  onCloseShowcase?: () => void;
}

export const UIDesignShowcase: React.FC<UIDesignShowcaseProps> = ({
  activeThemeId,
  onSelectTheme,
}) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-slate-950/40 backdrop-blur-md px-3.5 py-1 rounded-full text-amber-200 border border-amber-400/30 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-amber-300" />
            পাইকারি জুতা ব্যবসার জন্য বিশেষায়িত UI & UX ডিজাইন
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            মার্কেট-পরীক্ষিত ও আধুনিক UI ডিজাইন গ্যালারি
          </h2>
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
            ফুলবাড়িয়া, বাদামতলী, কান্দিরপাড় ও চট্টগ্রাম বিআরটিসি পাইকারি জুতা বাজারের বাস্তব কাজের ধরণ অনুযায়ী তৈরি। 
            উচ্চ-কন্ট্রাস্ট কালার, বড় টাচ টার্গেট এবং দ্রুত ক্যাশ মেমো জেনারেট করার সুবিধা সম্বলিত থিম থেকে আপনার পছন্দের ডিজাইন সিলেক্ট করুন।
          </p>
        </div>
      </div>

      {/* 3 Theme Options Showcase */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-amber-400" />
          উপলব্ধ UI কালার থিমসমূহ (Theme Options)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {UI_THEMES.map((theme) => {
            const isSelected = activeThemeId === theme.id;

            return (
              <div
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-4 relative border-2 ${
                  isSelected
                    ? 'border-amber-400 bg-slate-900 shadow-2xl scale-[1.02]'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-amber-400 text-slate-950 p-1 rounded-full shadow">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
                    {theme.nameEn}
                  </div>
                  <h4 className="text-base font-bold text-white">{theme.nameBn}</h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{theme.descBn}</p>

                  {/* UI Palette Swatches */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700" title="Background" />
                    <div className="w-6 h-6 rounded-full bg-indigo-600 border border-indigo-400" title="Primary Accent" />
                    <div className="w-6 h-6 rounded-full bg-amber-500 border border-amber-300" title="Gold Accent" />
                    <div className="w-6 h-6 rounded-full bg-emerald-500 border border-emerald-300" title="Cash/Profit Accent" />
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTheme(theme.id);
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-lg'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {isSelected ? 'বর্তমান এক্টিভ থিম' : 'এই থিম সিলেক্ট করুন'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* UI & UX Craft Rationale Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layout className="w-5 h-5 text-amber-400" />
          এই অ্যাপের বিশেষ UI & UX ডিজাইন বৈচিত্র্য (Design Features)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg w-fit">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-100 text-sm">জোড়া ও ডজন অটো-ক্যালকুলেটর</h4>
            <p className="text-slate-400">
              পাইকারি মার্কেটের চাহিদা অনুযায়ী ১ ক্লিক এ ডজন (১২ জোড়া) বা আলাদা জোড়া নির্বাচন ও অটোমেটিক মোট টাকা হিসাব।
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg w-fit">
              <Printer className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-100 text-sm">প্রিন্ট-রেডি ক্যাশ মেমো</h4>
            <p className="text-slate-400">
              দোকানের নাম, চালানের আইটেম, পূর্বের বাকী ও নতুন নেট বাকী সহ ১ ক্লিকে প্রিন্ট এবং পেপার কাস্টমাইজেশন।
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="p-2 bg-rose-500/20 text-rose-300 rounded-lg w-fit">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-100 text-sm">সেলার ভিত্তিক বাকী খাতা</h4>
            <p className="text-slate-400">
              কোন সেলারের কোন কাস্টমারের আন্ডারে কত টাকা বাকী রয়েছে তা স্পষ্ট ফিল্টারিং এবং হোয়াটসঅ্যাপে মেসেজ কপি সুবিধা।
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg w-fit">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-100 text-sm">মোবাইল ও পিসিতে সমান রেসপন্সিভ</h4>
            <p className="text-slate-400">
              শোরুমের কাউন্টারে ডেস্কটপ, কিংবা বাজারে চলাকালীন মোবাইলেও ৪৪ পিক্সেল+ টাচ ফ্রেন্ডলি কন্ট্রোল।
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
