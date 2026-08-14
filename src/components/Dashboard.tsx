import React, { useState } from 'react';
import { Order, ShoeProduct, Customer, UserAccount, SystemConfig } from '../types';
import { NavTab } from './Navigation';
import { formatTaka, toBnDigit, pairsToCartonText } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Banknote,
  Boxes,
  TrendingUp,
  Receipt,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  LayoutDashboard,
} from 'lucide-react';

interface DashboardProps {
  orders: Order[];
  products: ShoeProduct[];
  customers: Customer[];
  currentUser?: UserAccount | null;
  systemConfig?: SystemConfig;
  activeTheme?: any;
  onNavigate: (tab: NavTab) => void;
  onSelectOrderForInvoice: (order: Order) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  products,
  customers,
  currentUser,
  systemConfig,
  onNavigate,
  onSelectOrderForInvoice,
}) => {
  const { t } = useLanguage();
  const [showProfitAmount, setShowProfitAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('show_gross_profit_amount');
      return saved !== 'false';
    }
    return true;
  });

  const toggleProfitAmount = () => {
    setShowProfitAmount((prev) => {
      const next = !prev;
      localStorage.setItem('show_gross_profit_amount', String(next));
      return next;
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate metrics
  const todayOrders = orders.filter((o) => o.date === todayStr);

  const todayTotalSales = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const todayCollectedCash = todayOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const todayNewDue = todayOrders.reduce((sum, o) => sum + o.dueAmount, 0);
  const todayTotalPairs = todayOrders.reduce((sum, o) => sum + o.totalPairs, 0);

  const totalMarketDue = customers.reduce((sum, c) => sum + c.currentDue, 0);
  const totalStockPairs = products.reduce((sum, p) => sum + p.stockPairs, 0);

  const canSeeProfit = !!(
    currentUser &&
    (currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      (currentUser.role === 'seller' && systemConfig?.allowSellerToSeeFinancials))
  );

  const showProfit = !!(!systemConfig || systemConfig.enableProfitCalculation === undefined || (systemConfig.enableProfitCalculation && canSeeProfit));

  const todayGrossProfit = showProfit
    ? todayOrders.reduce((sum, order) => {
        const orderCost = order.items.reduce((itemSum, item) => {
          const prod = products.find((p) => p.id === item.productId || p.articleCode === item.articleCode);
          const buyPrice = prod?.buyPrice || 0;
          return itemSum + buyPrice * item.totalPairs;
        }, 0);
        return sum + (order.grandTotal - orderCost);
      }, 0)
    : 0;

  const totalGrossProfit = showProfit
    ? orders.reduce((sum, order) => {
        const orderCost = order.items.reduce((itemSum, item) => {
          const prod = products.find((p) => p.id === item.productId || p.articleCode === item.articleCode);
          const buyPrice = prod?.buyPrice || 0;
          return itemSum + buyPrice * item.totalPairs;
        }, 0);
        return sum + (order.grandTotal - orderCost);
      }, 0)
    : 0;

  const lowStockProducts = products.filter((p) => p.stockPairs <= p.minStockAlert);

  const recentOrders = [...orders]
    .sort((a, b) => {
      const keyA = `${a.date || ''} ${a.time || ''} ${a.memoNo || a.id}`;
      const keyB = `${b.date || ''} ${b.time || ''} ${b.memoNo || b.id}`;
      return keyB.localeCompare(keyA);
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Minimal Dashboard Header */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-black text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-amber-400" />
            ড্যাশবোর্ড
          </span>
          <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-slate-800 to-transparent flex-1" />
        </div>

        <button
          onClick={() => onNavigate('pos')}
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>নতুন মেমো</span>
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showProfit ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-4'} gap-4`}>
        
        {/* Card 1: Today Sales */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('today_sales')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
              {formatTaka(todayTotalSales)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('total_memos')}: <span className="text-slate-200 font-semibold">{toBnDigit(todayOrders.length)} টি</span>
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Today Cash Collected */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('collected_cash')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
              {formatTaka(todayCollectedCash)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('today_due')}: <span className="text-rose-400 font-semibold">{formatTaka(todayNewDue)}</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Today Sold Pairs */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('sold_pairs')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-indigo-300 mt-1">
              {toBnDigit(todayTotalPairs)} <span className="text-xs font-normal text-slate-300">{t('pairs')}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('dozen')}: <span className="text-slate-200 font-semibold">{pairsToCartonText(todayTotalPairs, 12)}</span>
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Market Due */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('market_due')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-rose-400 mt-1">
              {formatTaka(totalMarketDue)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('customers')}: <span className="text-slate-200 font-semibold">{toBnDigit(customers.length)} জন</span>
            </p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Today gross profit (Conditional) */}
        {showProfit && (
          <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-purple-500/5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  আজকের লাভ
                  <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                </p>
                <button
                  type="button"
                  onClick={toggleProfitAmount}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title={showProfitAmount ? "লাভ হাইড করুন" : "লাভ দেখান"}
                >
                  {showProfitAmount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-purple-400 mt-1 truncate">
                {showProfitAmount ? formatTaka(todayGrossProfit) : '৳ ••••••'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('profit_loss_calc')}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Card 6: Total gross profit (Conditional) */}
        {showProfit && (
          <div className="bg-slate-900 border border-fuchsia-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-fuchsia-500/5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-400">মোট লাভ</p>
                <button
                  type="button"
                  onClick={toggleProfitAmount}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title={showProfitAmount ? "লাভ হাইড করুন" : "লাভ দেখান"}
                >
                  {showProfitAmount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-fuchsia-400 mt-1 truncate">
                {showProfitAmount ? formatTaka(totalGrossProfit) : '৳ ••••••'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('total_profit')}
              </p>
            </div>
            <div className="p-3 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl flex-shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        )}

      </div>

      {/* Main Grid: Recent Sales & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              {t('recent_memos')}
            </h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1"
            >
              {t('see_all')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[520px] w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium pb-2">
                  <th className="pb-2.5 pr-2">{t('memo_no')}</th>
                  <th className="pb-2.5 px-2">{t('shop_customer')}</th>
                  <th className="pb-2.5 px-2">{t('pairs')}</th>
                  <th className="pb-2.5 px-2">{t('total_bill')}</th>
                  <th className="pb-2.5 px-2">{t('status')}</th>
                  <th className="pb-2.5 pl-2 text-right">{t('memo')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 pr-2 font-mono font-bold text-amber-300">{ord.memoNo}</td>
                    <td className="py-3 px-2 font-semibold text-slate-200">
                      {ord.shopName}
                      <div className="text-[10px] text-slate-400 font-normal">{ord.customerName}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-200 font-semibold">{toBnDigit(ord.totalPairs)} {t('pairs')}</td>
                    <td className="py-3 px-2 font-bold text-emerald-400">{formatTaka(ord.grandTotal)}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'পরিশোধিত'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : ord.status === 'আংশিক বাকী'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        onClick={() => onSelectOrderForInvoice(ord)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        {t('print')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock & Inventory Box */}
        <div className="space-y-6">
          
          {/* Low Stock Warning Box */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                {t('stock_alert')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300">
                {t('items_count', { count: toBnDigit(lowStockProducts.length) })}
              </span>
            </div>

            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                {t('stock_sufficient')}
              </p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-200">{p.articleCode} - {p.name}</div>
                      <div className="text-[10px] text-slate-400">{t('size')}: {p.sizeRange}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-400">{toBnDigit(p.stockPairs)} {t('pairs')}</div>
                      <button
                        onClick={() => onNavigate('stock')}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        {t('restock')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warehouse Summary */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-400" />
              {t('warehouse_stock')}
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">{t('models')}:</span>
                <span className="font-bold text-slate-200">{toBnDigit(products.length)} {t('items_count_suffix')}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">{t('total_pairs')}:</span>
                <span className="font-bold text-amber-400 text-sm">{toBnDigit(totalStockPairs)} {t('pairs')}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">{t('dozen')}:</span>
                <span className="font-bold text-slate-200">{pairsToCartonText(totalStockPairs, 12)}</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('stock')}
              className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              {t('stock_list')}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

