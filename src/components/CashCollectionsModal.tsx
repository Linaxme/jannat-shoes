import React, { useState, useMemo } from 'react';
import { Order, DuePaymentLog } from '../types';
import { formatTaka, toBnDigit, formatBnDate, getLocalDateStr, compareOrdersNewestFirst } from '../utils/formatters';
import {
  X,
  Banknote,
  Receipt,
  Search,
  Calendar,
  Wallet,
  ShoppingBag,
  ExternalLink,
  Store,
  User,
  CheckCircle2,
  Printer,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';

export type CollectionFilterPeriod = 'today' | '7days' | 'month' | 'year' | 'all';

interface CashCollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  paymentLogs?: DuePaymentLog[];
  initialPeriod?: CollectionFilterPeriod;
  onSelectOrderForInvoice?: (order: Order) => void;
}

interface UnifiedCollectionItem {
  id: string;
  sourceType: 'memo' | 'due_payment';
  date: string;
  time?: string;
  refNo: string; // memoNo or receiptNo
  shopName: string;
  customerName: string;
  collectorName: string; // sellerName or receivedBy
  paymentMethod: string;
  amount: number;
  dueRemaining?: number;
  totalBill?: number;
  rawOrder?: Order;
  rawPaymentLog?: DuePaymentLog;
}

export const CashCollectionsModal: React.FC<CashCollectionsModalProps> = ({
  isOpen,
  onClose,
  orders,
  paymentLogs = [],
  initialPeriod = 'today',
  onSelectOrderForInvoice,
}) => {
  const [period, setPeriod] = useState<CollectionFilterPeriod>(initialPeriod);
  const [activeTab, setActiveTab] = useState<'all' | 'memo' | 'due_payment'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Date filtering ranges
  const { todayStr, weekAgoStr, currentMonth, currentYear } = useMemo(() => {
    const now = new Date();
    const today = getLocalDateStr(now);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return {
      todayStr: today,
      weekAgoStr: getLocalDateStr(weekAgo),
      currentMonth: now.getMonth(),
      currentYear: now.getFullYear(),
    };
  }, []);

  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    if (period === 'all') return true;
    if (period === 'today') return dateStr === todayStr;
    if (period === '7days') return dateStr >= weekAgoStr && dateStr <= todayStr;
    if (period === 'month') {
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
    if (period === 'year') {
      const d = new Date(dateStr);
      return d.getFullYear() === currentYear;
    }
    return true;
  };

  // Convert Orders (with paidAmount > 0) to unified format
  const memoCollections = useMemo<UnifiedCollectionItem[]>(() => {
    const items: UnifiedCollectionItem[] = [];

    orders.forEach((o) => {
      // If order was delivered on a different date than booked
      if (o.deliveryStatus === 'delivered' && o.deliveryDate && o.deliveryDate !== o.date) {
        // Payment collected upon delivery
        if ((o.deliveryPaidAmount || 0) > 0 && isDateInPeriod(o.deliveryDate)) {
          items.push({
            id: `delivery-${o.id}`,
            sourceType: 'memo',
            date: o.deliveryDate,
            time: o.time || '',
            refNo: `মেমো #${o.memoNo || o.id.slice(-5)} (ডেলিভারি)`,
            shopName: o.shopName || o.customerName || 'খুচরা কাস্টমার',
            customerName: o.customerName || '',
            collectorName: o.sellerName || 'কাউন্টার',
            paymentMethod: o.deliveryPaymentMethod || o.paymentMethod || 'নগদ ক্যাশ',
            amount: o.deliveryPaidAmount || 0,
            dueRemaining: o.dueAmount || 0,
            totalBill: o.grandTotal || 0,
            rawOrder: o,
          });
        }
        // Advance paid when booked
        const advanceAmount = Math.max(0, (o.paidAmount || 0) - (o.deliveryPaidAmount || 0));
        if (advanceAmount > 0 && isDateInPeriod(o.date)) {
          items.push({
            id: `booking-${o.id}`,
            sourceType: 'memo',
            date: o.date,
            time: o.time || '',
            refNo: `মেমো #${o.memoNo || o.id.slice(-5)} (বুকিং অগ্রিম)`,
            shopName: o.shopName || o.customerName || 'খুচরা কাস্টমার',
            customerName: o.customerName || '',
            collectorName: o.sellerName || 'কাউন্টার',
            paymentMethod: o.paymentMethod || 'নগদ ক্যাশ',
            amount: advanceAmount,
            dueRemaining: (o.grandTotal || 0) - advanceAmount,
            totalBill: o.grandTotal || 0,
            rawOrder: o,
          });
        }
      } else {
        // Standard same-day sale or direct delivery
        if ((o.paidAmount || 0) > 0 && isDateInPeriod(o.date)) {
          items.push({
            id: `memo-${o.id}`,
            sourceType: 'memo',
            date: o.date || '',
            time: o.time || '',
            refNo: `মেমো #${o.memoNo || o.id.slice(-5)}`,
            shopName: o.shopName || o.customerName || 'খুচরা কাস্টমার',
            customerName: o.customerName || '',
            collectorName: o.sellerName || 'কাউন্টার',
            paymentMethod: o.paymentMethod || 'নগদ ক্যাশ',
            amount: o.paidAmount || 0,
            dueRemaining: o.dueAmount || 0,
            totalBill: o.grandTotal || 0,
            rawOrder: o,
          });
        }
      }
    });

    return items;
  }, [orders, period, todayStr, weekAgoStr, currentMonth, currentYear]);

  // Convert DuePaymentLogs (with amountPaid > 0) to unified format
  const dueCollections = useMemo<UnifiedCollectionItem[]>(() => {
    return paymentLogs
      .filter((p) => (p.amountPaid || 0) > 0 && isDateInPeriod(p.date))
      .map((p) => ({
        id: `due-${p.id}`,
        sourceType: 'due_payment',
        date: p.date || '',
        time: '',
        refNo: p.receiptNo || `রসিদ #${p.id.slice(-5)}`,
        shopName: p.shopName || p.customerName || 'কাস্টমার',
        customerName: p.customerName || '',
        collectorName: p.receivedBy || p.sellerName || 'আদায়কারী',
        paymentMethod: p.paymentMethod || 'নগদ ক্যাশ',
        amount: p.amountPaid || 0,
        dueRemaining: p.remainingDue,
        totalBill: undefined,
        rawPaymentLog: p,
      }));
  }, [paymentLogs, period, todayStr, weekAgoStr, currentMonth, currentYear]);

  // Combine & Sort newest first
  const allCollections = useMemo<UnifiedCollectionItem[]>(() => {
    const combined = [...memoCollections, ...dueCollections];
    return combined.sort((a, b) => {
      const itemA = a.rawOrder || { id: a.id, memoNo: a.refNo, date: a.date, time: a.time };
      const itemB = b.rawOrder || { id: b.id, memoNo: b.refNo, date: b.date, time: b.time };
      return compareOrdersNewestFirst(itemA, itemB);
    });
  }, [memoCollections, dueCollections]);

  // Calculations for summary stats
  const totalMemoCash = useMemo(() => memoCollections.reduce((sum, i) => sum + i.amount, 0), [memoCollections]);
  const totalDueCash = useMemo(() => dueCollections.reduce((sum, i) => sum + i.amount, 0), [dueCollections]);
  const grandTotalCash = totalMemoCash + totalDueCash;

  // Filtered by tab and search
  const displayedItems = useMemo(() => {
    let list = allCollections;
    if (activeTab === 'memo') {
      list = memoCollections;
    } else if (activeTab === 'due_payment') {
      list = dueCollections;
    }

    if (!searchTerm.trim()) return list;

    const q = searchTerm.trim().toLowerCase();
    return list.filter((item) => {
      return (
        item.refNo.toLowerCase().includes(q) ||
        item.shopName.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.collectorName.toLowerCase().includes(q) ||
        item.paymentMethod.toLowerCase().includes(q) ||
        item.date.includes(q) ||
        String(item.amount).includes(q)
      );
    });
  }, [allCollections, memoCollections, dueCollections, activeTab, searchTerm]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const periodLabels: Record<CollectionFilterPeriod, string> = {
    today: 'আজকের জমা',
    '7days': 'গত ৭ দিনের জমা',
    month: 'এই মাসের জমা',
    year: 'এই বছরের জমা',
    all: 'সকল জমা',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">জমার খতিয়ান</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  {periodLabels[period]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="প্রিন্ট করুন"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Received */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 dark:border-emerald-500/40 p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700 dark:text-emerald-300/80 font-medium">মোট আদায়</span>
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {formatTaka(grandTotalCash)}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-300/70 mt-0.5 flex items-center justify-between">
                <span>{toBnDigit(allCollections.length)} টি এন্ট্রি</span>
              </div>
            </div>

            {/* Memo Cash Received */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">মেমো জমা</span>
                <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                {formatTaka(totalMemoCash)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {toBnDigit(memoCollections.length)} টি মেমো
              </div>
            </div>

            {/* Due Collection Received */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">বাকী জমা</span>
                <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-300 mt-1">
                {formatTaka(totalDueCash)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {toBnDigit(dueCollections.length)} টি রসিদ
              </div>
            </div>
          </div>

          {/* Controls: Date Period Toggles & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            
            {/* Period Filters */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              {(
                [
                  { key: 'today', label: 'আজ' },
                  { key: '7days', label: '৭ দিন' },
                  { key: 'month', label: '১ মাস' },
                  { key: 'year', label: '১ বছর' },
                  { key: 'all', label: 'সব' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPeriod(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    period === tab.key
                      ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="খুঁজুন..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Type Tabs: All / Memo / Due */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>সব জমা</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 font-mono">
                {toBnDigit(allCollections.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('memo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'memo'
                  ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>মেমো</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-950 text-amber-700 dark:text-amber-300 font-mono">
                {toBnDigit(memoCollections.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('due_payment')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'due_payment'
                  ? 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>বাকী আদায়</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-950 text-sky-700 dark:text-sky-300 font-mono">
                {toBnDigit(dueCollections.length)}
              </span>
            </button>
          </div>

          {/* List Content */}
          {displayedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/40">
              <Banknote className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">কোনো জমার রেকর্ড নেই</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-3 px-3">মেমো / রসিদ</th>
                      <th className="py-3 px-3">তারিখ</th>
                      <th className="py-3 px-3">দোকান</th>
                      <th className="py-3 px-3">ধরন</th>
                      <th className="py-3 px-3">আদায়কারী</th>
                      <th className="py-3 px-3">মাধ্যম</th>
                      <th className="py-3 px-3 text-right">জমা (৳)</th>
                      <th className="py-3 px-3 text-center">চালান</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {displayedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {item.refNo}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <div>{formatBnDate(item.date)}</div>
                          {item.time && <div className="text-[10px] text-slate-400 dark:text-slate-500">{item.time}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{item.shopName}</div>
                          {item.customerName && item.customerName !== item.shopName && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.customerName}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.sourceType === 'memo' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              মেমো
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30">
                              বাকী
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.collectorName}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-slate-700">
                            {item.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
                            {formatTaka(item.amount)}
                          </span>
                          {item.dueRemaining !== undefined && item.dueRemaining > 0 && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400">
                              বাকী: {formatTaka(item.dueRemaining)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.sourceType === 'memo' && item.rawOrder && onSelectOrderForInvoice ? (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectOrderForInvoice(item.rawOrder!);
                              }}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="চালান দেখুন"
                            >
                              <span>চালান</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-2.5">
                {displayedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{item.refNo}</span>
                          {item.sourceType === 'memo' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              মেমো
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30">
                              বাকী
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">{item.shopName}</div>
                        {item.customerName && item.customerName !== item.shopName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.customerName}</div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                          {formatTaka(item.amount)}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {item.paymentMethod}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <div>
                        <span>{formatBnDate(item.date)}</span>
                        {item.time && <span className="ml-1 text-slate-400 dark:text-slate-500">({item.time})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{item.collectorName}</span>
                        {item.sourceType === 'memo' && item.rawOrder && onSelectOrderForInvoice && (
                          <button
                            type="button"
                            onClick={() => onSelectOrderForInvoice(item.rawOrder!)}
                            className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold inline-flex items-center gap-1 transition"
                          >
                            <span>চালান</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-800 dark:text-slate-200">{toBnDigit(displayedItems.length)} টি এন্ট্রি</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
              মোট: <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">{formatTaka(displayedItems.reduce((s, i) => s + i.amount, 0))}</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition cursor-pointer"
            >
              বন্ধ
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
