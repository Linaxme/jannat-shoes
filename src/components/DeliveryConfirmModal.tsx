import React, { useState } from 'react';
import { Order, ConfirmDeliveryData } from '../types';
import { formatTaka, toBnDigit, getLocalDateStr, pairsToCartonText } from '../utils/formatters';
import { X, Truck, CheckCircle2, Calendar, Banknote, Store } from 'lucide-react';

interface DeliveryConfirmModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onConfirm: (orderId: string, deliveryData: ConfirmDeliveryData) => void;
}

export const DeliveryConfirmModal: React.FC<DeliveryConfirmModalProps> = ({
  isOpen,
  order,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !order) return null;

  const todayStr = getLocalDateStr(new Date());
  const [deliveryDate, setDeliveryDate] = useState<string>(todayStr);
  const previousPaid = order.paidAmount || 0;
  const initialRemaining = Math.max(0, order.grandTotal - previousPaid);

  const [collectedCashInput, setCollectedCashInput] = useState<string>(initialRemaining.toString());
  const [paymentMethod, setPaymentMethod] = useState<'নগদ ক্যাশ' | 'বিকাশ / নগদ' | 'ব্যাংক ট্রান্সফার'>('নগদ ক্যাশ');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const collectedCash = Math.max(0, Math.min(order.grandTotal, Number(collectedCashInput) || 0));
  const newTotalPaid = Math.min(order.grandTotal, previousPaid + collectedCash);
  const newDueAmount = Math.max(0, order.grandTotal - newTotalPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      onConfirm(order.id, {
        deliveryDate: deliveryDate || todayStr,
        collectedAtDelivery: collectedCash,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ডেলিভারি নিশ্চিতকরণ
              </h3>
              <p className="text-[11px] font-mono text-amber-700 dark:text-amber-400 font-semibold">
                #{order.memoNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Minimal Order Summary */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-2.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 truncate">
                <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="truncate">{order.shopName || order.customerName}</span>
                {order.customerName && order.shopName && (
                  <span className="text-slate-500 text-[11px] font-normal truncate">({order.customerName})</span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                {toBnDigit(order.totalPairs)} জোড়া ({pairsToCartonText(order.totalPairs, 12)})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center pt-1.5 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="bg-white dark:bg-slate-900 py-1.5 px-1 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">মোট বিল</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{formatTaka(order.grandTotal)}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 py-1.5 px-1 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">পূর্বে জমা</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatTaka(previousPaid)}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 py-1.5 px-1 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">অবশিষ্ট বাকি</span>
                <span className={`text-xs font-bold ${newDueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatTaka(newDueAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Date & Cash Collected (2 Cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Delivery Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                ডেলিভারি তারিখ
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            {/* Collected Cash */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                নগদ জমা (টাকা)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ৳
                </span>
                <input
                  type="number"
                  min="0"
                  max={order.grandTotal}
                  value={collectedCashInput}
                  onChange={(e) => setCollectedCashInput(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-7 pr-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCollectedCashInput(initialRemaining.toString())}
              className="flex-1 py-1 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer text-center"
            >
              সম্পূর্ণ ({formatTaka(initialRemaining)})
            </button>
            {initialRemaining > 1000 && (
              <button
                type="button"
                onClick={() => setCollectedCashInput((Math.floor(initialRemaining / 200) * 100).toString())}
                className="flex-1 py-1 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer text-center"
              >
                অর্ধেক ({formatTaka(Math.floor(initialRemaining / 200) * 100)})
              </button>
            )}
            <button
              type="button"
              onClick={() => setCollectedCashInput('0')}
              className="flex-1 py-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer text-center"
            >
              জমা নেই (৳০)
            </button>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              পেমেন্ট মাধ্যম
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['নগদ ক্যাশ', 'বিকাশ / নগদ', 'ব্যাংক ট্রান্সফার'] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition text-center cursor-pointer ${
                    paymentMethod === method
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Note (optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="নোট লিখুন..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ডেলিভারি নিশ্চিত করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
