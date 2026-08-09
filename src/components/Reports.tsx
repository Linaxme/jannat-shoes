import React, { useState } from 'react';
import { Order, ShoeProduct, UITheme } from '../types';
import { formatTaka, toBnDigit, formatBnDate } from '../utils/formatters';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  ShoppingBag,
  Percent,
  Download,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface ReportsProps {
  orders: Order[];
  products: ShoeProduct[];
  activeTheme: UITheme;
}

export const Reports: React.FC<ReportsProps> = ({ orders, products, activeTheme }) => {
  const [timeRange, setTimeRange] = useState<'today' | 'month' | 'year' | 'all'>('month');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentYearMonth = todayStr.substring(0, 7); // "2026-07"
  const currentYear = todayStr.substring(0, 4); // "2026"

  // Filter orders by time range
  const filteredOrders = orders.filter((o) => {
    if (timeRange === 'today') return o.date === todayStr;
    if (timeRange === 'month') return o.date.startsWith(currentYearMonth);
    if (timeRange === 'year') return o.date.startsWith(currentYear);
    return true;
  });

  // Financial Metrics
  const totalSalesRevenue = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalCashCollected = filteredOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalNewDue = filteredOrders.reduce((sum, o) => sum + o.dueAmount, 0);
  const totalDiscounts = filteredOrders.reduce((sum, o) => sum + o.discount, 0);
  const totalPairsSold = filteredOrders.reduce((sum, o) => sum + o.totalPairs, 0);

  // Calculate Product Cost (COGS) for gross profit
  let totalCostOfGoodsSold = 0;
  filteredOrders.forEach((o) => {
    o.items.forEach((item) => {
      totalCostOfGoodsSold += item.totalPairs * item.unitBuyPrice;
    });
  });

  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
  const profitMarginPercent = totalSalesRevenue > 0 ? Math.round((grossProfit / totalSalesRevenue) * 100) : 0;

  // Prepare chart data grouped by date
  const dateMap: Record<string, { date: string; sales: number; cash: number; pairs: number }> = {};
  filteredOrders.forEach((o) => {
    if (!dateMap[o.date]) {
      dateMap[o.date] = { date: formatBnDate(o.date), sales: 0, cash: 0, pairs: 0 };
    }
    dateMap[o.date].sales += o.grandTotal;
    dateMap[o.date].cash += o.paidAmount;
    dateMap[o.date].pairs += o.totalPairs;
  });

  const chartData = Object.values(dateMap);

  // Top selling shoe items
  const productSalesMap: Record<string, { code: string; name: string; pairs: number; revenue: number }> = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          code: item.articleCode,
          name: item.productName,
          pairs: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].pairs += item.totalPairs;
      productSalesMap[item.productId].revenue += item.totalAmount;
    });
  });

  const topSellingProducts = Object.values(productSalesMap).sort((a, b) => b.pairs - a.pairs);

  return (
    <div className="space-y-6">
      
      {/* Header & Range Selector */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            লাভ-ক্ষতি রিপোর্ট
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            বিক্রি, খরচ ও মুনাফার বিশ্লেষণ।
          </p>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === 'today' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            আজ
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === 'month' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            এই মাস
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === 'year' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            এই বছর
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            সব
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className={`${activeTheme.cardClass} p-4 rounded-2xl`}>
          <p className="text-xs text-slate-400 font-medium">মোট বিক্রয়</p>
          <h3 className="text-2xl font-black text-amber-300 mt-1">{formatTaka(totalSalesRevenue)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            মোট বিক্রীত জুতা: <span className="font-bold text-slate-200">{toBnDigit(totalPairsSold)} জোড়া</span>
          </p>
        </div>

        <div className={`${activeTheme.cardClass} p-4 rounded-2xl`}>
          <p className="text-xs text-slate-400 font-medium">মোট ক্রয়মূল্য</p>
          <h3 className="text-2xl font-black text-rose-400 mt-1">{formatTaka(totalCostOfGoodsSold)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">জুতা ক্রয়ে মোট খরচ</p>
        </div>

        <div className={`${activeTheme.cardClass} p-4 rounded-2xl`}>
          <p className="text-xs text-slate-400 font-medium">মোট লাভ</p>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatTaka(grossProfit)}</h3>
          <p className="text-[11px] text-slate-300 mt-1 font-semibold">
            লাভের হার: <span className="text-amber-300">{toBnDigit(profitMarginPercent)}%</span>
          </p>
        </div>

        <div className={`${activeTheme.cardClass} p-4 rounded-2xl`}>
          <p className="text-xs text-slate-400 font-medium">ক্যাশ ও বাকী</p>
          <h3 className="text-xl font-black text-emerald-300 mt-1">{formatTaka(totalCashCollected)}</h3>
          <p className="text-[11px] text-rose-400 font-semibold mt-1">
            নতুন বাকী: {formatTaka(totalNewDue)}
          </p>
        </div>

      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Recharts Bar Chart (8 cols) */}
        <div className={`lg:col-span-8 ${activeTheme.cardClass} p-5 rounded-2xl space-y-4`}>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            বিক্রি ও ক্যাশ ট্রেন্ড
          </h3>
          <div className="h-72 w-full pt-2">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                কোনো ডাটা নেই।
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="sales" name="বিক্রয় (৳)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cash" name="ক্যাশ (৳)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Top Selling Shoe Items (4 cols) */}
        <div className={`lg:col-span-4 ${activeTheme.cardClass} p-5 rounded-2xl space-y-4`}>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            সেরা মডেল
          </h3>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {topSellingProducts.map((p, idx) => (
              <div
                key={p.code}
                className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">
                    <span className="text-amber-400 font-mono">#{idx + 1}</span> {p.code}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{p.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-amber-300">{toBnDigit(p.pairs)} জোড়া</div>
                  <div className="text-[10px] text-emerald-400">{formatTaka(p.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
