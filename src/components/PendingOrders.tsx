import React, { useState } from 'react';
import { Order, UITheme, UserRole } from '../types';
import { formatTaka, toBnDigit, formatBnDate } from '../utils/formatters';
import {
  Clock,
  Search,
  CheckCircle,
  Printer,
  Truck,
  Store,
  User,
  Edit3,
  UserCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  List,
  LayoutGrid,
} from 'lucide-react';
import { EditPendingOrderModal } from './EditPendingOrderModal';
import { useLanguage } from '../contexts/LanguageContext';

interface PendingOrdersProps {
  orders: Order[];
  activeTheme: UITheme;
  onSelectOrderForInvoice: (order: Order) => void;
  onConfirmDelivery: (orderId: string) => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onClaimOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  currentUserRole?: UserRole;
}

export const PendingOrders: React.FC<PendingOrdersProps> = ({
  orders,
  activeTheme,
  onSelectOrderForInvoice,
  onConfirmDelivery,
  onUpdateOrder,
  onClaimOrder,
  onDeleteOrder,
  currentUserRole = 'admin',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'card' : 'table'
  );

  const { t } = useLanguage();

  const isCustomer = currentUserRole === 'customer';

  const pendingOrders = orders.filter((ord) => ord.deliveryStatus === 'booked');

  const filteredOrders = pendingOrders
    .filter((ord) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        ord.memoNo.toLowerCase().includes(term) ||
        ord.shopName.toLowerCase().includes(term) ||
        ord.customerName.toLowerCase().includes(term) ||
        ord.customerPhone.includes(term) ||
        ord.sellerName.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const keyA = `${a.date || ''} ${a.time || ''} ${a.memoNo || a.id}`;
      const keyB = `${b.date || ''} ${b.time || ''} ${b.memoNo || b.id}`;
      return keyB.localeCompare(keyA);
    });

  const totalPendingPairs = filteredOrders.reduce((sum, o) => sum + (o.totalPairs || 0), 0);
  const totalPendingAmount = filteredOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const getDozenText = (pairs: number) => {
    const dozen = (pairs / 12).toFixed(1).replace(/\.0$/, '');
    return `${toBnDigit(dozen)} ডজন`;
  };

  return (
    <div className="space-y-4">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            {isCustomer ? 'আপনার অর্ডার স্ট্যাটাস (পেন্ডিং বুকিং)' : 'পেন্ডিং স্যাম্পল বুকিং'} ({toBnDigit(filteredOrders.length)} টি)
          </span>
          <div className="h-px bg-gradient-to-r from-amber-500/40 via-slate-800 to-transparent flex-1 hidden sm:block" />
        </div>

        <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shrink-0 self-start sm:self-auto">
          <div>
            <span className="text-slate-400 text-[11px] mr-1">মোট জোড়া:</span>
            <span className="font-bold text-amber-300">{toBnDigit(totalPendingPairs)} জোড়া</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 text-[11px] mr-1">মোট মূল্য:</span>
            <span className="font-bold text-emerald-400">{formatTaka(totalPendingAmount)}</span>
          </div>
        </div>
      </div>

      {/* Search & View Switcher Toolbar */}
      <div className={`${activeTheme.cardClass} p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3`}>
        <div className="relative w-full sm:w-80 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isCustomer ? 'মেমো নম্বর বা অর্ডার খুঁজুন...' : t('search_pending_placeholder')}
            className="bg-transparent text-xs text-slate-100 placeholder-slate-500 w-full focus:outline-none"
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="text-xs text-slate-400 hidden md:block">
            {t('total_displayed_label')} <strong className="text-white">{toBnDigit(filteredOrders.length)}</strong> {t('orders_count_suffix')}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              টেবিল
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              কার্ড
            </button>
          </div>
        </div>
      </div>

      {/* Orders Container */}
      <div className={`${activeTheme.cardClass} p-4 sm:p-5 rounded-2xl`}>
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-200">
              {isCustomer ? 'আপনার কোনো পেন্ডিং বা বুকিং অর্ডার নেই' : t('no_pending_orders_title')}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {isCustomer
                ? 'আপনার করা কোনো বুকিং অর্ডার থাকলে তা ডেলিভারির আগ পর্যন্ত এখানে প্রদর্শিত হবে।'
                : t('no_pending_orders_desc')}
            </p>
          </div>
        ) : viewMode === 'card' ? (
          /* CARD VIEW (Compact Collapsible Cards matching SalesHistory) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((ord) => {
              const isUnclaimed =
                !ord.sellerId ||
                !ord.isClaimed ||
                ord.sellerName.includes('উন্মুক্ত') ||
                ord.sellerName.includes('অনির্ধারিত');
              const isExpanded = expandedOrderId === ord.id;

              return (
                <div
                  key={ord.id}
                  className={`bg-slate-950 border rounded-2xl transition-all shadow-md overflow-hidden ${
                    isUnclaimed
                      ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                      : isExpanded
                      ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Collapsed Overview Header */}
                  <div
                    onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                    className="p-4 cursor-pointer hover:bg-slate-900/60 transition-colors space-y-2 select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-amber-300 flex items-center gap-1.5">
                        #{ord.memoNo}
                        {isUnclaimed ? (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow">
                            উন্মুক্ত
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            {t('sample_booked_tag')}
                          </span>
                        )}
                      </span>
                      <div className="p-1 text-amber-400 flex items-center">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="font-bold text-white flex items-center gap-1.5 truncate pr-2">
                        <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{ord.shopName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                        {formatBnDate(ord.date)} {ord.time ? `(${ord.time})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-slate-300">
                      <span>
                        <strong className="text-white font-bold">{toBnDigit(ord.totalPairs)} জোড়া</strong>{' '}
                        <span className="text-amber-300 font-semibold">({getDozenText(ord.totalPairs)})</span>
                      </span>
                      <span className="text-amber-300 font-black">{formatTaka(ord.grandTotal)}</span>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {isExpanded && (
                    <div className="p-4 pt-2 border-t border-slate-800/80 bg-slate-900/40 space-y-3.5 animate-fadeIn">
                      {/* Customer & Seller Info */}
                      <div className="text-xs space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60">
                        <div className="text-slate-300">
                          <span className="text-slate-400">প্রোপ্রাইটর:</span>{' '}
                          <strong className="text-white">{ord.customerName}</strong>{' '}
                          <span className="text-slate-400 font-mono">({ord.customerPhone})</span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">সেলার:</span>{' '}
                          <strong className={isUnclaimed ? 'text-amber-400 font-bold' : 'text-indigo-300 font-bold'}>
                            {ord.sellerName || 'উন্মুক্ত বুকিং'}
                          </strong>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          বুকিং তারিখ: {formatBnDate(ord.date)} ({ord.time})
                        </div>
                      </div>

                      {/* Items List */}
                      {ord.items && ord.items.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-amber-400" /> আইটেম বিবরণ ({toBnDigit(ord.items.length)}টি):
                          </span>
                          <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                            {ord.items.map((item, idx) => {
                              const artCode = item.articleCode || (item as any).articleNo || '';
                              const pName = item.productName || (item as any).name || 'জুতা';
                              const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
                              const totPrice = item.totalAmount ?? (item as any).totalPrice ?? (item as any).itemTotal ?? 0;

                              return (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-0">
                                  <div>
                                    <span className="font-bold text-amber-300 font-mono text-xs">{artCode ? `${artCode} - ` : ''}{pName}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-slate-200">{toBnDigit(pairs)} জোড়া</span>
                                    <span className="text-[10px] text-slate-400 block">{formatTaka(totPrice)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Financials Summary */}
                      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <span className="text-slate-400">মোট বুকিং বিল:</span>
                        <span className="text-base font-black text-amber-300">{formatTaka(ord.grandTotal)}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-end flex-wrap gap-1.5">
                        {isUnclaimed && onClaimOrder && (
                          <button
                            type="button"
                            onClick={() => onClaimOrder(ord.id)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                            title="এই অর্ডারটি ক্লেইম করে আপনার দায়িত্বে নিন"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>ক্লেইম</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingOrder(ord)}
                          className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>এডিট</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectOrderForInvoice(ord)}
                          className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>প্রিন্ট</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onConfirmDelivery(ord.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>ডেলিভারি</span>
                        </button>

                        {onDeleteOrder && (
                          confirmingDeleteId === ord.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-500/50">
                              <span className="text-[10px] font-bold text-rose-300 px-1">রিমুভ?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteOrder(ord.id);
                                  setConfirmingDeleteId(null);
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black shadow transition cursor-pointer"
                              >
                                হ্যাঁ
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteId(null)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                না
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(ord.id)}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="বাতিল বা ফেক অর্ডার রিমুভ করুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>বাতিল</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW (Matching SalesHistory table structure) */
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-medium pb-2">
                  <th className="pb-3 pr-3">মেমো নং</th>
                  <th className="pb-3 px-3">তারিখ ও সময়</th>
                  <th className="pb-3 px-3">দোকানের নাম</th>
                  <th className="pb-3 px-3">পরিমাণ</th>
                  <th className="pb-3 px-3 text-right">মোট বিল</th>
                  <th className="pb-3 px-3 text-center">স্ট্যাটাস</th>
                  <th className="pb-3 pl-3 text-right">ডিটেইলস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredOrders.map((ord) => {
                  const isUnclaimed =
                    !ord.sellerId ||
                    !ord.isClaimed ||
                    ord.sellerName.includes('উন্মুক্ত') ||
                    ord.sellerName.includes('অনির্ধারিত');
                  const isExpanded = expandedOrderId === ord.id;

                  return (
                    <React.Fragment key={ord.id}>
                      {/* Collapsed Main Row */}
                      <tr
                        onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                        className={`hover:bg-slate-800/50 cursor-pointer transition-colors select-none ${
                          isExpanded ? 'bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="py-3.5 pr-3 font-mono font-black text-amber-300">
                          #{ord.memoNo}
                        </td>
                        <td className="py-3.5 px-3 text-slate-300 font-medium">
                          {formatBnDate(ord.date)}
                          {ord.time && <span className="text-[10px] text-amber-400/90 ml-1">({ord.time})</span>}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{ord.shopName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-200 font-bold">
                          {toBnDigit(ord.totalPairs)} জোড়া{' '}
                          <span className="text-amber-300 text-[11px]">({getDozenText(ord.totalPairs)})</span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-amber-300">
                          {formatTaka(ord.grandTotal)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {isUnclaimed ? (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow">
                              উন্মুক্ত
                            </span>
                          ) : (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              {t('sample_booked_tag')}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedOrderId(isExpanded ? null : ord.id);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-slate-700/80 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                            title={isExpanded ? 'সংকোচন' : 'ডিটেইলস দেখুন'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Detail View Row */}
                      {isExpanded && (
                        <tr className="bg-slate-900/60 border-b border-slate-800">
                          <td colSpan={7} className="p-4">
                            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                                <div>
                                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                    <span>মেমো #{ord.memoNo}</span>
                                    <span className="text-slate-400 font-normal text-xs">({ord.shopName})</span>
                                  </h4>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    প্রোপ্রাইটর: <strong className="text-slate-200">{ord.customerName}</strong> ({ord.customerPhone}) | সেলার: <strong className={isUnclaimed ? 'text-amber-400' : 'text-indigo-300'}>{ord.sellerName || 'উন্মুক্ত বুকিং'}</strong> | তারিখ: {formatBnDate(ord.date)} ({ord.time})
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                                  {isUnclaimed && onClaimOrder && (
                                    <button
                                      type="button"
                                      onClick={() => onClaimOrder(ord.id)}
                                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow transition cursor-pointer"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>ক্লেইম করুন</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setEditingOrder(ord)}
                                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>আইটেম এডিট</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onSelectOrderForInvoice(ord)}
                                    className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>মেমো প্রিন্ট</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onConfirmDelivery(ord.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow transition cursor-pointer"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>ডেলিভারি দিন</span>
                                  </button>

                                  {onDeleteOrder && (
                                    confirmingDeleteId === ord.id ? (
                                      <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-500/50">
                                        <span className="text-[10px] font-bold text-rose-300 px-1">রিমুভ?</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onDeleteOrder(ord.id);
                                            setConfirmingDeleteId(null);
                                          }}
                                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black shadow transition cursor-pointer"
                                        >
                                          হ্যাঁ
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmingDeleteId(null)}
                                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                                        >
                                          না
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmingDeleteId(ord.id)}
                                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>রিমুভ</span>
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Item Breakdown */}
                              {ord.items && ord.items.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" /> বুকিং করা আইটেম তালিকা ({toBnDigit(ord.items.length)}টি):
                                  </span>
                                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 max-h-48 overflow-y-auto space-y-2 text-xs">
                                    {ord.items.map((item, idx) => {
                                      const artCode = item.articleCode || (item as any).articleNo || '-';
                                      const prodName = item.productName || (item as any).name || '';
                                      const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
                                      const price = item.unitSellPrice ?? (item as any).rate ?? 0;
                                      const itemTotal = item.totalAmount ?? (item as any).itemTotal ?? (pairs * price);

                                      return (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/80 last:border-0">
                                          <div>
                                            <div className="font-bold text-amber-300 font-mono">{artCode}</div>
                                            <div className="text-slate-300 text-xs">{prodName}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-slate-100 font-bold">{toBnDigit(pairs)} জোড়া</div>
                                            <div className="text-slate-400 text-[11px]">
                                              @{formatTaka(price)} = <span className="text-amber-300 font-bold">{formatTaka(itemTotal)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingOrder && (
        <EditPendingOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={(updated) => {
            onUpdateOrder(updated);
            setEditingOrder(null);
          }}
        />
      )}
    </div>
  );
};
