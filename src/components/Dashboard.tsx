import React, { useState, useRef, useEffect } from 'react';
import { Order, ShoeProduct, Customer, UserAccount, SystemConfig, DuePaymentLog } from '../types';
import { NavTab } from './Navigation';
import { formatTaka, toBnDigit, pairsToCartonText, getLocalDateStr, formatBnDate, compareOrdersNewestFirst } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { CashCollectionsModal } from './CashCollectionsModal';
import { LowStockModal } from './LowStockModal';
import {
  Banknote,
  Boxes,
  TrendingUp,
  Receipt,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  Calendar,
  SlidersHorizontal,
  CheckCircle2,
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

  const todayDate = new Date();
  const todayStr = getLocalDateStr(todayDate);

  const [filterMode, setFilterMode] = useState<'day' | '7days' | 'month' | 'year' | 'custom'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateStr(d);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [tempCustomStart, setTempCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateStr(d);
  });
  const [tempCustomEnd, setTempCustomEnd] = useState<string>(todayStr);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  const toggleProfitAmount = () => {
    setShowProfitAmount((prev) => {
      const next = !prev;
      localStorage.setItem('show_gross_profit_amount', String(next));
      return next;
    });
  };

  const weekAgoDate = new Date(todayDate);
  weekAgoDate.setDate(weekAgoDate.getDate() - 6);
  const weekAgoStr = getLocalDateStr(weekAgoDate);

  const monthAgoDate = new Date(todayDate);
  monthAgoDate.setDate(monthAgoDate.getDate() - 29);
  const monthAgoStr = getLocalDateStr(monthAgoDate);

  const yearAgoDate = new Date(todayDate);
  yearAgoDate.setDate(yearAgoDate.getDate() - 364);
  const yearAgoStr = getLocalDateStr(yearAgoDate);

  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return false;
    if (filterMode === 'day') {
      return dateStr === selectedDate;
    }
    if (filterMode === '7days') {
      return dateStr >= weekAgoStr && dateStr <= todayStr;
    }
    if (filterMode === 'month') {
      return dateStr >= monthAgoStr && dateStr <= todayStr;
    }
    if (filterMode === 'year') {
      return dateStr >= yearAgoStr && dateStr <= todayStr;
    }
    if (filterMode === 'custom') {
      const start = customStartDate || '0000-00-00';
      const end = customEndDate || '9999-99-99';
      return dateStr >= start && dateStr <= end;
    }
    return true;
  };

  const isSelectedToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const d = new Date(selectedDate || todayStr);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateStr(d));
    setFilterMode('day');
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate || todayStr);
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDateStr(d));
    setFilterMode('day');
  };

  const handleGoToToday = () => {
    setSelectedDate(todayStr);
    setFilterMode('day');
    setIsFilterDropdownOpen(false);
  };

  const getDayButtonLabel = () => {
    if (selectedDate === todayStr) {
      return 'আজ';
    }
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10);
      const y = parts[0];
      const monthName = months[m - 1] || '';
      const currentYear = String(todayDate.getFullYear());
      if (y === currentYear) {
        return `${toBnDigit(d)} ${monthName}`;
      }
      return `${toBnDigit(d)} ${monthName}, ${toBnDigit(y)}`;
    }
    return selectedDate;
  };

  const getFilterBadgeText = () => {
    if (filterMode === 'day') {
      if (selectedDate === todayStr) return 'আজকের হিসাব';
      return `${formatBnDate(selectedDate)}-এর হিসাব`;
    }
    if (filterMode === '7days') return 'গত ৭ দিনের হিসাব';
    if (filterMode === 'month') return 'গত ১ মাসের হিসাব';
    if (filterMode === 'year') return 'গত ১ বছরের হিসাব';
    if (filterMode === 'custom') {
      return `${formatBnDate(customStartDate)} - ${formatBnDate(customEndDate)}`;
    }
    return 'হিসাব';
  };

  // Delivered Orders (Actual Realized Sales)
  const filteredDeliveredOrders = orders.filter((o) => {
    const isDelivered = o.deliveryStatus === 'delivered' || !o.deliveryStatus;
    if (!isDelivered) return false;
    const effectiveDate = o.deliveryDate || o.date;
    return isDateInFilter(effectiveDate);
  });

  // Booked Orders in this filter period
  const filteredBookedOrders = orders.filter((o) => {
    return o.deliveryStatus === 'booked' && isDateInFilter(o.date);
  });

  // All active booked orders currently pending across entire system
  const allPendingBookedOrders = orders.filter((o) => o.deliveryStatus === 'booked');
  const allPendingBookedTotal = allPendingBookedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const allPendingBookedPairs = allPendingBookedOrders.reduce((sum, o) => sum + (o.totalPairs || 0), 0);

  const filteredDeliveredSales = filteredDeliveredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const filteredDeliveredPairs = filteredDeliveredOrders.reduce((sum, o) => sum + o.totalPairs, 0);

  const filteredBookedSales = filteredBookedOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const filteredBookedPairs = filteredBookedOrders.reduce((sum, o) => sum + o.totalPairs, 0);

  const filteredPaymentLogs = (paymentLogs || []).filter((p) => {
    return isDateInFilter(p.date);
  });

  // Cash Collections from delivered orders:
  // For orders booked earlier and delivered in this period, count deliveryPaidAmount.
  // For orders created and delivered in this period, count paidAmount.
  const filteredMemoCash = filteredDeliveredOrders.reduce((sum, o) => {
    if (o.deliveryPaidAmount !== undefined && o.deliveryDate && o.deliveryDate !== o.date) {
      return sum + (o.deliveryPaidAmount || 0);
    }
    return sum + (o.paidAmount || 0);
  }, 0);

  const filteredDueCash = filteredPaymentLogs.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const filteredCollectedCash = filteredMemoCash + filteredDueCash;
  const filteredNewDue = filteredDeliveredOrders.reduce((sum, o) => sum + o.dueAmount, 0);

  const totalMarketDue = customers.reduce((sum, c) => sum + c.currentDue, 0);
  const totalStockPairs = products.reduce((sum, p) => sum + p.stockPairs, 0);
  const freeStockPairs = Math.max(0, totalStockPairs - allPendingBookedPairs);

  const canSeeProfit = !!(
    currentUser &&
    (currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      (currentUser.role === 'seller' && systemConfig?.allowSellerToSeeFinancials))
  );

  const showProfit = !!(!systemConfig || systemConfig.enableProfitCalculation === undefined || (systemConfig.enableProfitCalculation && canSeeProfit));

  const getOrderCost = (order: Order) => {
    return (order.items || []).reduce((itemSum, item) => {
      let buyPrice = item.unitBuyPrice || 0;
      if (buyPrice <= 0) {
        const prod = products.find(
          (p) =>
            (item.productId && p.id === item.productId) ||
            (item.articleCode && p.articleCode && p.articleCode.trim().toLowerCase() === item.articleCode.trim().toLowerCase())
        );
        buyPrice = prod?.buyPrice || 0;
      }
      return itemSum + buyPrice * (item.totalPairs || 0);
    }, 0);
  };

  const getOrderProfit = (order: Order) => {
    return (order.grandTotal || 0) - getOrderCost(order);
  };

  // Filtered period profit (Delivered orders ONLY)
  const filteredGrossProfit = showProfit
    ? filteredDeliveredOrders.reduce((sum, order) => sum + getOrderProfit(order), 0)
    : 0;

  // Total Gross Profit across entire database (delivered orders ONLY)
  const totalGrossProfit = showProfit
    ? orders
        .filter((o) => o.deliveryStatus === 'delivered' || !o.deliveryStatus)
        .reduce((sum, order) => sum + getOrderProfit(order), 0)
    : 0;

  const lowStockProducts = products.filter((p) => p.stockPairs <= p.minStockAlert);

  const recentOrders = [...orders]
    .sort(compareOrdersNewestFirst)
    .slice(0, 5);

  const bookedPercent = totalStockPairs > 0 
    ? Math.min(100, Math.round((allPendingBookedPairs / totalStockPairs) * 100)) 
    : 0;
  const freePercent = 100 - bookedPercent;

  return (
    <div className="space-y-7 sm:space-y-8 pb-6">
      
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900/70 border border-slate-800/80 p-2 sm:p-2.5 rounded-2xl shadow-sm">
        {/* Day Navigator */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950 border border-slate-800/90 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker?.();
                  } catch {
                    dateInputRef.current?.focus();
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filterMode === 'day'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{getDayButtonLabel()}</span>
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setFilterMode('day');
                    setIsFilterDropdownOpen(false);
                  }
                }}
                className="sr-only"
                tabIndex={-1}
              />
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Return to Today if not on today or if range filter active */}
          {(!isSelectedToday || filterMode !== 'day') && (
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              আজ
            </button>
          )}
        </div>

        {/* Filter Icon & Dropdown for 7 days, 1 month, 1 year, custom range */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              filterMode !== 'day'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-950 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>
              {filterMode === '7days'
                ? '৭ দিন'
                : filterMode === 'month'
                ? '১ মাস'
                : filterMode === 'year'
                ? '১ বছর'
                : filterMode === 'custom'
                ? 'কাস্টম'
                : 'ফিল্টার'}
            </span>
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('7days');
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition cursor-pointer ${
                    filterMode === '7days'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ৭ দিন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('month');
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition cursor-pointer ${
                    filterMode === 'month'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ১ মাস
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('year');
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition cursor-pointer ${
                    filterMode === 'year'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ১ বছর
                </button>
              </div>

              {/* Custom Range */}
              <div className="pt-2.5 border-t border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-400">কাস্টম রেঞ্জ</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">শুরু</label>
                    <input
                      type="date"
                      value={tempCustomStart}
                      onChange={(e) => setTempCustomStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">শেষ</label>
                    <input
                      type="date"
                      value={tempCustomEnd}
                      onChange={(e) => setTempCustomEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate(tempCustomStart);
                    setCustomEndDate(tempCustomEnd);
                    setFilterMode('custom');
                    setIsFilterDropdownOpen(false);
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer"
                >
                  প্রয়োগ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= SECTION 1: গুদাম স্টক ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-amber-400 rounded-full"></span>
            <h2 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
              গুদাম স্টক
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('stock')}
            className="text-[11px] sm:text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>স্টক তালিকা</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact & Clean Warehouse Stock Card */}
        <div className="relative bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/60 border-t-slate-600/70 border-b-[3px] border-b-slate-950 p-4 sm:p-5 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_24px_-4px_rgba(0,0,0,0.6)]">
          {/* Top Status Row inside Stock Card */}
          <div className="flex items-center justify-between gap-3 flex-wrap pb-3.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
                <Boxes className="w-4.5 h-4.5" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">গুদাম স্টক</h3>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full text-[11px] font-medium border border-slate-700">
                  {toBnDigit(products.length)} টি মডেল
                </span>
              </div>
            </div>

            {/* Integrated Stock Alert Badge */}
            <div>
              {lowStockProducts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsLowStockModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-full text-xs font-bold transition-colors cursor-pointer shadow-sm animate-pulse"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>কম স্টক: {toBnDigit(lowStockProducts.length)} টি</span>
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>স্টক পর্যাপ্ত</span>
                </span>
              )}
            </div>
          </div>

          {/* 3 Balanced Metric Columns */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mt-3.5">
            {/* 1. মোট মজুদ */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400">মোট মজুদ</span>
              <div className="text-sm sm:text-lg font-black text-slate-100 font-mono mt-1 truncate">
                {toBnDigit(totalStockPairs)} <span className="text-[10px] sm:text-xs font-normal text-slate-400">জোড়া</span>
              </div>
              <div className="text-[10px] sm:text-xs text-amber-400/90 font-medium truncate mt-1">
                {pairsToCartonText(totalStockPairs, 12)}
              </div>
            </div>

            {/* 2. বুকড কৃত */}
            <div 
              onClick={() => onNavigate('pending')}
              className="bg-slate-950/70 border border-amber-500/30 hover:border-amber-500/60 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between cursor-pointer transition group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-amber-400">বুকড</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 group-hover:translate-x-0.5 transition hidden sm:block" />
              </div>
              <div className="text-sm sm:text-lg font-black text-amber-300 font-mono mt-1 truncate">
                {toBnDigit(allPendingBookedPairs)} <span className="text-[10px] sm:text-xs font-normal text-slate-400">জোড়া</span>
              </div>
              <div className="text-[10px] sm:text-xs text-amber-300/80 font-medium truncate mt-1">
                {pairsToCartonText(allPendingBookedPairs, 12)}
              </div>
            </div>

            {/* 3. ফ্রি স্টক */}
            <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">ফ্রি স্টক</span>
              <div className="text-sm sm:text-lg font-black text-emerald-300 font-mono mt-1 truncate">
                {toBnDigit(freeStockPairs)} <span className="text-[10px] sm:text-xs font-normal text-slate-400">জোড়া</span>
              </div>
              <div className="text-[10px] sm:text-xs text-emerald-300/80 font-medium truncate mt-1">
                {pairsToCartonText(freeStockPairs, 12)}
              </div>
            </div>
          </div>

          {/* Visual Stock Availability Ratio Bar */}
          {totalStockPairs > 0 && (
            <div className="mt-3.5 pt-3 border-t border-slate-800/60">
              <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-slate-400 mb-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  ফ্রি স্টক: {toBnDigit(freePercent)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  বুকড: {toBnDigit(bookedPercent)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${freePercent}%` }} 
                />
                <div 
                  className="h-full bg-amber-500 transition-all duration-500" 
                  style={{ width: `${bookedPercent}%` }} 
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= SECTION 2: লেনদেন ও হিসাব ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-400 rounded-full"></span>
            <h2 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
              লেনদেন ও হিসাব
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
            {getFilterBadgeText()}
          </span>
        </div>

        {/* Key Metrics Cards (2 Columns with 3D Rounded Shape & Top-Aligned Icons) */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
          
          {/* Card 1: Delivered Sales */}
          <div className="relative bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/60 border-t-slate-600/70 border-b-[3px] border-b-slate-950 p-4 sm:p-5 rounded-2xl flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_20px_-3px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">বিক্রি</p>
              <div className="p-2 sm:p-2.5 bg-gradient-to-b from-amber-500/25 to-amber-500/5 text-amber-400 rounded-full shrink-0 border border-amber-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_8px_-2px_rgba(0,0,0,0.5)]">
                <TrendingUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-black text-amber-400 font-mono truncate drop-shadow-sm">
                {formatTaka(filteredDeliveredSales)}
              </h3>
              <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] sm:text-[11px] text-slate-400 truncate">
                {toBnDigit(filteredDeliveredOrders.length)} টি মেমো • {toBnDigit(filteredDeliveredPairs)} জোড়া
              </div>
            </div>
          </div>

          {/* Card 2: Booked Orders */}
          <div
            onClick={() => onNavigate('pending')}
            className="relative bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-amber-500/30 border-t-amber-400/40 border-b-[3px] border-b-slate-950 hover:border-amber-400/60 p-4 sm:p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_12px_24px_-4px_rgba(0,0,0,0.7)] active:translate-y-0 active:border-b-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_20px_-3px_rgba(0,0,0,0.6)] group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">পেন্ডিং বুকিং</p>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 group-hover:translate-x-0.5 transition" />
              </div>
              <div className="p-2 sm:p-2.5 bg-gradient-to-b from-amber-500/25 to-amber-500/5 text-amber-400 rounded-full shrink-0 border border-amber-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_8px_-2px_rgba(0,0,0,0.5)]">
                <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-black text-amber-300 font-mono truncate drop-shadow-sm">
                {formatTaka(allPendingBookedTotal)}
              </h3>
              <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] sm:text-[11px] text-slate-400 truncate">
                {toBnDigit(allPendingBookedOrders.length)} টি • {toBnDigit(allPendingBookedPairs)} জোড়া
              </div>
            </div>
          </div>

          {/* Card 3: Cash Collected */}
          <div
            onClick={() => setIsCollectionModalOpen(true)}
            className="relative bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/60 border-t-slate-600/70 border-b-[3px] border-b-slate-950 hover:border-emerald-500/50 p-4 sm:p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_12px_24px_-4px_rgba(0,0,0,0.7)] active:translate-y-0 active:border-b-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_20px_-3px_rgba(0,0,0,0.6)] group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">জমা</p>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400/70 group-hover:translate-x-0.5 transition" />
              </div>
              <div className="p-2 sm:p-2.5 bg-gradient-to-b from-emerald-500/25 to-emerald-500/5 text-emerald-400 rounded-full shrink-0 border border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_8px_-2px_rgba(0,0,0,0.5)]">
                <Banknote className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400 font-mono truncate drop-shadow-sm">
                {formatTaka(filteredCollectedCash)}
              </h3>
              <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] sm:text-[11px] text-slate-400 truncate">
                মেমো: {formatTaka(filteredMemoCash)}{filteredDueCash > 0 ? ` • বাকী: ${formatTaka(filteredDueCash)}` : ''}
              </div>
            </div>
          </div>

          {/* Card 4: New Due */}
          <div className="relative bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/60 border-t-slate-600/70 border-b-[3px] border-b-slate-950 p-4 sm:p-5 rounded-2xl flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_20px_-3px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">নতুন বাকী</p>
              <div className="p-2 sm:p-2.5 bg-gradient-to-b from-rose-500/25 to-rose-500/5 text-rose-400 rounded-full shrink-0 border border-rose-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_8px_-2px_rgba(0,0,0,0.5)]">
                <Receipt className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-black text-rose-400 font-mono truncate drop-shadow-sm">
                {formatTaka(filteredNewDue)}
              </h3>
              <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] sm:text-[11px] text-slate-400 truncate">
                চলতি চালানের
              </div>
            </div>
          </div>

          {/* Card 5: Total Due */}
          <div 
            onClick={() => onNavigate('due')}
            className="relative bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/60 border-t-slate-600/70 border-b-[3px] border-b-slate-950 hover:border-rose-500/50 p-4 sm:p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_12px_24px_-4px_rgba(0,0,0,0.7)] active:translate-y-0 active:border-b-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_20px_-3px_rgba(0,0,0,0.6)] group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">মোট বাকী</p>
                <ChevronRight className="w-3.5 h-3.5 text-rose-400/70 group-hover:translate-x-0.5 transition" />
              </div>
              <div className="p-2 sm:p-2.5 bg-gradient-to-b from-rose-500/25 to-rose-500/5 text-rose-400 rounded-full shrink-0 border border-rose-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_8px_-2px_rgba(0,0,0,0.5)]">
                <Receipt className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-black text-rose-400 font-mono truncate drop-shadow-sm">
                {formatTaka(totalMarketDue)}
              </h3>
              <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] sm:text-[11px] text-slate-400 truncate">
                {toBnDigit(customers.length)} টি দোকান
              </div>
            </div>
          </div>

          {/* Card 6: Gross Profit (Conditional) */}
          {showProfit && (
            <div
              onClick={() => onNavigate('reports')}
              className="relative bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-purple-500/30 border-t-purple-400/40 border-b-[3px] border-b-slate-950 hover:border-purple-400/60 p-4 sm:p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_12px_24px_-4px_rgba(0,0,0,0.7)] active:translate-y-0 active:border-b-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_20px_-3px_rgba(0,0,0,0.6)] group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">মোট প্রফিট</p>
                  <ChevronRight className="w-3.5 h-3.5 text-purple-400/70 group-hover:translate-x-0.5 transition" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProfitAmount();
                    }}
                    className="p-1 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {showProfitAmount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="p-2 sm:p-2.5 bg-gradient-to-b from-purple-500/25 to-purple-500/5 text-purple-400 rounded-full shrink-0 border border-purple-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_8px_-2px_rgba(0,0,0,0.5)]">
                  <TrendingUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-purple-400 truncate font-mono drop-shadow-sm">
                  {showProfitAmount ? formatTaka(totalGrossProfit) : '৳ ••••••'}
                </h3>
                <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] sm:text-[11px] text-slate-400 truncate flex items-center justify-between">
                  <span>
                    {filterMode === 'day' && isSelectedToday ? 'আজকের' : 'মেয়াদে'}: {showProfitAmount ? formatTaka(filteredGrossProfit) : '••••'}
                  </span>
                  <span className="text-purple-400/80 font-medium">রিপোর্ট</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* ================= SECTION 3: সাম্প্রতিক মেমোসমূহ ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-sky-400 rounded-full"></span>
            <h2 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-sky-400" />
              <span>{t('recent_memos')}</span>
            </h2>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>{t('see_all')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[540px] w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800/90 text-slate-400 font-semibold">
                  <th className="py-3 px-3.5">{t('memo_no')}</th>
                  <th className="py-3 px-3">{t('shop_customer')}</th>
                  <th className="py-3 px-3">{t('pairs')}</th>
                  <th className="py-3 px-3">{t('total_bill')}</th>
                  <th className="py-3 px-3">{t('status')}</th>
                  <th className="py-3 px-3.5 text-right">{t('memo')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      কোনো সাম্প্রতিক মেমো পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-amber-300">{ord.memoNo}</td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {ord.shopName}
                        <div className="text-[10px] text-slate-400 font-normal">{ord.customerName}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-200 font-semibold">{toBnDigit(ord.totalPairs)} {t('pairs')}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{formatTaka(ord.grandTotal)}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => onSelectOrderForInvoice(ord)}
                          className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-700/60"
                        >
                          {t('print')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cash Collections Detailed List Modal */}
      <CashCollectionsModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        orders={orders}
        paymentLogs={paymentLogs}
        initialPeriod={
          filterMode === 'day' && isSelectedToday
            ? 'today'
            : filterMode === '7days'
            ? '7days'
            : filterMode === 'month'
            ? 'month'
            : filterMode === 'year'
            ? 'year'
            : 'all'
        }
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

