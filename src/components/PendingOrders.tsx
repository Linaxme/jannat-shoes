import React, { useState } from 'react';
import { Order, UITheme } from '../types';
import { formatTaka, toBnDigit, formatBnDate } from '../utils/formatters';
import { Clock, Search, CheckCircle, Printer, Truck, Store, User, Edit3, UserCheck, ShieldAlert, Trash2 } from 'lucide-react';
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
}

export const PendingOrders: React.FC<PendingOrdersProps> = ({
  orders,
  activeTheme,
  onSelectOrderForInvoice,
  onConfirmDelivery,
  onUpdateOrder,
  onClaimOrder,
  onDeleteOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const { t } = useLanguage();

  const pendingOrders = orders.filter((ord) => ord.deliveryStatus === 'booked');

  const filteredOrders = pendingOrders.filter((ord) => {
    const matchesSearch =
      ord.memoNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => {
    const keyA = `${a.date || ''} ${a.time || ''} ${a.memoNo || a.id}`;
    const keyB = `${b.date || ''} ${b.time || ''} ${b.memoNo || b.id}`;
    return keyB.localeCompare(keyA);
  });

  const totalPendingPairs = filteredOrders.reduce((sum, o) => sum + o.totalPairs, 0);
  const totalPendingAmount = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  return (
    <div className="space-y-6">
      
      {/* Minimal Header */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            পেন্ডিং স্যাম্পল বুকিং ({toBnDigit(filteredOrders.length)} টি)
          </span>
          <div className="h-px bg-gradient-to-r from-amber-500/40 via-slate-800 to-transparent flex-1" />
        </div>

        <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shrink-0">
          <div>
            <span className="text-slate-400 text-[11px] mr-1">মোট জোড়া:</span>
            <span className="font-bold text-amber-300">{toBnDigit(totalPendingPairs)} জোড়া</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 text-[11px] mr-1">মূল্য:</span>
            <span className="font-bold text-emerald-400">{formatTaka(totalPendingAmount)}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`${activeTheme.cardClass} p-4 rounded-2xl flex items-center justify-between`}>
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_pending_placeholder')}
            className="bg-transparent text-xs text-slate-100 placeholder-slate-500 w-full focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-400 hidden sm:block">
          {t('total_displayed_label')} <strong className="text-white">{toBnDigit(filteredOrders.length)}</strong> {t('orders_count_suffix')}
        </div>
      </div>

      {/* Orders Grid / Table */}
      {filteredOrders.length === 0 ? (
        <div className={`${activeTheme.cardClass} p-12 text-center rounded-2xl space-y-3`}>
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
            <Truck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200">{t('no_pending_orders_title')}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {t('no_pending_orders_desc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((ord) => {
            const isUnclaimed = !ord.sellerId || !ord.isClaimed || ord.sellerName.includes('উন্মুক্ত') || ord.sellerName.includes('অনির্ধারিত');

            return (
              <div
                key={ord.id}
                className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all shadow-lg relative overflow-hidden group ${
                  isUnclaimed ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-amber-500/30 hover:border-amber-500/60'
                }`}
              >
                {isUnclaimed ? (
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-md">
                    <span>🔥 উন্মুক্ত অনলাইন অর্ডার</span>
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-amber-500/30 flex items-center gap-1">
                    <span>{t('sample_booked_tag')}</span>
                  </div>
                )}

                {/* Top Meta */}
                <div className="flex items-start justify-between pr-32">
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                      {t('booking_memo_no')} {ord.memoNo}
                    </span>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <Store className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      {ord.shopName}
                    </h3>
                    <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {ord.customerName} ({ord.customerPhone})
                    </p>
                  </div>
                </div>

                {/* Date & Seller */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t('booking_date_time')}</span>
                    <span className="font-bold text-slate-200">{formatBnDate(ord.date)} ({ord.time})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t('responsible_seller')}</span>
                    <span className={`font-bold ${isUnclaimed ? 'text-amber-400 flex items-center gap-1' : 'text-slate-200'}`}>
                      {ord.sellerName || 'উন্মুক্ত বুকিং'}
                    </span>
                  </div>
                </div>

                {/* Ordered Items Summary */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">{t('memo_items_list_title')}:</span>
                  <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                    {ord.items.map((item, idx) => {
                      const artCode = item.articleCode || (item as any).articleNo || '';
                      const pName = item.productName || (item as any).name || (item as any).category || 'জুতা';
                      const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
                      const totPrice = item.totalAmount ?? (item as any).totalPrice ?? (item as any).itemTotal ?? 0;

                      return (
                        <div key={idx} className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-1 last:border-0 last:pb-0">
                          <div>
                            <span className="font-bold text-slate-200">{artCode ? `${artCode} - ${pName}` : pName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-300">{toBnDigit(pairs)} {t('pairs')}</span>
                            <span className="text-[10px] text-slate-400 block">{formatTaka(totPrice)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Financials & Actions */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('total_bill')}:</span>
                    <span className="text-base font-black text-amber-300">{formatTaka(ord.grandTotal)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isUnclaimed && onClaimOrder && (
                      <button
                        type="button"
                        onClick={() => onClaimOrder(ord.id)}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer shrink-0"
                        title="এই অর্ডারটি ক্লেম করে আপনার দায়িত্বের আন্ডারে নিন"
                      >
                        <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>ক্লেইম করুন</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingOrder(ord)}
                      className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {t('edit_items_btn')}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectOrderForInvoice(ord)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      {t('print')}
                    </button>

                    <button
                      type="button"
                      onClick={() => onConfirmDelivery(ord.id)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('delivery_confirm_btn')}
                    </button>

                    {onDeleteOrder && (
                      confirmingDeleteId === ord.id ? (
                        <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-500/50">
                          <span className="text-[11px] font-bold text-rose-300 px-1">রিমুভ করবেন?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteOrder(ord.id);
                              setConfirmingDeleteId(null);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black shadow transition cursor-pointer"
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
                          className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                          title="ফেক বা বাতিল অর্ডারটি তালিকা থেকে রিমুভ করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>বাতিল/রিমুভ</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

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
