import React, { useState } from 'react';
import { Order, UITheme, UserRole } from '../types';
import { formatTaka, toBnDigit, formatBnDate } from '../utils/formatters';
import { History, Search, Filter, Printer, CheckCircle, PackageCheck, Truck, List, LayoutGrid, Store, User, Trash2, ChevronDown, ChevronUp, Eye, ShoppingBag } from 'lucide-react';

interface SalesHistoryProps {
  orders: Order[];
  activeTheme: UITheme;
  onSelectOrderForInvoice: (order: Order) => void;
  onConfirmDelivery: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  currentUserRole?: UserRole;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  orders,
  activeTheme,
  onSelectOrderForInvoice,
  onConfirmDelivery,
  onDeleteOrder,
  currentUserRole = 'admin',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('সব');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('সব');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'card' : 'table'
  );

  const isCustomer = currentUserRole === 'customer';

  const getDozenText = (pairs: number) => {
    const dozen = (pairs / 12).toFixed(1).replace(/\.0$/, '');
    return `${toBnDigit(dozen)} ডজন`;
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.memoNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.sellerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'সব' || ord.status === statusFilter;
    const matchesDelivery =
      deliveryFilter === 'সব' ||
      (deliveryFilter === 'booked' && ord.deliveryStatus === 'booked') ||
      (deliveryFilter === 'delivered' && (ord.deliveryStatus === 'delivered' || !ord.deliveryStatus));
    const matchesDate = !dateFilter || ord.date === dateFilter;

    return matchesSearch && matchesStatus && matchesDelivery && matchesDate;
  }).sort((a, b) => {
    // Newest first sorting by Date, Time, and ID
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    if (a.time && b.time && a.time !== b.time) {
      return b.time.localeCompare(a.time);
    }
    return b.id.localeCompare(a.id);
  });

  const totalFilteredSales = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalFilteredPairs = filteredOrders.reduce((sum, o) => sum + o.totalPairs, 0);

  return (
    <div className="space-y-6">
      
      {/* Minimal Header */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-400" />
            {isCustomer ? 'আপনার অর্ডার হিস্টোরি' : 'বিক্রয় ইতিহাস'}
          </span>
          <div className="h-px bg-gradient-to-r from-amber-500/40 via-slate-800 to-transparent flex-1" />
        </div>

        <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shrink-0">
          <div>
            <span className="text-slate-400 text-[11px] mr-1">{isCustomer ? 'মোট অর্ডার ক্রয়:' : 'মোট বিক্রি:'}</span>
            <span className="font-bold text-amber-300">{formatTaka(totalFilteredSales)}</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 text-[11px] mr-1">জোড়া:</span>
            <span className="font-bold text-slate-200">{toBnDigit(totalFilteredPairs)}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar & View Switcher */}
      <div className={`${activeTheme.cardClass} p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="মেমো নম্বর, কাস্টমার বা দোকান খুঁজুন..."
            className="bg-transparent text-xs text-slate-100 placeholder-slate-500 w-full focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto flex-wrap justify-between sm:justify-end">
          {/* Delivery Status Filter */}
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="সব">সব</option>
            <option value="booked">বুকিং (পেন্ডিং)</option>
            <option value="delivered">ডেলিভারি</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="সব">পেমেন্ট স্ট্যাটাস</option>
            <option value="পরিশোধিত">পরিশোধিত</option>
            <option value="আংশিক বাকী">আংশিক বাকী</option>
            <option value="সম্পূর্ণ বাকী">সম্পূর্ণ বাকী</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
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

      {/* Sales Orders Container */}
      <div className={`${activeTheme.cardClass} p-4 sm:p-5 rounded-2xl`}>
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                কোনো বিক্রয় ইতিহাস পাওয়া যায়নি।
              </div>
            ) : (
              filteredOrders.map((ord) => {
                const isBooked = ord.deliveryStatus === 'booked';
                const isExpanded = expandedOrderId === ord.id;

                return (
                  <div
                    key={ord.id}
                    className={`bg-slate-950 border rounded-2xl transition-all shadow-md overflow-hidden ${
                      isExpanded ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Collapsed Overview Header - Click to Explore */}
                    <div
                      onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                      className="p-4 cursor-pointer hover:bg-slate-900/60 transition-colors space-y-2 select-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-black text-amber-300 flex items-center gap-1.5">
                          #{ord.memoNo}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              isBooked
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isBooked ? 'বুকড' : 'ডেলিভার্ড'}
                          </span>
                        </span>
                        <div className="p-1 text-amber-400 flex items-center">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
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
                        {/* Customer & Seller info */}
                        <div className="text-xs space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60">
                          <div className="text-slate-300">
                            <span className="text-slate-400">প্রোপ্রাইটর:</span> <strong className="text-white">{ord.customerName}</strong>
                          </div>
                          <div className="text-slate-300">
                            <span className="text-slate-400">সেলার:</span> <strong className="text-indigo-300">{ord.sellerName}</strong>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            তারিখ ও সময়: {formatBnDate(ord.date)} ({ord.time})
                          </div>
                        </div>

                        {/* Financials Grid */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">নিট বিল</span>
                            <span className="font-black text-amber-300">{formatTaka(ord.grandTotal)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">জমা</span>
                            <span className="font-bold text-emerald-400">{formatTaka(ord.paidAmount)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">বাকী</span>
                            <span className="font-bold text-rose-400">{formatTaka(ord.dueAmount)}</span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-300 flex items-center justify-between px-1">
                          <span>মোট জুতা পরিমাণ:</span>
                          <strong className="text-white font-bold">{toBnDigit(ord.totalPairs)} জোড়া ({getDozenText(ord.totalPairs)})</strong>
                        </div>

                        {/* Items list if available */}
                        {ord.items && ord.items.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-amber-400" /> আইটেম বিবরণ ({toBnDigit(ord.items.length)}টি):
                            </span>
                            <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 max-h-48 overflow-y-auto space-y-1.5 text-[11px]">
                              {ord.items.map((item, idx) => {
                                const artCode = item.articleCode || (item as any).articleNo || '-';
                                const prodName = item.productName || (item as any).name || '';
                                const sizes = item.sizeRange || (item as any).size || (item as any).color || '';
                                const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
                                const price = item.unitSellPrice ?? (item as any).rate ?? 0;
                                const itemTotal = item.totalAmount ?? (item as any).itemTotal ?? (pairs * price);
                                const qtyInput = item.quantityInput || pairs;
                                const unitLabel = item.unitType === 'cartons' ? 'ডজন' : 'জোড়া';

                                return (
                                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-0">
                                    <div>
                                      <div className="font-bold text-amber-300 font-mono text-xs">{artCode}</div>
                                      <div className="text-slate-300 text-[10px]">
                                        {prodName} {sizes ? `(${sizes})` : ''}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-slate-200 font-bold">
                                        {toBnDigit(qtyInput)} {unitLabel} {item.unitType === 'cartons' ? `(${toBnDigit(pairs)} জোড়া)` : ''}
                                      </div>
                                      <div className="text-slate-400 text-[10px]">
                                        @{formatTaka(price)} = <span className="text-emerald-400 font-bold">{formatTaka(itemTotal)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                          {isBooked && (
                            <button
                              onClick={() => onConfirmDelivery(ord.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow transition-colors cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              ডেলিভারি দিন
                            </button>
                          )}
                          <button
                            onClick={() => onSelectOrderForInvoice(ord)}
                            className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            মেমো প্রিন্ট
                          </button>
                          {onDeleteOrder && ord.deliveryStatus !== 'delivered' && (
                            confirmingDeleteId === ord.id ? (
                              <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-500/50">
                                <span className="text-[10px] font-bold text-rose-300 px-1">রিমুভ?</span>
                                <button
                                  onClick={() => {
                                    onDeleteOrder(ord.id);
                                    setConfirmingDeleteId(null);
                                  }}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black shadow transition cursor-pointer"
                                >
                                  হ্যাঁ
                                </button>
                                <button
                                  onClick={() => setConfirmingDeleteId(null)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  না
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingDeleteId(ord.id)}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="ফেক বা ভুল মেমো/অর্ডার রিমুভ করুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>রিমুভ</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-medium pb-2">
                  <th className="pb-3 pr-3">মেমো নং</th>
                  <th className="pb-3 px-3">তারিখ ও সময়</th>
                  <th className="pb-3 px-3">দোকানের নাম</th>
                  <th className="pb-3 px-3">পরিমাণ</th>
                  <th className="pb-3 px-3 text-center">স্ট্যাটাস</th>
                  <th className="pb-3 pl-3 text-right">ডিটেইলস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      কোনো বিক্রয় ইতিহাস পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const isBooked = ord.deliveryStatus === 'booked';
                    const isExpanded = expandedOrderId === ord.id;

                    return (
                      <React.Fragment key={ord.id}>
                        {/* Collapsed Main Row: Memo, Date, Shop Name */}
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
                            {toBnDigit(ord.totalPairs)} জোড়া <span className="text-amber-300 text-[11px]">({getDozenText(ord.totalPairs)})</span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                isBooked
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {isBooked ? 'বুকড' : 'ডেলিভার্ড'}
                            </span>
                          </td>
                          <td className="py-3.5 pl-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedOrderId(isExpanded ? null : ord.id);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-slate-700/80 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                              title={isExpanded ? 'সংকোচন' : 'এক্সপ্লোর'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Detail View Row */}
                        {isExpanded && (
                          <tr className="bg-slate-900/60 border-b border-slate-800">
                            <td colSpan={6} className="p-4">
                              <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                                  <div>
                                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                      <span>মেমো #{ord.memoNo}</span>
                                      <span className="text-slate-400 font-normal text-xs">({ord.shopName})</span>
                                    </h4>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                      প্রোপ্রাইটর: <strong className="text-slate-200">{ord.customerName}</strong> | সেলার: <strong className="text-indigo-300">{ord.sellerName}</strong> | তারিখ: {formatBnDate(ord.date)} ({ord.time})
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {isBooked && (
                                      <button
                                        onClick={() => onConfirmDelivery(ord.id)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow transition-colors cursor-pointer"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        ডেলিভারি দিন
                                      </button>
                                    )}
                                    <button
                                      onClick={() => onSelectOrderForInvoice(ord)}
                                      className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                      মেমো প্রিন্ট
                                    </button>
                                    {onDeleteOrder && ord.deliveryStatus !== 'delivered' && (
                                      confirmingDeleteId === ord.id ? (
                                        <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-500/50">
                                          <span className="text-[10px] font-bold text-rose-300 px-1">রিমুভ?</span>
                                          <button
                                            onClick={() => {
                                              onDeleteOrder(ord.id);
                                              setConfirmingDeleteId(null);
                                            }}
                                            className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black shadow transition cursor-pointer"
                                          >
                                            হ্যাঁ
                                          </button>
                                          <button
                                            onClick={() => setConfirmingDeleteId(null)}
                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                                          >
                                            না
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmingDeleteId(ord.id)}
                                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                          title="ফেক বা ভুল মেমো/অর্ডার রিমুভ করুন"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>

                                {/* Financial Summary Bar */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs">
                                  <div>
                                    <span className="text-slate-400 text-[10px] block">মোট বিল</span>
                                    <span className="font-bold text-white text-sm">{formatTaka(ord.grandTotal)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 text-[10px] block">জমা</span>
                                    <span className="font-bold text-emerald-400 text-sm">{formatTaka(ord.paidAmount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 text-[10px] block">বাকী/ডিউ</span>
                                    <span className="font-bold text-rose-400 text-sm">{formatTaka(ord.dueAmount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 text-[10px] block">পরিবহন / নোট</span>
                                    <span className="font-medium text-slate-300 text-xs truncate block">{ord.transportName || ord.notes || 'N/A'}</span>
                                  </div>
                                </div>

                                {/* Item breakdown if present */}
                                {ord.items && ord.items.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                      <ShoppingBag className="w-3.5 h-3.5" />
                                      বিক্রিত পণ্যসামগ্রী বিস্তারিত ({toBnDigit(ord.items.length)}টি):
                                    </h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="border-b border-slate-800 text-slate-400 font-medium">
                                            <th className="pb-2 pr-2">আর্টিকেল নং</th>
                                            <th className="pb-2 px-2">পণ্যের নাম</th>
                                            <th className="pb-2 px-2">সাইজ</th>
                                            <th className="pb-2 px-2 text-center">পরিমাণ (ইনপুট)</th>
                                            <th className="pb-2 px-2 text-center">মোট জোড়া</th>
                                            <th className="pb-2 px-2 text-right">দর (৳)</th>
                                            <th className="pb-2 pl-2 text-right">মোট (৳)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                          {ord.items.map((item, idx) => {
                                            const artCode = item.articleCode || (item as any).articleNo || (item as any).article || '-';
                                            const prodName = item.productName || (item as any).name || (item as any).category || 'জুতা';
                                            const sizes = item.sizeRange || (item as any).size || (item as any).color || '-';
                                            const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
                                            const price = item.unitSellPrice ?? (item as any).rate ?? (item as any).price ?? 0;
                                            const itemTotal = item.totalAmount ?? (item as any).itemTotal ?? (pairs * price);
                                            const qtyInput = item.quantityInput || pairs;
                                            const unitLabel = item.unitType === 'cartons' ? 'ডজন' : 'জোড়া';

                                            return (
                                              <tr key={idx} className="hover:bg-slate-900/40">
                                                <td className="py-2 pr-2 font-mono font-bold text-amber-300">{artCode}</td>
                                                <td className="py-2 px-2 text-slate-200 font-semibold">{prodName}</td>
                                                <td className="py-2 px-2 text-slate-400 font-mono">{sizes}</td>
                                                <td className="py-2 px-2 text-center text-slate-300">{toBnDigit(qtyInput)} {unitLabel}</td>
                                                <td className="py-2 px-2 text-center font-bold text-slate-200">{toBnDigit(pairs)} জোড়া</td>
                                                <td className="py-2 px-2 text-right text-slate-300">{formatTaka(price)}</td>
                                                <td className="py-2 pl-2 text-right font-bold text-emerald-400">{formatTaka(itemTotal)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
