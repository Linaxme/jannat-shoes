import React, { useState } from 'react';
import { Order, ConfirmDeliveryData } from '../types';
import { formatTaka, toBnDigit, getLocalDateStr, pairsToCartonText } from '../utils/formatters';
import {
  X,
  Truck,
  CheckCircle2,
  Calendar,
  Banknote,
  Receipt,
  Store,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

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

  // Default to remaining bill or full collection
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                অর্ডার ডেলিভারি ও হিসাব সমন্বয়
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                মেমো: <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">{order.memoNo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* Customer & Memo Card */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300 font-semibold">
                <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{order.shopName || 'দোকান'}</span>
                {order.customerName && (
                  <span className="text-slate-500 dark:text-slate-400 font-normal">({order.customerName})</span>
                )}
              </div>
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                বুকিং তারিখ: {order.date}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-center">
              <div className="p-2 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800/60 shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">মোট বিল</span>
                <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400">
                  {formatTaka(order.grandTotal)}
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800/60 shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">পূর্বে বুকিংয়ে জমা</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatTaka(previousPaid)}
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800/60 shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">বকেয়া বিল</span>
                <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
                  {formatTaka(initialRemaining)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
              <span>আইটেম: {toBnDigit(order.items?.length || 0)} টি</span>
              <span>
                মোট জোড়া: <strong className="text-slate-800 dark:text-slate-200">{toBnDigit(order.totalPairs)} জোড়া</strong> ({pairsToCartonText(order.totalPairs, 12)})
              </span>
            </div>
          </div>

          {/* Delivery Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              ডেলিভারি তারিখ
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
              required
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
              এই তারিখে আজকের বিক্রি ও ক্যাশ হিসেবে ডেলিভারি যুক্ত হবে।
            </p>
          </div>

          {/* Delivery Cash Received */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ডেলিভারিতে নগদ জমা (টাকা)
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                বকেয়া: {formatTaka(initialRemaining)}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ৳
              </span>
              <input
                type="number"
                min="0"
                max={order.grandTotal}
                value={collectedCashInput}
                onChange={(e) => setCollectedCashInput(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-base font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCollectedCashInput(initialRemaining.toString())}
                className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-transparent rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer"
              >
                সম্পূর্ণ জমা ({formatTaka(initialRemaining)})
              </button>
              {initialRemaining > 1000 && (
                <button
                  type="button"
                  onClick={() => setCollectedCashInput((Math.floor(initialRemaining / 200) * 100).toString())}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                >
                  অর্ধেক ({formatTaka(Math.floor(initialRemaining / 200) * 100)})
                </button>
              )}
              <button
                type="button"
                onClick={() => setCollectedCashInput('0')}
                className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-transparent rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer"
              >
                কোনো জমা নেই (৳০)
              </button>
            </div>
          </div>

          {/* Live Accounting Impact Highlight */}
          <div className="bg-amber-50/60 dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900 border border-amber-200 dark:border-amber-500/30 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                দৈনিক ও খাতার হিসাবে প্রভাব
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                newDueAmount === 0 
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                  : collectedCash > 0 
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300' 
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
              }`}>
                {newDueAmount === 0 ? 'সম্পূর্ণ পরিশোধিত' : collectedCash > 0 ? 'আংশিক বাকী' : 'সম্পূর্ণ বাকী'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
              <div className="bg-white dark:bg-slate-900/90 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">আজকের বিক্রি</span>
                <strong className="text-amber-700 dark:text-amber-400 font-bold">+{formatTaka(order.grandTotal)}</strong>
              </div>
              <div className="bg-white dark:bg-slate-900/90 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">আজকের জমা</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">+{formatTaka(collectedCash)}</strong>
              </div>
              <div className="bg-white dark:bg-slate-900/90 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">নতুন বাকী</span>
                <strong className="text-rose-600 dark:text-rose-400 font-bold">+{formatTaka(newDueAmount)}</strong>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              পেমেন্ট মাধ্যম
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['নগদ ক্যাশ', 'বিকাশ / নগদ', 'ব্যাংক ট্রান্সফার'] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                    paymentMethod === method
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ডেলিভারি সংক্রান্ত নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমনঃ ড্রাইভার রহিম ভাই মারফত পাঠানো হলো..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>ডেলিভারি ও হিসাব নিশ্চিত করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
