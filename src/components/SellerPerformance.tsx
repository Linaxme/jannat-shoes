import React, { useState } from 'react';
import { SalesRep, Order, Customer, UITheme, SystemConfig } from '../types';
import { formatTaka, toBnDigit, pairsToCartonText } from '../utils/formatters';
import { Users, Trophy, Target, TrendingUp, ShoppingBag, Banknote, Shield, CalendarDays, EyeOff } from 'lucide-react';

interface SellerPerformanceProps {
  sellers: SalesRep[];
  orders: Order[];
  customers: Customer[];
  activeTheme: UITheme;
  systemConfig?: SystemConfig;
}

export const SellerPerformance: React.FC<SellerPerformanceProps> = ({
  sellers,
  orders,
  customers,
  activeTheme,
  systemConfig,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');

  // Filter out any super admin maintenance accounts from seller list
  const activeSellers = sellers.filter(
    (s) => !s.id.toLowerCase().includes('super') && !s.name.toLowerCase().includes('সুপার')
  );

  // Compute local target date representations
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localNow = new Date(now.getTime() - (offset * 60 * 1000));
  const todayStr = localNow.toISOString().split('T')[0]; // YYYY-MM-DD

  // Filter orders based on the selected tracking period
  const periodOrders = orders.filter((order) => {
    if (!order.date) return false;
    if (selectedPeriod === 'all') return true;

    if (selectedPeriod === 'today') {
      return order.date === todayStr;
    }

    // Parse order date safely as local date
    const [year, month, day] = order.date.split('-').map(Number);
    const orderDateLocal = new Date(year, month - 1, day);
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (selectedPeriod === 'week') {
      const diffTime = todayLocal.getTime() - orderDateLocal.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7; // Last 7 days including today
    }

    if (selectedPeriod === 'month') {
      return orderDateLocal.getFullYear() === todayLocal.getFullYear() && orderDateLocal.getMonth() === todayLocal.getMonth();
    }

    if (selectedPeriod === 'year') {
      return orderDateLocal.getFullYear() === todayLocal.getFullYear();
    }

    return true;
  });

  // Calculate totals for the selected period
  const totalMemos = periodOrders.length;
  const totalPairs = periodOrders.reduce((sum, o) => sum + o.totalPairs, 0);
  const totalSales = periodOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  // Compute per-seller performance statistics
  const sellerStats = activeSellers.map((seller) => {
    const sellerOrders = periodOrders.filter((o) => o.sellerId === seller.id);
    const sellerCusts = customers.filter((c) => c.assignedSellerId === seller.id);

    const totalOrdersCount = sellerOrders.length;
    const totalPairsSold = sellerOrders.reduce((sum, o) => sum + o.totalPairs, 0);
    const totalSalesAmount = sellerOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCashCollected = sellerOrders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalNewDueIssued = sellerOrders.reduce((sum, o) => sum + o.dueAmount, 0);

    const currentCustomerDue = sellerCusts.reduce((sum, c) => sum + c.currentDue, 0);

    // Calculate period-adjusted target
    let targetPairs = seller.monthlyTargetPairs || 1000;
    if (selectedPeriod === 'today') {
      targetPairs = Math.max(1, Math.round(targetPairs / 30));
    } else if (selectedPeriod === 'week') {
      targetPairs = Math.max(1, Math.round(targetPairs / 4.35));
    } else if (selectedPeriod === 'year') {
      targetPairs = targetPairs * 12;
    }

    const targetProgressPercent = Math.min(100, Math.round((totalPairsSold / targetPairs) * 100));

    const estimatedCommission = Math.round((totalSalesAmount * seller.commissionRatePercent) / 100);

    return {
      seller,
      totalOrdersCount,
      totalPairsSold,
      totalSalesAmount,
      totalCashCollected,
      totalNewDueIssued,
      currentCustomerDue,
      targetPairs,
      targetProgressPercent,
      estimatedCommission,
    };
  });

  // Sort by total sales amount for leaderboard
  const leaderboard = [...sellerStats].sort((a, b) => b.totalSalesAmount - a.totalSalesAmount);

  if (systemConfig && systemConfig.enableSellerTracking === false) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center">
          <EyeOff className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-100">সেলার ট্র্যাকিং মডিউলটি বন্ধ রয়েছে</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            সুপার এডমিন সেটিংস থেকে বর্তমানে সেলার ট্র্যাকিং ও পারফরম্যান্স বিশ্লেষণ মডিউলটি নিষ্ক্রিয় করা আছে।
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          সেলার পারফরম্যান্স
        </h2>
        <p className="text-xs text-slate-300 mt-0.5">
          সেলার সেলস ও টার্গেট ট্র্যাক করুন।
        </p>
      </div>

      {/* Period Selection Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-300">সময়সীমা:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {[
            { id: 'today', label: 'আজ' },
            { id: 'week', label: '৭ দিন' },
            { id: 'month', label: 'এই মাস' },
            { id: 'year', label: 'এই বছর' },
            { id: 'all', label: 'সব' },
          ].map((tab) => {
            const isActive = selectedPeriod === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedPeriod(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Period Aggregates Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs text-slate-400">মোট মেমো (সেলস)</span>
          <div className="text-sm sm:text-lg font-black text-amber-400 mt-1">
            {toBnDigit(totalMemos)} টি
          </div>
        </div>
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs text-slate-400">মোট বিক্রীত জুতা</span>
          <div className="text-sm sm:text-lg font-black text-slate-200 mt-1">
            {toBnDigit(totalPairs)} জোড়া
          </div>
        </div>
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs text-slate-400">মোট বিক্রয় মূল্য</span>
          <div className="text-sm sm:text-lg font-black text-emerald-400 mt-1">
            {formatTaka(totalSales)}
          </div>
        </div>
      </div>

      {totalMemos === 0 && (
        <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-xs leading-relaxed animate-fadeIn">
          মনোনীত সময়সীমার মধ্যে কোনো সেলস রেকর্ড পাওয়া যায়নি। অন্য সময়সীমা ফিল্টার ট্রাই করুন।
        </div>
      )}

      {/* Temp Hidden Div to bypass the old header */}
      <div className="hidden">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          মাল্টি ইউজার ও সেলস রিপ্রেজেন্টেটিভ পারফরম্যান্স (সেলার পারফরম্যান্স)
        </h2>
        <p className="text-xs text-slate-300 mt-0.5">
          কে কত জোড়া জুতা বিক্রি করেছে, সংগৃহীত ক্যাশ এবং সেলার ভিত্তিক টার্গেট পূরণ ট্র্যাক করুন।
        </p>
      </div>

      {/* Leaderboard Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leaderboard.map((item, index) => {
          const isTop = index === 0;

          return (
            <div
              key={item.seller.id}
              className={`${activeTheme.cardClass} p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4`}
            >
              {isTop && (
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-3 py-1 rounded-bl-xl font-bold text-[10px] flex items-center gap-1 shadow">
                  <Trophy className="w-3.5 h-3.5" />
                  সেরা সেলার
                </div>
              )}

              <div>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow ${
                    isTop ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400 border border-slate-700'
                  }`}>
                    #{toBnDigit(index + 1)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{item.seller.name}</h3>
                    <p className="text-xs text-indigo-300">{item.seller.area}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-700/80 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">মোট বিক্রয়:</span>
                    <div className="font-black text-amber-300 text-sm">{formatTaka(item.totalSalesAmount)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">মোট বিক্রিত জুতা:</span>
                    <div className="font-bold text-slate-200">{toBnDigit(item.totalPairsSold)} জোড়া</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">সংগৃহীত ক্যাশ:</span>
                    <div className="font-bold text-emerald-400">{formatTaka(item.totalCashCollected)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">বাজার বাকী:</span>
                    <div className="font-bold text-rose-400">{formatTaka(item.currentCustomerDue)}</div>
                  </div>
                </div>
              </div>

              {/* Target Progress Bar */}
              {(!systemConfig || systemConfig.enableTargetSystem) && (
                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Target className="w-3 h-3 text-amber-400" />
                      {selectedPeriod === 'today' ? 'আজকের' : selectedPeriod === 'week' ? 'সাপ্তাহিক' : selectedPeriod === 'year' ? 'বার্ষিক' : 'মাসিক'} টার্গেট অগ্রগতি:
                    </span>
                    <span className="font-bold text-amber-300">{toBnDigit(item.targetProgressPercent)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.targetProgressPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    {toBnDigit(item.totalPairsSold)} / {toBnDigit(item.targetPairs)} জোড়া
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Detailed Seller Table */}
      <div className={`${activeTheme.cardClass} p-5 rounded-2xl`}>
        <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          বিক্রয়কর্মী ভিত্তিক পারফরম্যান্স বিস্তারিত
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-medium pb-2">
                <th className="pb-3">সেলার নাম ও মোবাইল</th>
                <th className="pb-3">রুট / এলাকা</th>
                <th className="pb-3 text-center">মেমো সংখ্যা</th>
                <th className="pb-3 text-center">বিক্রীত জোড়া</th>
                <th className="pb-3 text-right">মোট বিক্রি (৳)</th>
                <th className="pb-3 text-right">সংগৃহীত ক্যাশ (৳)</th>
                {(!systemConfig || systemConfig.enableCommissionSystem) && (
                  <th className="pb-3 text-right">অনুমোদিত কমিশন (৳)</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sellerStats.map((item) => (
                <tr key={item.seller.id} className="hover:bg-slate-800/40">
                  <td className="py-3 font-bold text-slate-100">{item.seller.name}</td>
                  <td className="py-3 text-slate-300">{item.seller.area}</td>
                  <td className="py-3 text-center font-semibold text-amber-300">
                    {toBnDigit(item.totalOrdersCount)} টি
                  </td>
                  <td className="py-3 text-center font-bold text-slate-200">
                    {toBnDigit(item.totalPairsSold)} জোড়া
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-400">
                    {formatTaka(item.totalSalesAmount)}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-200">
                    {formatTaka(item.totalCashCollected)}
                  </td>
                  {(!systemConfig || systemConfig.enableCommissionSystem) && (
                    <td className="py-3 text-right font-black text-amber-300">
                      {formatTaka(item.estimatedCommission)} ({toBnDigit(item.seller.commissionRatePercent)}%)
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
