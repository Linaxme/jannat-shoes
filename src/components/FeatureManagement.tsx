import React, { useState } from 'react';
import { SystemConfig, UserAccount, UITheme } from '../types';
import { Sliders, Settings2, Plus, Trash2, Layers, RefreshCw, Tag, AlertTriangle, Database } from 'lucide-react';

interface FeatureManagementProps {
  currentUser: UserAccount;
  systemConfig?: SystemConfig;
  activeTheme: UITheme;
  onUpdateSystemConfig: (newConfig: SystemConfig) => void;
  onClearDatabase?: () => Promise<void>;
}

export const FeatureManagement: React.FC<FeatureManagementProps> = ({
  currentUser,
  systemConfig,
  onUpdateSystemConfig,
  onClearDatabase,
}) => {
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showClearDbConfirm, setShowClearDbConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  if ((currentUser.role !== 'super_admin' && currentUser.role !== 'admin') || !systemConfig) {
    return (
      <div className="bg-slate-900 border border-rose-500/30 p-6 rounded-2xl text-center">
        <p className="text-rose-400 font-bold">অনুমতি নেই</p>
        <p className="text-slate-400 text-xs mt-2">এই পেজটি শুধুমাত্র এডমিনদের জন্য সংরক্ষিত।</p>
      </div>
    );
  }

  const defaultCategories = ['জেন্টস ফর্মাল', 'জেন্টস ক্যাজুয়াল', 'স্পোর্টস কেডস', 'লেডিস হিল/স্যান্ডেল', 'বাচ্চাদের জুতা'];
  const categoriesList = systemConfig.categories && systemConfig.categories.length > 0
    ? systemConfig.categories
    : defaultCategories;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    if (categoriesList.includes(trimmed)) {
      setCatError('এই ক্যাটাগরিটি ইতোমধ্যে যুক্ত আছে!');
      return;
    }

    const updated = [...categoriesList, trimmed];
    onUpdateSystemConfig({
      ...systemConfig,
      categories: updated,
    });
    setNewCategoryInput('');
    setCatError(null);
  };

  const confirmDeleteCategory = (catToDelete: string) => {
    if (categoriesList.length <= 1) {
      setCatError('কমপক্ষে একটি ক্যাটাগরি থাকতে হবে!');
      setDeletingCategory(null);
      return;
    }
    const updated = categoriesList.filter((c) => c !== catToDelete);
    onUpdateSystemConfig({
      ...systemConfig,
      categories: updated,
    });
    setDeletingCategory(null);
    setCatError(null);
  };

  const confirmResetCategories = () => {
    onUpdateSystemConfig({
      ...systemConfig,
      categories: defaultCategories,
    });
    setShowResetConfirm(false);
    setCatError(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">ক্যাটাগরি মুছে ফেলুন</h4>
                <p className="text-xs text-slate-400">আপনি কি নিশ্চিত?</p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              <span className="font-bold text-amber-400">"{deletingCategory}"</span> ক্যাটাগরিটি মুছে ফেলতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteCategory(deletingCategory)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Categories Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">ডিফল্ট ক্যাটাগরি রিস্টোর</h4>
                <p className="text-xs text-slate-400">আপনি কি নিশ্চিত?</p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              সকল ক্যাটাগরি রিস্টোর করে পূর্বের ডিফল্ট ক্যাটাগরি তালিকায় ফিরে যেতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={confirmResetCategories}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                হ্যাঁ, রিস্টোর করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Database Confirmation Modal */}
      {showClearDbConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/50 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">সকল ডাটা ক্লিয়ার করুন</h4>
                <p className="text-xs text-slate-400">সাবধান! এটি একটি স্থায়ী পদক্ষেপ</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি ডাটাবেজের সকল প্রোডাক্ট, মেমো/অর্ডার, কাস্টমার, বাকী তালিকা ও সেলস রিপোর্ট মুছে ফেলতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowClearDbConfirm(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={async () => {
                  if (onClearDatabase) {
                    setIsClearing(true);
                    await onClearDatabase();
                    setIsClearing(false);
                  }
                  setShowClearDbConfirm(false);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
              >
                {isClearing ? 'ক্লিয়ার হচ্ছে...' : 'হ্যাঁ, ক্লিয়ার করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              সেটিং ও ক্যাটাগরি ব্যবস্থাপনা (Admin Settings)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              ক্যাটাগরি নির্ধারণ এবং অ্যাপ্লিকেশনের বিভিন্ন মডিউল নিয়ন্ত্রণ করুন।
            </p>
          </div>
        </div>
      </div>

      {/* Clear Demo Data Card */}
      <div className="bg-slate-900 border border-rose-500/30 p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              ডাটাবেজ ক্লিয়ার ও ডেমো ডাটা রিমুভ (Clear All Data)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              ডাটাবেজ থেকে সমস্ত প্রোডাক্ট, মেমো/অর্ডার, কাস্টমার, বকেয়া ও সেলস রিপোর্ট ফাঁকা করুন।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowClearDbConfirm(true)}
          className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition shadow-lg shadow-rose-600/20 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          <span>সকল ডাটা ক্লিয়ার করুন</span>
        </button>
      </div>

      {/* Category Management Card */}
      <div className="bg-slate-900 border border-amber-500/30 p-5 sm:p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                প্রোডাক্ট ক্যাটাগরি সেটিং (Manage Categories)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                এখান থেকে সেট করা ক্যাটাগরিগুলো স্টক ইনপুট ড্রপডাউন এবং কাস্টমার ক্যাটালগে সরাসরি প্রদর্শিত হবে।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            title="ডিফল্ট ক্যাটাগরি রিস্টোর করুন"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>ডিফল্ট ক্যাটাগরি</span>
          </button>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Tag className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => {
                setNewCategoryInput(e.target.value);
                setCatError(null);
              }}
              placeholder="নতুন ক্যাটাগরির নাম লিখুন (যেমন: জুয়েলারি / কেডস / চামড়ার জুতা)..."
              className="w-full bg-slate-950 border border-slate-800 text-amber-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md shadow-amber-500/10 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ক্যাটাগরি যুক্ত করুন</span>
          </button>
        </form>

        {catError && (
          <p className="text-rose-400 text-xs font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{catError}</span>
          </p>
        )}

        {/* Active Categories Chips */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold text-slate-300">
            বর্তমান সক্রিয় ক্যাটাগরি সমূহ ({categoriesList.length} টি):
          </label>
          <div className="flex flex-wrap gap-2">
            {categoriesList.map((cat, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-200 group hover:border-slate-700 transition"
              >
                <span className="text-amber-400">•</span>
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCatError(null);
                    setDeletingCategory(cat);
                  }}
                  className="text-slate-500 hover:text-rose-400 transition p-1 rounded cursor-pointer hover:bg-rose-500/10"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Switches & Controls (Super Admin Only) */}
      {currentUser.role === 'super_admin' && (
        <div className="bg-slate-900 border border-purple-500/20 p-5 sm:p-6 rounded-2xl shadow-xl space-y-6">
          
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                ফিচার সুইচ ও কন্ট্রোলস (সুপার এডমিন)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                যেকোনো অপশন পরিবর্তন করার সাথে সাথে তা সমগ্র অ্যাপ্লিকেশনে কার্যকর হয়ে যাবে।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Toggle 1: Seller Tracking */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>সেলার ট্র্যাকিং মডিউল</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  সেলারদের দৈনিক, সাপ্তাহিক, মাসিক বা বার্ষিক সেলস ও অগ্রগতি ট্র্যাক করার মডিউল ড্যাশবোর্ড থেকে হাইড বা শো করুন।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, enableSellerTracking: !systemConfig.enableSellerTracking })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.enableSellerTracking ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.enableSellerTracking ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 2: Target System */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>সেলার মাসিক টার্গেট</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  সেলারদের জন্য মাসিক টার্গেট (জোড়া) সেট করা ও পূরণ স্ট্যাটাস বা অগ্রগতি দেখার বার দেখাবে কিনা নির্ধারণ করুন।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, enableTargetSystem: !systemConfig.enableTargetSystem })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.enableTargetSystem ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.enableTargetSystem ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 3: Commission System */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>সেলার কমিশন সিস্টেম</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  সেলারদের জন্য নির্দিষ্ট শতাংশ বা পারসেন্টেজ হারে স্বয়ংক্রিয় কমিশন হিসাব করার সুবিধা অন বা অফ করে রাখুন।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, enableCommissionSystem: !systemConfig.enableCommissionSystem })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.enableCommissionSystem ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.enableCommissionSystem ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 4: Sample Booking */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>স্যাম্পল অর্ডার বুকিং</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  মার্কেট থেকে স্যাম্পল বুকিং নেওয়া ও পরে সরাসরি মেমোতে রূপান্তর করার সিস্টেমটি মেমো পেজে দেখাবে কিনা।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, enableSampleBooking: !systemConfig.enableSampleBooking })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.enableSampleBooking ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.enableSampleBooking ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 5: Stock Alerts */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>কম স্টক সতর্কতা (Alerts)</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  জুতা বা জুতার সাইজ থ্রেশহোল্ডের নিচে নামলে ড্যাশবোর্ডে লাল ওয়ার্নিং স্ট্যাটাস বা সতর্কতা দেখানোর অপশন।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, enableStockAlerts: !systemConfig.enableStockAlerts })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.enableStockAlerts ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.enableStockAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 6: Profit & Financials */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>ক্রয়মূল্য ও লাভ হিসাব</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  পণ্যের গুদাম ক্রয়মূল্য সেট ও মেমো থেকে আনুমানিক মোট গ্রস লাভ হিসাব করার ফিচার ড্যাশবোর্ডে সচল করুন।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, enableProfitCalculation: !systemConfig.enableProfitCalculation })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.enableProfitCalculation ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.enableProfitCalculation ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 7: Auto SMS & SMS Panel */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>অটোমেটিক SMS ও SMS প্যানেল</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  মেমো ডেলিভারি, বকেয়া জমা ও তাগদার স্বয়ংক্রিয় SMS সার্ভিস এবং ড্রয়ার মেনুর SMS প্যানেল ফিচারটি সচল/অফ রাখুন।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, enableSMS: systemConfig.enableSMS === false ? true : false })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.enableSMS !== false ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.enableSMS !== false ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 8: Guest Catalog Browsing & Order */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>লগইন ছাড়া ক্যাটালগ ব্রাউজ ও অর্ডার অনুমতি</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  অন থাকলে দোকানদাররা অ্যাকাউন্ট লগইন না করলেও ক্যাটালগ দেখতে ও অর্ডার করতে পারবে। অফ থাকলে ক্যাটালগ দেখতে ও অর্ডার করতে অবশ্যই লগইন করতে হবে।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, allowGuestBrowsingAndOrder: systemConfig.allowGuestBrowsingAndOrder === false ? true : false })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.allowGuestBrowsingAndOrder !== false ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.allowGuestBrowsingAndOrder !== false ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 9: Allow Seller to see financials */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60 col-span-1 md:col-span-2">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>সেলারদের ক্রয়মূল্য ও আর্থিক লাভ দেখার অনুমতি</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  অন থাকলে সেলাররাও ড্যাশবোর্ড বা স্টক লিস্টে জুতার আসল ক্রয়মূল্য ও মোট গ্রস লাভ-লোকসানের বিবরণী দেখতে পারবে। (ক্রয়মূল্য ও লাভ হিসাব অপশনটি অবশ্যই সচল থাকতে হবে)।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, allowSellerToSeeFinancials: !systemConfig.allowSellerToSeeFinancials })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.allowSellerToSeeFinancials && systemConfig.enableProfitCalculation ? 'bg-purple-600' : 'bg-slate-700'}`}
                disabled={!systemConfig.enableProfitCalculation}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.allowSellerToSeeFinancials && systemConfig.enableProfitCalculation ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

          </div>

          {/* Section 2: Seller Limits & Access Control */}
          <div className="flex items-center gap-2.5 pt-4 pb-4 border-t border-b border-slate-800 mt-6">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                সেলারদের এক্সেস ও লিমিট কন্ট্রোল (Seller Access & Limitations)
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-400 mt-0.5 font-medium">
                সেলার ইউজারদের জন্য কি কি ডাটা বা পেজ দেখার অনুমতি থাকবে তা এখান থেকে সীমাবদ্ধ করে দিন।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">

            {/* Limit 1: Other Sellers Sales */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>অন্য সেলারদের বিক্রয় ইতিহাস দেখার অনুমতি</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  অন থাকলে সেলাররা অন্য সব সেলারদের করা মেমো ও অর্ডার দেখতে পারবে। অফ থাকলে সেলাররা শুধুমাত্র তাদের নিজেদের বিক্রি করা মেমো বা অর্ডার দেখতে পারবে।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, allowSellerToSeeOtherSellersSales: !systemConfig.allowSellerToSeeOtherSellersSales })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.allowSellerToSeeOtherSellersSales ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.allowSellerToSeeOtherSellersSales ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Limit 2: Other Sellers Due */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>অন্য সেলারদের বাকী খাতা দেখার অনুমতি</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  অন থাকলে সেলাররা অন্য সব কাস্টমারদের বকেয়া বা বাকী দেখতে পারবে। অফ থাকলে সেলাররা শুধুমাত্র তাদের আন্ডারে বা রুটে থাকা কাস্টমারদের বকেয়া দেখতে ও কালেকশন করতে পারবে।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, allowSellerToSeeOtherSellersDue: !systemConfig.allowSellerToSeeOtherSellersDue })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.allowSellerToSeeOtherSellersDue ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.allowSellerToSeeOtherSellersDue ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Limit 3: Edit/Delete/Restock Products */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>জুতার স্টক বা তথ্য এডিট করার অনুমতি</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  অন থাকলে সেলাররা নতুন জুতা যোগ করতে, রি-স্টক বা এডিট/ডিলিট করতে পারবে। অফ থাকলে সেলাররা শুধুমাত্র মজুদ জোড়া বা সাইজ দেখতে পারবে কিন্তু কোনো পরিবর্তন করতে পারবে না।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, allowSellerToEditStock: !systemConfig.allowSellerToEditStock })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.allowSellerToEditStock ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.allowSellerToEditStock ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Limit 4: Access User & Seller ID account lists */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start justify-between gap-4 transition-all hover:border-slate-700/60">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>ইউজার ও সেলার আইডি পেজ দেখার অনুমতি</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  অন থাকলে সেলাররা ইউজার ও সেলার আইডি পেজটি দেখতে পারবে। অফ থাকলে এই পেজটি সেলারদের ড্রয়ার মেনু থেকে সম্পূর্ণ লুকানো (Hide) থাকবে।
                </div>
              </div>
              <button
                onClick={() => onUpdateSystemConfig({ ...systemConfig, allowSellerToManageUsers: !systemConfig.allowSellerToManageUsers })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemConfig.allowSellerToManageUsers ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${systemConfig.allowSellerToManageUsers ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
