import React, { useState, useMemo } from 'react';
import { SalesRep, Order, Customer, DuePaymentLog } from '../types';
import { Users, TrendingUp, ShoppingCart, ShieldCheck, DollarSign, Wallet, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { toBnDigit, formatTaka } from '../utils/formatters';

interface SellerTrackingProps {
  sellers: SalesRep[];
  orders: Order[];
  customers: Customer[] | any[];
  paymentLogs?: DuePaymentLog[];
}

export const SellerTracking: React.FC<SellerTrackingProps> = ({
  sellers,
  orders,
  customers,
  paymentLogs = [],
}) => {
  const { t } = useLanguage();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Filter orders by date
  const filteredOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthStr = monthAgo.toISOString().split('T')[0];

    return orders.filter((o) => {
      // only count approved orders
      if (o.status !== 'approved') return false;

      if (dateFilter === 'today') return o.date >= todayStr;
      if (dateFilter === 'week') return o.date >= weekStr;
      if (dateFilter === 'month') return o.date >= monthStr;
      return true;
    });
  }, [orders, dateFilter]);

  // Aggregate stats per seller (including Admin + Seller)
  const sellerStats = useMemo(() => {
    return sellers.map((seller) => {
      // Robust order matching for seller or admin
      const sellerOrders = filteredOrders.filter((o) => {
        if (!o.sellerId && !o.sellerName) return false;
        const matchId = o.sellerId === seller.id || (seller.phone && o.sellerId === seller.phone);
        const matchName =
          o.sellerName &&
          seller.name &&
          (o.sellerName.toLowerCase() === seller.name.toLowerCase() ||
            seller.name.toLowerCase().includes(o.sellerName.toLowerCase()) ||
            o.sellerName.toLowerCase().includes(seller.name.toLowerCase()));
        return matchId || matchName;
      });

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
          (cSellerName.toLowerCase() === seller.name.toLowerCase() ||
            seller.name.toLowerCase().includes(cSellerName.toLowerCase()) ||
            cSellerName.toLowerCase().includes(seller.name.toLowerCase()));
        return matchId || matchName;
      });

      const assignedCustomersCount = assignedCustomers.length;
      const totalCustomerDue = assignedCustomers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

      // Due collected by this seller or admin
      const collectedPayments = paymentLogs.filter((p) => {
        const matchSeller =
          p.sellerId === seller.id ||
          p.sellerName === seller.name ||
          p.receivedBy === seller.name ||
          (seller.phone && p.sellerId === seller.phone);
        return matchSeller;
      });
      const totalCollectedAmount = collectedPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

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
        activeCustomersCount,
        assignedCustomersCount,
        totalCustomerDue,
        totalCollectedAmount,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue desc
  }, [sellers, filteredOrders, customers, paymentLogs]);

  // Overall totals
  const totalTeamRevenue = sellerStats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalTeamPairs = sellerStats.reduce((sum, s) => sum + s.totalPairsSold, 0);
  const totalTeamDue = sellerStats.reduce((sum, s) => sum + s.totalCustomerDue, 0);
  const totalTeamCollected = sellerStats.reduce((sum, s) => sum + s.totalCollectedAmount, 0);

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
            { id: 'week', label: '৭ দিন' },
            { id: 'month', label: '৩০ দিন' },
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
            <ShoppingCart className="w-3.5 h-3.5 text-blue-400" /> নির্বাচিত মেয়াদে মোট সেলস
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">{formatTaka(totalTeamRevenue)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> মোট বিক্রিত জোড়া
          </p>
          <p className="text-xl sm:text-2xl font-black text-amber-400">{toBnDigit(totalTeamPairs)} <span className="text-xs font-normal text-slate-400">জোড়া</span></p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-rose-400" /> মোট বকেয়া (আন্ডারে বাকী)
          </p>
          <p className="text-xl sm:text-2xl font-black text-rose-400">{formatTaka(totalTeamDue)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> মোট আদায়কৃত বাকী
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">{formatTaka(totalTeamCollected)}</p>
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
            <div className="flex items-center justify-between mb-4">
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
                    <span className="text-slate-600">•</span>
                    <span>{stat.area || 'প্রধান শাখা'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
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
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-rose-950/20 rounded-xl p-2.5 border border-rose-900/30">
                <p className="text-[10px] text-rose-400/90 font-bold uppercase mb-0.5">আওতাধীন বাকী</p>
                <p className="text-sm font-bold text-rose-400">{formatTaka(stat.totalCustomerDue)}</p>
              </div>
              <div className="bg-emerald-950/20 rounded-xl p-2.5 border border-emerald-900/30">
                <p className="text-[10px] text-emerald-400/90 font-bold uppercase mb-0.5">আদায়কৃত বাকী</p>
                <p className="text-sm font-bold text-emerald-400">{formatTaka(stat.totalCollectedAmount)}</p>
              </div>
            </div>

            {/* Target Progress Bars */}
            <div className="mb-4 space-y-3">
              {/* Pairs Target */}
              {(stat.monthlyTargetPairs || 0) > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">
                      টার্গেট (জোড়া): <span className="text-slate-200">{toBnDigit(stat.monthlyTargetPairs || 0)}</span>
                    </span>
                    <span
                      className={
                        stat.totalPairsSold >= (stat.monthlyTargetPairs || 1) ? 'text-amber-400' : 'text-blue-400'
                      }
                    >
                      {toBnDigit(
                        Math.min(100, Math.round((stat.totalPairsSold / (stat.monthlyTargetPairs || 1)) * 100))
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stat.totalPairsSold >= (stat.monthlyTargetPairs || 1) ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (stat.totalPairsSold / (stat.monthlyTargetPairs || 1)) * 100)}%`,
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
                      টার্গেট (টাকায়):{' '}
                      <span className="text-slate-200">{formatTaka(stat.monthlyTargetAmount || 0)}</span>
                    </span>
                    <span
                      className={
                        stat.totalRevenue >= (stat.monthlyTargetAmount || 1) ? 'text-emerald-400' : 'text-blue-400'
                      }
                    >
                      {toBnDigit(
                        Math.min(100, Math.round((stat.totalRevenue / (stat.monthlyTargetAmount || 1)) * 100))
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stat.totalRevenue >= (stat.monthlyTargetAmount || 1) ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (stat.totalRevenue / (stat.monthlyTargetAmount || 1)) * 100)}%`,
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
          </div>
        ))}

        {sellerStats.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
            কোনো সেলস বা সেলার ডেটা পাওয়া যায়নি।
          </div>
        )}
      </div>
    </div>
  );
};

