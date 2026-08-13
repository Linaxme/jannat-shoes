import React, { useState, useMemo } from 'react';
import { SalesRep, Order, UserAccount } from '../types';
import { Users, TrendingUp, Filter, ShoppingCart, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { toBnDigit } from '../utils/formatters';

interface SellerTrackingProps {
  sellers: SalesRep[];
  orders: Order[];
  customers: UserAccount[];
}

export const SellerTracking: React.FC<SellerTrackingProps> = ({
  sellers,
  orders,
  customers,
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

  // Aggregate stats per seller
  const sellerStats = useMemo(() => {
    return sellers.map((seller) => {
      // Find orders for this seller
      const sellerOrders = filteredOrders.filter((o) => o.sellerId === seller.id);
      const activeCustomersCount = new Set(sellerOrders.map(o => o.customerId)).size;
      const totalPairsSold = sellerOrders.reduce((sum, o) => sum + o.totalPairs, 0);
      const totalRevenue = sellerOrders.reduce((sum, o) => sum + (o.netPayable || 0), 0);

      // Total customers assigned to this seller
      const assignedCustomersCount = customers.filter((c) => c.sellerId === seller.id).length;

      return {
        ...seller,
        totalOrders: sellerOrders.length,
        totalPairsSold,
        totalRevenue,
        activeCustomersCount,
        assignedCustomersCount,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue desc
  }, [sellers, filteredOrders, customers]);

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">সেলার ট্র্যাকিং</h2>
            <p className="text-sm text-slate-400">সেলারদের সেলস ও পারফরম্যান্স রিপোর্ট</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          {[
            { id: 'today', label: 'আজ' },
            { id: 'week', label: '৭ দিন' },
            { id: 'month', label: '৩০ দিন' },
            { id: 'all', label: 'সব সময়' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setDateFilter(filter.id as any)}
              className={`px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap transition-colors flex-1 sm:flex-none text-center ${
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sellerStats.map((stat) => (
          <div key={stat.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold text-lg">
                  {stat.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-lg leading-tight">{stat.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3" /> {toBnDigit(stat.assignedCustomersCount)} টি দোকান
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">মোট বিক্রয় (জোড়া)</p>
                <p className="text-lg font-bold text-amber-400">{toBnDigit(stat.totalPairsSold)}</p>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">নিট সেলস (৳)</p>
                <p className="text-lg font-bold text-emerald-400">৳ {toBnDigit(stat.totalRevenue)}</p>
              </div>
            </div>

            {/* Target Progress Bars */}
            <div className="mb-4 space-y-3">
              {/* Pairs Target */}
              {(stat.monthlyTargetPairs || 0) > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">টার্গেট (জোড়া): <span className="text-slate-200">{toBnDigit(stat.monthlyTargetPairs || 0)}</span></span>
                    <span className={stat.totalPairsSold >= (stat.monthlyTargetPairs || 1) ? "text-amber-400" : "text-blue-400"}>
                      {toBnDigit(Math.min(100, Math.round((stat.totalPairsSold / (stat.monthlyTargetPairs || 1)) * 100)))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${stat.totalPairsSold >= (stat.monthlyTargetPairs || 1) ? 'bg-amber-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, (stat.totalPairsSold / (stat.monthlyTargetPairs || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Amount Target */}
              {(stat.monthlyTargetAmount || 0) > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">টার্গেট (টাকায়): <span className="text-slate-200">৳ {toBnDigit(stat.monthlyTargetAmount || 0)}</span></span>
                    <span className={stat.totalRevenue >= (stat.monthlyTargetAmount || 1) ? "text-emerald-400" : "text-blue-400"}>
                      {toBnDigit(Math.min(100, Math.round((stat.totalRevenue / (stat.monthlyTargetAmount || 1)) * 100)))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${stat.totalRevenue >= (stat.monthlyTargetAmount || 1) ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, (stat.totalRevenue / (stat.monthlyTargetAmount || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5" /> মোট অর্ডার: {toBnDigit(stat.totalOrders)}
              </span>
              <span>
                অ্যাক্টিভ কাস্টমার: {toBnDigit(stat.activeCustomersCount)}
              </span>
            </div>
          </div>
        ))}

        {sellerStats.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
            কোনো সেলস ডেটা পাওয়া যায়নি।
          </div>
        )}
      </div>
    </div>
  );
};
