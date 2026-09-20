import React, { useState, useMemo } from 'react';
import { SalesRep, Order, Customer, DuePaymentLog, User } from '../types';
import { Users, TrendingUp, ShoppingCart, ShieldCheck, DollarSign, Wallet, CheckCircle2, Percent, Target } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { toBnDigit, formatTaka, getLocalDateStr } from '../utils/formatters';

interface SellerTrackingProps {
  sellers: SalesRep[];
  orders: Order[];
  customers: Customer[] | any[];
  paymentLogs?: DuePaymentLog[];
  currentUser?: User;
  onUpdateSeller?: (updatedSeller: SalesRep) => void;
}

export const SellerTracking: React.FC<SellerTrackingProps> = ({
  sellers,
  orders,
  customers,
  paymentLogs = [],
  currentUser,
  onUpdateSeller,
}) => {
  const { t } = useLanguage();
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('month');

  // Edit target & commission modal state
  const [editingSeller, setEditingSeller] = useState<SalesRep | null>(null);
  const [editTargetPairs, setEditTargetPairs] = useState<number | string>('');
  const [editTargetAmount, setEditTargetAmount] = useState<number | string>('');
  const [editCommissionRate, setEditCommissionRate] = useState<number | string>('');
  const [editCommissionPerPair, setEditCommissionPerPair] = useState<number | string>('');
  const [editCommissionType, setEditCommissionType] = useState<'percent' | 'per_pair' | 'both'>('percent');

  const openSellerEditModal = (seller: SalesRep) => {
    setEditingSeller(seller);
    setEditTargetPairs(seller.monthlyTargetPairs || '');
    setEditTargetAmount(seller.monthlyTargetAmount || '');
    setEditCommissionRate(seller.commissionRatePercent ?? '');
    setEditCommissionPerPair(seller.commissionPerPair ?? '');
    const cType: 'percent' | 'per_pair' | 'both' = seller.commissionType ||
      (seller.commissionPerPair && !seller.commissionRatePercent ? 'per_pair' :
       seller.commissionPerPair && seller.commissionRatePercent ? 'both' : 'percent');
    setEditCommissionType(cType);
  };

  const handleUpdateSellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSeller && onUpdateSeller) {
      onUpdateSeller({
        ...editingSeller,
        monthlyTargetPairs: Number(editTargetPairs) || 0,
        monthlyTargetAmount: Number(editTargetAmount) || 0,
        commissionRatePercent: Number(editCommissionRate) || 0,
        commissionPerPair: Number(editCommissionPerPair) || 0,
        commissionType: editCommissionType,
      });
      setEditingSeller(null);
    }
  };

  // Filter orders and payments by date using local time
  const { filteredOrders, filteredPaymentLogs } = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = getLocalDateStr(weekAgo);

    const matchDate = (dateString?: string) => {
      if (!dateString) return false;
      if (dateFilter === 'today') return dateString === todayStr;
      if (dateFilter === '7days') return dateString >= weekStr && dateString <= todayStr;
      if (dateFilter === 'month') {
        const d = new Date(dateString);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    const fOrders = orders.filter((o) => matchDate(o.date));
    const fPayments = paymentLogs.filter((p) => matchDate(p.date));

    return { filteredOrders: fOrders, filteredPaymentLogs: fPayments };
  }, [orders, paymentLogs, dateFilter]);

  // Aggregate stats per seller (including Admin + Seller)
  const sellerStats = useMemo(() => {
    const now = new Date();
    return sellers.map((seller) => {
      // Robust order matching for seller or admin
      const isSellerOrder = (o: Order) => {
        if (!o.sellerId && !o.sellerName) return false;
        const matchId = o.sellerId === seller.id || (seller.phone && o.sellerId === seller.phone);
        const matchName =
          o.sellerName &&
          seller.name &&
          ((o.sellerName || "").toLowerCase() === (seller.name || "").toLowerCase() ||
            (seller.name || "").toLowerCase().includes((o.sellerName || "").toLowerCase()) ||
            (o.sellerName || "").toLowerCase().includes((seller.name || "").toLowerCase()));
        return matchId || matchName;
      };

      const sellerOrders = filteredOrders.filter(isSellerOrder);

      // Explicitly calculate current month stats for Target Progress (always from 1st of current month)
      const currentMonthOrders = orders.filter((o) => {
        if (!o.date) return false;
        const oDate = new Date(o.date);
        return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
      }).filter(isSellerOrder);

      const currentMonthPairsSold = currentMonthOrders.reduce((sum, o) => sum + o.totalPairs, 0);
      const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + (o.netPayable || o.grandTotal || 0), 0);

      const activeCustomersCount = new Set(sellerOrders.map((o) => o.customerId)).size;
      const totalPairsSold = sellerOrders.reduce((sum, o) => sum + o.totalPairs, 0);
      const totalRevenue = sellerOrders.reduce((sum, o) => sum + (o.netPayable || o.grandTotal || 0), 0);

      // Customers assigned to this seller or admin
      const assignedCustomers = customers.filter((c) => {
        const cSellerId = c.assignedSellerId || c.sellerId;
        const cSellerName = c.assignedSellerName || c.sellerName;
        const matchId = cSellerId === seller.id || (seller.phone && cSellerId === seller.phone);
        const matchName =
          cSellerName &&
          seller.name &&
          (cSellerName.toLowerCase() === (seller.name || "").toLowerCase() ||
            (seller.name || "").toLowerCase().includes(cSellerName.toLowerCase()) ||
            cSellerName.toLowerCase().includes((seller.name || "").toLowerCase()));
        return matchId || matchName;
      });

      const assignedCustomersCount = assignedCustomers.length;
      const totalCustomerDue = assignedCustomers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

      // Due collected by this seller or admin for the selected filter period
      const collectedPayments = filteredPaymentLogs.filter((p) => {
        const matchSeller =
          p.sellerId === seller.id ||
          p.sellerName === seller.name ||
          p.receivedBy === seller.name ||
          (seller.phone && p.sellerId === seller.phone);
        return matchSeller;
      });
      const totalCollectedAmount = collectedPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

      const commRate = Number(seller.commissionRatePercent) || 0;
      const commPerPair = Number(seller.commissionPerPair) || 0;
      const periodCommission = Math.round((totalRevenue * commRate / 100) + (totalPairsSold * commPerPair));
      const currentMonthCommission = Math.round((currentMonthRevenue * commRate / 100) + (currentMonthPairsSold * commPerPair));

      const isAdminSeller =
        seller.isAdmin ||
        seller.role === 'admin' ||
        seller.name.includes('এডমিন') ||
        seller.area.includes('এডমিন') ||
        seller.area.includes('প্রধান শাখা');

      return {
        ...seller,
        isAdminSeller,
        totalOrders: sellerOrders.length,
        totalPairsSold,
        totalRevenue,
        currentMonthPairsSold,
        currentMonthRevenue,
        activeCustomersCount,
        assignedCustomersCount,
        totalCustomerDue,
        totalCollectedAmount,
        commissionRatePercent: commRate,
        commissionPerPair: commPerPair,
        periodCommission,
        currentMonthCommission,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue desc
  }, [sellers, filteredOrders, filteredPaymentLogs, customers, orders]);


  // Overall totals
  const totalTeamRevenue = sellerStats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalTeamPairs = sellerStats.reduce((sum, s) => sum + s.totalPairsSold, 0);
  const totalTeamDue = sellerStats.reduce((sum, s) => sum + s.totalCustomerDue, 0);
  const totalTeamCollected = sellerStats.reduce((sum, s) => sum + s.totalCollectedAmount, 0);
  const totalTeamCommission = sellerStats.reduce((sum, s) => sum + s.periodCommission, 0);

  return (
    <div className="space-y-6">
      {/* Minimal Header like Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-black text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            সেলস ট্র্যাকিং
          </span>
          <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-slate-800 to-transparent flex-1" />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
          {[
            { id: 'today', label: 'আজ' },
            { id: '7days', label: '৭ দিন' },
            { id: 'month', label: 'এই মাস' },
            { id: 'all', label: 'সব সময়' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setDateFilter(filter.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                dateFilter === filter.id
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>মোট সেলস</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight">{formatTaka(totalTeamRevenue)}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>মোট জোড়া</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-400 font-mono tracking-tight">{toBnDigit(totalTeamPairs)} <span className="text-xs font-normal text-slate-400">জোড়া</span></p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>অর্জিত কমিশন</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-300 font-mono tracking-tight">{formatTaka(totalTeamCommission)}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>আওতাধীন বাকী</span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-400 font-mono tracking-tight">{formatTaka(totalTeamDue)}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>আদায়কৃত বাকী</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight">{formatTaka(totalTeamCollected)}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sellerStats.map((stat) => (
          <div
            key={stat.id}
            className={`bg-slate-900 border rounded-2xl p-5 hover:border-amber-500/40 transition-colors shadow-md ${
              stat.isAdminSeller ? 'border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-900/90' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-black text-lg ${
                    stat.isAdminSeller
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-blue-400'
                  }`}
                >
                  {stat.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-slate-100 text-base leading-tight">{stat.name}</h3>
                    {stat.isAdminSeller ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <ShieldCheck className="w-3 h-3" /> এডমিন ও সেলার
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        ফিল্ড সেলার
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-slate-500" /> {toBnDigit(stat.assignedCustomersCount)} টি দোকান
                    {stat.area && stat.area !== 'প্রধান শাখা (এডমিন ও সেলার)' && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>{stat.area}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Commission Policy Badge */}
            <div className="mb-3.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-300 text-[11px] font-semibold flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                কমিশন নীতি:
              </span>
              <span className="text-amber-300 font-bold text-xs">
                {(stat.commissionRatePercent || 0) > 0 || (stat.commissionPerPair || 0) > 0 ? (
                  <>
                    {(stat.commissionRatePercent || 0) > 0 && `${toBnDigit(stat.commissionRatePercent)}% সেলস `}
                    {(stat.commissionPerPair || 0) > 0 &&
                      `${(stat.commissionRatePercent || 0) > 0 ? '+ ' : ''}৳${toBnDigit(stat.commissionPerPair)}/জোড়া`}
                  </>
                ) : (
                  <span className="text-slate-400 text-[11px] font-normal">সেট করা নেই</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">মোট বিক্রয় (জোড়া)</p>
                <p className="text-lg font-black text-amber-400">{toBnDigit(stat.totalPairsSold)}</p>
              </div>
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">নিট সেলস (৳)</p>
                <p className="text-lg font-black text-emerald-400">{formatTaka(stat.totalRevenue)}</p>
              </div>
            </div>

            {/* Dues and Collection row */}
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div className="bg-rose-950/20 rounded-xl p-2.5 border border-rose-900/30">
                <p className="text-[10px] text-rose-400/90 font-bold uppercase mb-0.5">আওতাধীন বাকী</p>
                <p className="text-sm font-bold text-rose-400">{formatTaka(stat.totalCustomerDue)}</p>
              </div>
              <div className="bg-emerald-950/20 rounded-xl p-2.5 border border-emerald-900/30">
                <p className="text-[10px] text-emerald-400/90 font-bold uppercase mb-0.5">আদায়কৃত বাকী</p>
                <p className="text-sm font-bold text-emerald-400">{formatTaka(stat.totalCollectedAmount)}</p>
              </div>
            </div>

            {/* Commission Earnings Card */}
            <div className="mb-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-amber-400" />
                    অর্জিত কমিশন ({dateFilter === 'month' ? 'এই মাস' : dateFilter === 'today' ? 'আজ' : dateFilter === '7days' ? '৭ দিন' : 'মোট'})
                  </p>
                  <p className="text-base font-black text-amber-300 mt-0.5">
                    {formatTaka(stat.periodCommission)}
                  </p>
                </div>
                {dateFilter !== 'month' && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">চলতি মাস</p>
                    <p className="text-xs font-bold text-slate-300 mt-0.5">
                      {formatTaka(stat.currentMonthCommission)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Target Progress Bars */}
            <div className="mb-4 space-y-3">
              {/* Pairs Target */}
              {(stat.monthlyTargetPairs || 0) > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">
                      টার্গেট জোড়া (এই মাস): <span className="text-slate-200">{toBnDigit(stat.monthlyTargetPairs || 0)}</span>
                    </span>
                    <span
                      className={
                        stat.currentMonthPairsSold >= (stat.monthlyTargetPairs || 1) ? 'text-amber-400' : 'text-blue-400'
                      }
                    >
                      {toBnDigit(
                        Math.min(100, Math.round((stat.currentMonthPairsSold / (stat.monthlyTargetPairs || 1)) * 100))
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stat.currentMonthPairsSold >= (stat.monthlyTargetPairs || 1) ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (stat.currentMonthPairsSold / (stat.monthlyTargetPairs || 1)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Amount Target */}
              {(stat.monthlyTargetAmount || 0) > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">
                      টার্গেট সেলস (এই মাস):{' '}
                      <span className="text-slate-200">{formatTaka(stat.monthlyTargetAmount || 0)}</span>
                    </span>
                    <span
                      className={
                        stat.currentMonthRevenue >= (stat.monthlyTargetAmount || 1) ? 'text-emerald-400' : 'text-blue-400'
                      }
                    >
                      {toBnDigit(
                        Math.min(100, Math.round((stat.currentMonthRevenue / (stat.monthlyTargetAmount || 1)) * 100))
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stat.currentMonthRevenue >= (stat.monthlyTargetAmount || 1) ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (stat.currentMonthRevenue / (stat.monthlyTargetAmount || 1)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5 text-slate-500" /> মোট অর্ডার: {toBnDigit(stat.totalOrders)}
              </span>
              <span>অ্যাক্টিভ কাস্টমার: {toBnDigit(stat.activeCustomersCount)}</span>
            </div>

            {/* Quick Set Target & Commission Button for Admin */}
            {onUpdateSeller && currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
              <div className="pt-2.5 mt-2.5 border-t border-slate-800/60 flex justify-end">
                <button
                  onClick={() => openSellerEditModal(stat)}
                  className="w-full py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/25 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span>টার্গেট ও কমিশন পরিবর্তন করুন</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {sellerStats.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
            কোনো সেলস বা সেলার ডেটা পাওয়া যায়নি।
          </div>
        )}
      </div>

      {/* Edit Seller Target & Commission Modal */}
      {editingSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 my-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <Percent className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                    টার্গেট ও কমিশন নির্ধারণ
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="text-amber-400 font-semibold">{editingSeller.name}</span>
                    {editingSeller.area && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>{editingSeller.area}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSeller(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSellerSubmit} className="space-y-4 text-xs">
              {/* Section 1: Monthly Target */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    মাসিক সেলস টার্গেট (Monthly Targets)
                  </span>
                  <span className="text-[10px] text-slate-500">লক্ষ্যমাত্রা</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1 text-[11px]">টার্গেট (জোড়া)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="যেমন: ১০০০"
                        value={editTargetPairs}
                        onChange={(e) => setEditTargetPairs(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 p-2.5 pr-10 rounded-xl focus:outline-none focus:border-amber-400 font-mono text-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">জোড়া</span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1 text-[11px]">টার্গেট (টাকায়)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="যেমন: ৩,০০,০০০"
                        value={editTargetAmount}
                        onChange={(e) => setEditTargetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 p-2.5 pr-8 rounded-xl focus:outline-none focus:border-emerald-400 font-mono text-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">৳</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Commission Setup */}
              <div className="bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    কমিশন কনফিগারেশন (Commission Setup)
                  </span>
                  <span className="text-[10px] text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-semibold">
                    ইনসেন্টিভ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1 text-[11px]">
                      কমিশন হার (% সেলসে)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="যেমন: ২.৫"
                        value={editCommissionRate}
                        onChange={(e) => setEditCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-bold p-2.5 pr-7 rounded-xl focus:outline-none focus:border-amber-400 font-mono text-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">মোট বিক্রিত টাকার ওপর</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1 text-[11px]">
                      প্রতি জোড়ায় কমিশন (৳)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="যেমন: ৫"
                        value={editCommissionPerPair}
                        onChange={(e) => setEditCommissionPerPair(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-bold p-2.5 pr-7 rounded-xl focus:outline-none focus:border-emerald-400 font-mono text-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xs">৳</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">প্রতি জোড়া বিক্রয়ের জন্য</span>
                  </div>
                </div>

                {/* Real-time Calculation Simulator */}
                {(() => {
                  const simulatedPairs = Number(editTargetPairs) || 1000;
                  const simulatedAmount = Number(editTargetAmount) || 200000;
                  const cRate = Number(editCommissionRate) || 0;
                  const cPair = Number(editCommissionPerPair) || 0;
                  const estimatedComm = Math.round((simulatedAmount * cRate / 100) + (simulatedPairs * cPair));

                  return (
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          টার্গেট পূর্ণ হলে সম্ভাব্য কমিশন:
                        </span>
                        <span className="text-emerald-400 font-black text-sm">
                          {formatTaka(estimatedComm)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        * টার্গেট {toBnDigit(simulatedPairs)} জোড়া বা {formatTaka(simulatedAmount)} সেলস সম্পন্ন হলে আনুমানিক এই কমিশন পাবে।
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingSeller(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

