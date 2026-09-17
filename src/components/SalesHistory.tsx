import React, { useState, useEffect } from 'react';
import { Order, UITheme, UserRole, ShoeProduct } from '../types';
import { formatTaka, toBnDigit, formatBnDate, getLocalDateStr, compareOrdersNewestFirst } from '../utils/formatters';
import {
  History,
  Search,
  Printer,
  CheckCircle,
  List,
  LayoutGrid,
  Store,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  MoreVertical,
  Download,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  Calendar,
  X,
  Clock,
  Filter,
} from 'lucide-react';
import { EditPendingOrderModal } from './EditPendingOrderModal';

interface SalesHistoryProps {
  orders: Order[];
  products?: ShoeProduct[];
  activeTheme: UITheme;
  onSelectOrderForInvoice: (order: Order) => void;
  onConfirmDelivery: (orderId: string) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
  currentUserRole?: UserRole;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  orders,
  products = [],
  activeTheme,
  onSelectOrderForInvoice,
  onConfirmDelivery,
  onUpdateOrder,
  onDeleteOrder,
  currentUserRole = 'admin',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('সব');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('সব');
  
  // Date filter states
  type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom';
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'card' : 'table'
  );

  // Pagination state for scalable memo handling
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin';
  const isCustomer = currentUserRole === 'customer';

  // Handle date preset selection
  const handleSelectDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const today = getLocalDateStr(now);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setShowCustomPicker(false);
    } else if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
      setShowCustomPicker(false);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateStr(y);
      setStartDate(yStr);
      setEndDate(yStr);
      setShowCustomPicker(false);
    } else if (preset === '7days') {
      const w = new Date(now);
      w.setDate(w.getDate() - 6);
      setStartDate(getLocalDateStr(w));
      setEndDate(today);
      setShowCustomPicker(false);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(getLocalDateStr(firstDay));
      setEndDate(today);
      setShowCustomPicker(false);
    } else if (preset === 'custom') {
      setShowCustomPicker(true);
    }
  };

  const handleClearDateFilter = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setShowCustomPicker(false);
  };

  const getDateRangeLabel = () => {
    if (!startDate && !endDate) return null;
    const now = new Date();
    const today = getLocalDateStr(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    if (startDate && endDate && startDate === endDate) {
      if (startDate === today) return `আজকের বিক্রি (${formatBnDate(startDate)})`;
      if (startDate === yesterdayStr) return `গতকালের বিক্রি (${formatBnDate(startDate)})`;
      return `${formatBnDate(startDate)} তারিখের বিক্রি`;
    }
    if (startDate && endDate) {
      return `${formatBnDate(startDate)} থেকে ${formatBnDate(endDate)}`;
    }
    if (startDate) {
      return `${formatBnDate(startDate)} হতে পরবর্তী সকল`;
    }
    if (endDate) {
      return `${formatBnDate(endDate)} পর্যন্ত`;
    }
    return null;
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, deliveryFilter, startDate, endDate, datePreset, pageSize]);

  // Click outside to close 3-dot menu
  useEffect(() => {
    const handleWindowClick = () => {
      setOpenMenuId(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const getDozenText = (pairs: number) => {
    const dozen = (pairs / 12).toFixed(1).replace(/\.0$/, '');
    return `${toBnDigit(dozen)} ডজন`;
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      (ord.memoNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.shopName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.sellerName || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'সব' || ord.status === statusFilter;
    const matchesDelivery =
      deliveryFilter === 'সব' ||
      (deliveryFilter === 'booked' && ord.deliveryStatus === 'booked') ||
      (deliveryFilter === 'delivered' && (ord.deliveryStatus === 'delivered' || !ord.deliveryStatus));
    
    // Date matching
    const matchesDate = (() => {
      if (!startDate && !endDate) return true;
      if (!ord.date) return false;
      if (startDate && endDate) {
        return ord.date >= startDate && ord.date <= endDate;
      }
      if (startDate) {
        return ord.date >= startDate;
      }
      if (endDate) {
        return ord.date <= endDate;
      }
      return true;
    })();

    return matchesSearch && matchesStatus && matchesDelivery && matchesDate;
  }).sort(compareOrdersNewestFirst);

  const totalFilteredSales = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalFilteredPaid = filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalFilteredDue = filteredOrders.reduce((sum, o) => sum + (o.dueAmount || 0), 0);
  const totalFilteredPairs = filteredOrders.reduce((sum, o) => sum + o.totalPairs, 0);

  // Pagination calculation
  const totalItems = filteredOrders.length;
  const isShowAll = pageSize >= 99999;
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = isShowAll ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = isShowAll ? totalItems : Math.min(startIndex + pageSize, totalItems);
  const displayedOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    const target = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(target);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Generate pagination numbers list (with windowing)
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  // Render 3-Dot Action Dropdown Menu
  const renderActionMenu = (ord: Order) => {
    const isBooked = ord.deliveryStatus === 'booked';
    const isOpen = openMenuId === ord.id;

    return (
      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpenMenuId(isOpen ? null : ord.id)}
          className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            isOpen
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-500/40'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border-slate-700/80 shadow-sm'
          }`}
          title="৩-ডট অপশন মেনু"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isOpen && (
          <div
            className="absolute right-0 mt-1.5 w-56 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 py-1.5 divide-y divide-slate-800 text-xs animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 font-mono flex items-center justify-between">
              <span>মেমো #{ord.memoNo}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                isBooked ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isBooked ? 'বুকড' : 'ডেলিভার্ড'}
              </span>
            </div>

            <div className="py-1">
              {/* মেমো ডাউনলোড ও দেখুন */}
              <button
                type="button"
                onClick={() => {
                  onSelectOrderForInvoice(ord);
                  setOpenMenuId(null);
                }}
                className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-800 hover:text-amber-300 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold block text-slate-100">মেমো ডাউনলোড</span>
                  <span className="text-[10px] text-slate-400 block">PDF ও ছবি সেভ / প্রিন্ট</span>
                </div>
              </button>

              {/* শুধু এডমিনের জন্য মেমো এডিট অপশন (মাল এড ও ডিলেট) */}
              {isAdmin && onUpdateOrder && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingOrder(ord);
                    setOpenMenuId(null);
                  }}
                  className="w-full text-left px-3.5 py-2 text-amber-300 hover:bg-amber-950/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-100">মেমো এডিট করুন</span>
                    <span className="text-[10px] text-amber-400/80 block">মাল এড, বাদ ও দর পরিবর্তন (এডমিন)</span>
                  </div>
                </button>
              )}

              {/* ডেলিভারি দিন যদি বুকিং থাকে */}
              {isBooked && (
                <button
                  type="button"
                  onClick={() => {
                    onConfirmDelivery(ord.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full text-left px-3.5 py-2 text-emerald-300 hover:bg-emerald-950/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">ডেলিভারি সম্পন্ন করুন</span>
                </button>
              )}
            </div>

            {/* শুধু এডমিনের জন্য ইনভয়েস/মেমো ডিলেট অপশন */}
            {isAdmin && onDeleteOrder && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOrderToDelete(ord);
                    setOpenMenuId(null);
                  }}
                  className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-bold block">মেমো / ইনভয়েস ডিলেট</span>
                    <span className="text-[10px] text-rose-300/70 block">এডমিন কনফার্মেশন সহ</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Minimal Header */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-black text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            {isCustomer ? 'আপনার অর্ডার হিস্টোরি' : 'বিক্রয় ইতিহাস'}
          </span>
          <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-slate-800 to-transparent flex-1" />
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
      <div className={`${activeTheme.cardClass} p-4 rounded-2xl space-y-3.5`}>
        {/* Top Controls: Search, Status, Delivery, View Switcher */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="মেমো বা কাস্টমার খুঁজুন..."
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
              <option value="সব">সব ডেলিভারি</option>
              <option value="booked">বুকিং (পেন্ডিং)</option>
              <option value="delivered">ডেলিভারি সম্পন্ন</option>
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

        {/* Date Filter Toolbar: Quick Presets & Calendar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-wrap">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              তারিখ:
            </span>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                datePreset === 'all' && !startDate && !endDate
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              সব সময়
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                datePreset === 'today'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              আজকের
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('yesterday')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                datePreset === 'yesterday'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              গতকাল
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('7days')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                datePreset === '7days'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              গত ৭ দিন
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('month')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                datePreset === 'month'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              চলতি মাস
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCustomPicker(!showCustomPicker);
                if (!showCustomPicker) setDatePreset('custom');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                showCustomPicker || datePreset === 'custom'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Calendar className="w-3 h-3" />
              ক্যালেন্ডার নির্বাচন
              {showCustomPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="তারিখ ফিল্টার মুছুন"
              >
                <X className="w-3 h-3" />
                রিসেট
              </button>
            )}
          </div>

          {/* Quick Active Date Label if filtered */}
          {getDateRangeLabel() && (
            <div className="text-xs text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1.5 self-start md:self-auto shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{getDateRangeLabel()}</span>
            </div>
          )}
        </div>

        {/* Expandable Custom Date Range Inputs */}
        {showCustomPicker && (
          <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">শুরু তারিখ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">শেষ তারিখ:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  const today = getLocalDateStr(new Date());
                  setStartDate(today);
                  setEndDate(today);
                  setDatePreset('today');
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                আজকে সেট করুন
              </button>
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300 border border-rose-500/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" /> ক্লিয়ার
              </button>
            </div>
          </div>
        )}

        {/* Date Filter Statistics Summary Ribbon */}
        {(startDate || endDate) && (
          <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {getDateRangeLabel()}:
              </span>
              <span className="text-slate-300">
                মোট মেমো: <strong className="text-white font-bold">{toBnDigit(filteredOrders.length)}</strong> টি
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                মোট জোড়া: <strong className="text-amber-300 font-bold">{toBnDigit(totalFilteredPairs)}</strong> ({getDozenText(totalFilteredPairs)})
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                মোট বিক্রি: <strong className="text-amber-400 font-bold">{formatTaka(totalFilteredSales)}</strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                নগদ আদায়: <strong className="text-emerald-400 font-bold">{formatTaka(totalFilteredPaid)}</strong>
              </span>
              {totalFilteredDue > 0 && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300">
                    বকেয়া: <strong className="text-rose-400 font-bold">{formatTaka(totalFilteredDue)}</strong>
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearDateFilter}
              className="text-[11px] text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded border border-slate-800 flex items-center gap-1 cursor-pointer ml-auto"
            >
              <X className="w-3 h-3" /> সব ইতিহাস দেখুন
            </button>
          </div>
        )}
      </div>

      {/* Sales Orders Container */}
      <div className={`${activeTheme.cardClass} p-4 sm:p-5 rounded-2xl`}>
        {/* Pagination & Count Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-medium">
              মোট মেমো: <strong className="text-amber-400 font-bold">{toBnDigit(totalItems)}</strong> টি
            </span>
            {totalItems > 0 && (
              <span className="text-slate-400 text-[11px]">
                (দেখাচ্ছে: <strong className="text-slate-200">{toBnDigit(startIndex + 1)} - {toBnDigit(endIndex)}</strong>)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-slate-400 text-[11px]">প্রতি পেজে:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700/90 text-xs text-amber-300 font-semibold rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value={15}>১৫ টি</option>
              <option value={25}>২৫ টি</option>
              <option value={50}>৫০ টি</option>
              <option value={100}>১০০ টি</option>
              <option value={999999}>সব মেমো</option>
            </select>
          </div>
        </div>

        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedOrders.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                কোনো বিক্রয় ইতিহাস পাওয়া যায়নি।
              </div>
            ) : (
              displayedOrders.map((ord, ordIdx) => {
                const isBooked = ord.deliveryStatus === 'booked';
                const isExpanded = expandedOrderId === ord.id;
                const isLatest = currentPage === 1 && ordIdx === 0 && !searchTerm;

                return (
                  <div
                    key={ord.id}
                    className={`bg-slate-950 border rounded-2xl transition-all shadow-md overflow-hidden ${
                      isExpanded ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Collapsed Overview Header */}
                    <div className="p-4 space-y-2 select-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-black text-amber-300">
                            #{ord.memoNo}
                          </span>
                          {isLatest && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 inline-flex items-center gap-0.5 shadow-sm">
                              সর্বশেষ
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              isBooked
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isBooked ? 'বুকড' : 'ডেলিভার্ড'}
                          </span>
                        </div>

                        {/* Action buttons (3-Dot & Expand) */}
                        <div className="flex items-center gap-1.5">
                          {renderActionMenu(ord)}
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition cursor-pointer"
                            title={isExpanded ? 'সংকোচন করুন' : 'বিস্তারিত দেখুন'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                        className="cursor-pointer space-y-2"
                      >
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

                        {/* Direct Bottom Actions */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {renderActionMenu(ord)}
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
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
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              মেমো ডাউনলোড
                            </button>
                          </div>
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
                  <th className="pb-3 pl-3 text-right">অ্যাকশন ও অপশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      কোনো বিক্রয় ইতিহাস পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  displayedOrders.map((ord, ordIdx) => {
                    const isBooked = ord.deliveryStatus === 'booked';
                    const isExpanded = expandedOrderId === ord.id;
                    const isLatest = currentPage === 1 && ordIdx === 0 && !searchTerm;

                    return (
                      <React.Fragment key={ord.id}>
                        {/* Collapsed Main Row: Memo, Date, Shop Name */}
                        <tr
                          onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                          className={`hover:bg-slate-800/50 cursor-pointer transition-colors select-none ${
                            isExpanded ? 'bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 pr-3 font-mono font-black text-amber-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>#{ord.memoNo}</span>
                              {isLatest && (
                                <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded shadow-sm">
                                  সর্বশেষ
                                </span>
                              )}
                            </div>
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
                          <td className="py-3.5 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 3-Dot Options Menu */}
                              {renderActionMenu(ord)}

                              {/* Expand toggle */}
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
                            </div>
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
                                    {renderActionMenu(ord)}
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
                                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      মেমো ডাউনলোড ও প্রিন্ট
                                    </button>
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

        {/* Bottom Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              পেজ <strong className="text-amber-400 font-mono font-bold">{toBnDigit(safeCurrentPage)}</strong> / <span className="font-mono">{toBnDigit(totalPages)}</span> (মোট {toBnDigit(totalItems)} টি মেমো)
            </div>

            <div className="flex items-center gap-1.5 select-none flex-wrap justify-center">
              {/* First Page */}
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => handlePageChange(1)}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-amber-400 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="প্রথম পেজ"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 text-xs font-semibold hover:text-amber-400 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">পূর্ববর্তী</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 mx-1">
                {getPageNumbers().map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1 text-slate-600 font-bold text-xs select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => handlePageChange(pageNum as number)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold font-mono transition cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-amber-300'
                      }`}
                    >
                      {toBnDigit(pageNum)}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 text-xs font-semibold hover:text-amber-400 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-1"
              >
                <span className="hidden sm:inline">পরবর্তী</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-amber-400 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="সর্বশেষ পেজ"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Delete Confirmation Modal */}
      {orderToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setOrderToDelete(null)}
        >
          <div
            className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">ইনভয়েস/মেমো ডিলেট নিশ্চিতকরণ</h3>
                <p className="text-xs text-rose-400 font-semibold">শুধুমাত্র এডমিন অধিকারভুক্ত অ্যাকশন</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">মেমো নং:</span>
                <span className="font-mono font-bold text-amber-300">#{orderToDelete.memoNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">দোকানের নাম:</span>
                <span className="font-bold text-white">{orderToDelete.shopName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">কাস্টমার/প্রোপ্রাইটর:</span>
                <span className="text-slate-300">{orderToDelete.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">তারিখ ও সময়:</span>
                <span className="text-slate-300">{formatBnDate(orderToDelete.date)} {orderToDelete.time ? `(${orderToDelete.time})` : ''}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800 pt-2 font-bold">
                <span className="text-slate-300">মোট বিক্রয় বিল ({toBnDigit(orderToDelete.totalPairs)} জোড়া):</span>
                <span className="text-amber-300 font-mono">{formatTaka(orderToDelete.grandTotal)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/30 border border-rose-500/30 p-3 rounded-xl text-rose-200">
              ⚠️ আপনি কি নিশ্চিতভাবে মেমো <strong>#{orderToDelete.memoNo}</strong> স্থায়ীভাবে ডিলিট করতে চান? ডিলিট করলে ডেলিভারি হয়ে থাকলে ইনভেন্টরি স্টক ও কাস্টমার বকেয়া স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteOrder && orderToDelete) {
                    onDeleteOrder(orderToDelete.id);
                    setOrderToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-900/30 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Memo Modal */}
      {editingOrder && onUpdateOrder && (
        <EditPendingOrderModal
          order={editingOrder}
          products={products}
          isSalesHistory={true}
          title={`বিক্রয় মেমো এডিট (মেমো #${editingOrder.memoNo})`}
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
