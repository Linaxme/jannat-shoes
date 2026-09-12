import React, { useState } from 'react';
import { Order, OrderItem } from '../types';
import { formatTaka, toBnDigit } from '../utils/formatters';
import { X, Trash2, Plus, Save, AlertCircle } from 'lucide-react';

interface EditPendingOrderModalProps {
  order: Order;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
}

export const EditPendingOrderModal: React.FC<EditPendingOrderModalProps> = ({
  order,
  onClose,
  onSave,
}) => {
  const [items, setItems] = useState<OrderItem[]>([...order.items]);
  const [discount, setDiscount] = useState<number | string>(order.discount > 0 ? order.discount : '');
  const [paidAmount, setPaidAmount] = useState<number | string>(order.paidAmount > 0 ? order.paidAmount : '');
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod);
  const [notes, setNotes] = useState<string>(order.notes || '');

  // Handle quantity change
  const handleQuantityChange = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = [...items];
    const item = updated[index];
    const totalPairs = item.unitType === 'cartons' ? qty * 12 : qty;
    const comm = item.commissionPerPair || 0;
    const netUnitPrice = Math.max(0, item.unitSellPrice - comm);
    const totalCommission = totalPairs * comm;
    const totalAmount = totalPairs * netUnitPrice;
    updated[index] = {
      ...item,
      quantityInput: qty,
      totalPairs,
      netUnitPrice,
      totalCommission,
      totalAmount,
    };
    setItems(updated);
  };

  // Handle unit price change
  const handlePriceChange = (index: number, newPrice: number) => {
    const price = Math.max(0, newPrice);
    const updated = [...items];
    const item = updated[index];
    const comm = item.commissionPerPair || 0;
    const netUnitPrice = Math.max(0, price - comm);
    const totalCommission = item.totalPairs * comm;
    const totalAmount = item.totalPairs * netUnitPrice;
    updated[index] = {
      ...item,
      unitSellPrice: price,
      netUnitPrice,
      totalCommission,
      totalAmount,
    };
    setItems(updated);
  };

  // Handle commission change
  const handleCommissionChange = (index: number, newCommission: number) => {
    const comm = Math.max(0, newCommission);
    const updated = [...items];
    const item = updated[index];
    const netUnitPrice = Math.max(0, item.unitSellPrice - comm);
    const totalCommission = item.totalPairs * comm;
    const totalAmount = item.totalPairs * netUnitPrice;
    updated[index] = {
      ...item,
      commissionPerPair: comm,
      netUnitPrice,
      totalCommission,
      totalAmount,
    };
    setItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('অর্ডারে কমপক্ষে একটি আইটেম থাকা আবশ্যক!');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations
  const discountNum = typeof discount === 'number' ? discount : parseFloat(discount) || 0;
  const paidAmountNum = typeof paidAmount === 'number' ? paidAmount : parseFloat(paidAmount) || 0;

  const totalPairs = items.reduce((sum, i) => sum + i.totalPairs, 0);
  const totalCommission = items.reduce((sum, i) => sum + (i.totalCommission || (i.totalPairs * (i.commissionPerPair || 0))), 0);
  const grossTotal = items.reduce((sum, i) => sum + (i.totalPairs * i.unitSellPrice), 0);
  const subTotal = items.reduce((sum, i) => sum + i.totalAmount, 0);
  const grandTotal = Math.max(0, subTotal - discountNum);
  const dueAmount = Math.max(0, grandTotal - paidAmountNum);
  const totalNetDue = order.previousDue + dueAmount - (order.grandTotal - order.dueAmount); // Adjust based on previous due difference or simple calculation

  const status = dueAmount === 0 ? 'পরিশোধিত' : paidAmountNum > 0 ? 'আংশিক বাকী' : 'সম্পূর্ণ বাকী';

  const handleSave = () => {
    const updatedOrder: Order = {
      ...order,
      items,
      totalPairs,
      totalCartons: Math.round((totalPairs / 12) * 10) / 10,
      totalCommission,
      subTotal,
      discount: discountNum,
      grandTotal,
      paidAmount: paidAmountNum,
      dueAmount,
      totalNetDue: order.previousDue + dueAmount,
      paymentMethod,
      status,
      notes,
    };
    onSave(updatedOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              পেন্ডিং অর্ডার এডিট করুন (মেমো নং: {order.memoNo})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              দোকান: <strong className="text-slate-200">{order.shopName}</strong> | প্রো: {order.customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Items Editor */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              অর্ডারকৃত জুতার তালিকা (মালের সমস্যার কারণে বাদ দিতে বা পরিমাণ কমাতে পারেন):
            </label>
            <div className="bg-slate-950 rounded-2xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[150px]">
                    <div className="font-bold text-slate-100">{item.productName}</div>
                    <div className="text-[10px] text-slate-400">
                      আর্টিকল: {item.articleCode} | সাইজ: {item.sizeRange}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">বিক্রয় দর (৳):</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unitSellPrice}
                        onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-18 bg-slate-900 border border-slate-700 text-center font-bold text-emerald-400 rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-amber-300 block mb-0.5">কমিশন/জোড়া (৳):</label>
                      <input
                        type="number"
                        min="0"
                        value={item.commissionPerPair !== undefined && item.commissionPerPair !== null ? item.commissionPerPair : ''}
                        onChange={(e) => handleCommissionChange(idx, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        placeholder="০"
                        className="w-16 bg-slate-900 border border-amber-500/40 text-center font-bold text-amber-300 rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">
                        {item.unitType === 'cartons' ? 'ডজন' : 'জোড়া'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantityInput}
                        onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                        className="w-14 bg-slate-900 border border-slate-700 text-center font-bold text-slate-200 rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-[9px] text-slate-400 block">নিট মূল্য</span>
                      <span className="font-extrabold text-amber-300">{formatTaka(item.totalAmount)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="w-8 h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="আইটেম বাদ দিন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">বিশেষ ছাড় (৳):</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="০"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">জমা টাকা (৳):</label>
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="০"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">পেমেন্ট মাধ্যম:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none"
              >
                <option value="নগদ ক্যাশ">নগদ ক্যাশ</option>
                <option value="বিকাশ / নগদ">বিকাশ / নগদ</option>
                <option value="ব্যাংক ট্রান্সফার">ব্যাংক ট্রান্সফার</option>
                <option value="বাকী (ডিউ)">বাকী (ডিউ)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">নোট / মন্তব্য (কেন পরিবর্তন করা হলো):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: স্টক স্বল্পতার কারণে ১ জোড়া কম দেওয়া হয়েছে..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            />
          </div>

          {/* Summary Box */}
          <div className="bg-gradient-to-r from-amber-950/40 to-slate-950 p-4 rounded-2xl border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-slate-400 text-[10px] block">সংশোধিত মোট জোড়া:</span>
              <span className="font-extrabold text-white text-sm">{toBnDigit(totalPairs)} জোড়া</span>
            </div>
            {totalCommission > 0 && (
              <div>
                <span className="text-amber-400/80 text-[10px] block">মোট কমিশন ছাড়:</span>
                <span className="font-extrabold text-amber-400 text-sm">- {formatTaka(totalCommission)}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 text-[10px] block">সংশোধিত নিট বিল:</span>
              <span className="font-black text-amber-300 text-sm">{formatTaka(grandTotal)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">সংশোধিত বাকী:</span>
              <span className="font-black text-rose-400 text-sm">{formatTaka(dueAmount)}</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            পরিবর্তন সংরক্ষণ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
