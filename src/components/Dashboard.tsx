import React, { useState } from 'react';
import { Order, ShoeProduct, Customer, UserAccount, SystemConfig, DuePaymentLog } from '../types';
import { NavTab } from './Navigation';
import { formatTaka, toBnDigit, pairsToCartonText, getLocalDateStr, compareOrdersNewestFirst } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { CashCollectionsModal } from './CashCollectionsModal';
import { LowStockModal } from './LowStockModal';
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
  ChevronRight,
} from 'lucide-react';

interface DashboardProps {
  orders: Order[];
  products: ShoeProduct[];
  customers: Customer[];
  paymentLogs?: DuePaymentLog[];
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
  paymentLogs = [],
  currentUser,
  systemConfig,
  onNavigate,
  onSelectOrderForInvoice,
}) => {
  const { t } = useLanguage();
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [showProfitAmount, setShowProfitAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('show_gross_profit_amount');
      return saved !== 'false';
    }
    return true;
  });
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'year'>('today');

  const toggleProfitAmount = () => {
    setShowProfitAmount((prev) => {
      const next = !prev;
      localStorage.setItem('show_gross_profit_amount', String(next));
      return next;
    });
  };

  const todayDate = new Date();
  const todayStr = getLocalDateStr(todayDate);

  const weekAgoDate = new Date(todayDate);
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgoStr = getLocalDateStr(weekAgoDate);

  // Calculate metrics
  const filteredOrders = orders.filter((o) => {
    if (!o.date) return false;
    if (dateFilter === 'today') return o.date === todayStr;
    if (dateFilter === '7days') {
      return o.date >= weekAgoStr && o.date <= todayStr;
    }
    if (dateFilter === 'month') {
      const oDate = new Date(o.date);
      return oDate.getMonth() === todayDate.getMonth() && oDate.getFullYear() === todayDate.getFullYear();
    }
    if (dateFilter === 'year') {
      const oDate = new Date(o.date);
      return oDate.getFullYear() === todayDate.getFullYear();
    }
    return true;
  });

  const filteredTotalSales = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const filteredPaymentLogs = (paymentLogs || []).filter((p) => {
    if (!p.date) return false;
    if (dateFilter === 'today') return p.date === todayStr;
    if (dateFilter === '7days') {
      return p.date >= weekAgoStr && p.date <= todayStr;
    }
    if (dateFilter === 'month') {
      const pDate = new Date(p.date);
      return pDate.getMonth() === todayDate.getMonth() && pDate.getFullYear() === todayDate.getFullYear();
    }
    if (dateFilter === 'year') {
      const pDate = new Date(p.date);
      return pDate.getFullYear() === todayDate.getFullYear();
    }
    return true;
  });

  const filteredMemoCash = filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const filteredDueCash = filteredPaymentLogs.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const filteredCollectedCash = filteredMemoCash + filteredDueCash;
  const filteredNewDue = filteredOrders.reduce((sum, o) => sum + o.dueAmount, 0);
  const filteredTotalPairs = filteredOrders.reduce((sum, o) => sum + o.totalPairs, 0);

  const totalMarketDue = customers.reduce((sum, c) => sum + c.currentDue, 0);
  const totalStockPairs = products.reduce((sum, p) => sum + p.stockPairs, 0);

  const canSeeProfit = !!(
    currentUser &&
    (currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      (currentUser.role === 'seller' && systemConfig?.allowSellerToSeeFinancials))
  );

  const showProfit = !!(!systemConfig || systemConfig.enableProfitCalculation === undefined || (systemConfig.enableProfitCalculation && canSeeProfit));

  const filteredGrossProfit = showProfit
    ? filteredOrders.reduce((sum, order) => {
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
    .sort(compareOrdersNewestFirst)
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

      {/* Date Filters */}
      <div className="flex items-center overflow-x-auto pb-1 -mt-2">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
          {[
            { id: 'today', label: 'আজ' },
            { id: '7days', label: '৭ দিন' },
            { id: 'month', label: '১ মাস' },
            { id: 'year', label: '১ বছর' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === f.id 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showProfit ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-4'} gap-4`}>
        
        {/* Card 1: Today Sales */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              {dateFilter === 'today' ? 'আজকের' : dateFilter === '7days' ? 'গত ৭ দিনের' : dateFilter === 'month' ? 'এই মাসের' : 'এই বছরের'} বিক্রি
            </p>
            <h3 className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
              {formatTaka(filteredTotalSales)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('total_memos')}: <span className="text-slate-200 font-semibold">{toBnDigit(filteredOrders.length)} টি</span>
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Today Cash Collected - Interactive to view details */}
        <div
          onClick={() => setIsCollectionModalOpen(true)}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-200 group hover:shadow-lg hover:shadow-emerald-500/10"
          title="জমার বিস্তারিত তালিকা দেখতে ক্লিক করুন"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-slate-400">
                {dateFilter === 'today' ? 'আজকের' : dateFilter === '7days' ? 'গত ৭ দিনের' : dateFilter === 'month' ? 'এই মাসের' : 'এই বছরের'} জমা
              </p>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
              {formatTaka(filteredCollectedCash)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>মেমো: <strong className="text-emerald-300 font-semibold">{formatTaka(filteredMemoCash)}</strong></span>
              {filteredDueCash > 0 && (
                <span>• বাকী জমা: <strong className="text-sky-300 font-semibold">{formatTaka(filteredDueCash)}</strong></span>
              )}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Today Sold Pairs */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('sold_pairs')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-indigo-300 mt-1">
              {toBnDigit(filteredTotalPairs)} <span className="text-xs font-normal text-slate-300">{t('pairs')}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('dozen')}: <span className="text-slate-200 font-semibold">{pairsToCartonText(filteredTotalPairs, 12)}</span>
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
                  {dateFilter === 'today' ? 'আজকের' : dateFilter === '7days' ? 'গত ৭ দিনের' : dateFilter === 'month' ? 'এই মাসের' : 'এই বছরের'} লাভ
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
                {showProfitAmount ? formatTaka(filteredGrossProfit) : '৳ ••••••'}
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
          
          {/* Low Stock Warning Box (Minimal Clickable Card) */}
          <div
            onClick={() => {
              if (lowStockProducts.length > 0) {
                setIsLowStockModalOpen(true);
              }
            }}
            className={`p-4 rounded-2xl border transition-all ${
              lowStockProducts.length > 0
                ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/15 cursor-pointer shadow-lg shadow-rose-950/20'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  lowStockProducts.length > 0
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    {t('stock_alert')}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lowStockProducts.length === 0
                      ? t('stock_sufficient')
                      : 'কম স্টকের তালিকা দেখতে ক্লিক করুন'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                  lowStockProducts.length > 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {toBnDigit(lowStockProducts.length)} টি আইটেম
                </span>
                {lowStockProducts.length > 0 && (
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                )}
              </div>
            </div>
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

      {/* Cash Collections Detailed List Modal */}
      <CashCollectionsModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        orders={orders}
        paymentLogs={paymentLogs}
        initialPeriod={dateFilter}
        onSelectOrderForInvoice={onSelectOrderForInvoice}
      />

      {/* Low Stock Items Detailed Modal */}
      <LowStockModal
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        products={lowStockProducts}
        onNavigateToStock={() => onNavigate('stock')}
      />

    </div>
  );
};

