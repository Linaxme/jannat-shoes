import React, { useState, useMemo } from 'react';
import { Order, OrderItem, ShoeProduct } from '../types';
import { formatTaka, toBnDigit } from '../utils/formatters';
import { X, Trash2, Plus, Save, AlertCircle, ShoppingBag, Search, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface EditPendingOrderModalProps {
  order: Order;
  products?: ShoeProduct[];
  title?: string;
  isSalesHistory?: boolean;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
}

export const EditPendingOrderModal: React.FC<EditPendingOrderModalProps> = ({
  order,
  products = [],
  title,
  isSalesHistory = false,
  onClose,
  onSave,
}) => {
  const [items, setItems] = useState<OrderItem[]>(() => {
    return (order.items || []).map((item) => {
      const unitSellPrice = item.unitSellPrice ?? (item as any).rate ?? 0;
      const comm = item.commissionPerPair || 0;
      const unitType = item.unitType || 'pairs';
      const qty = item.quantityInput || item.totalPairs || (item as any).pairQty || 1;
      const totalPairs = item.totalPairs || (unitType === 'cartons' ? qty * 12 : qty);
      const netUnitPrice = item.netUnitPrice ?? Math.max(0, unitSellPrice - comm);
      const totalCommission = item.totalCommission ?? (totalPairs * comm);
      const totalAmount = item.totalAmount ?? (totalPairs * netUnitPrice);

      return {
        productId: item.productId || `prod-legacy-${Math.random()}`,
        articleCode: item.articleCode || (item as any).articleNo || (item as any).article || 'M-00',
        productName: item.productName || (item as any).name || 'জুতা',
        sizeRange: item.sizeRange || (item as any).size || '৩৯-৪৪',
        unitType,
        quantityInput: qty,
        totalPairs,
        unitSellPrice,
        unitBuyPrice: item.unitBuyPrice ?? 0,
        commissionPerPair: comm,
        netUnitPrice,
        totalCommission,
        totalAmount,
      };
    });
  });

  const [discount, setDiscount] = useState<number | string>(order.discount > 0 ? order.discount : '');
  const [paidAmount, setPaidAmount] = useState<number | string>(order.paidAmount > 0 ? order.paidAmount : '');
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || 'নগদ ক্যাশ');
  const [notes, setNotes] = useState<string>(order.notes || '');

  // Add Product Form State
  const [showAddProductSection, setShowAddProductSection] = useState<boolean>(false);
  const [productSearchInput, setProductSearchInput] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<ShoeProduct | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const [newUnitType, setNewUnitType] = useState<'cartons' | 'pairs'>('cartons');
  const [newQuantity, setNewQuantity] = useState<number | string>(1);
  const [newPrice, setNewPrice] = useState<number | string>('');
  const [newCommission, setNewCommission] = useState<number | string>('');
  const [itemToRemoveIndex, setItemToRemoveIndex] = useState<number | null>(null);

  // Filter products for search
  const filteredProducts = useMemo(() => {
    const list = products || [];
    if (!productSearchInput.trim()) return list.slice(0, 8);
    const q = productSearchInput.toLowerCase().trim();
    return list.filter((p) =>
      (p.articleCode || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [products, productSearchInput]);

  const handleSelectProduct = (prod: ShoeProduct) => {
    setSelectedProduct(prod);
    setProductSearchInput(`${prod.articleCode} - ${prod.name}`);
    setNewPrice(prod.sellPrice || 0);
    setNewQuantity(1);
    setNewCommission('');
    setShowProductDropdown(false);
  };

  const handleAddProductToOrder = () => {
    if (!selectedProduct) {
      alert('অনুগ্রহ করে প্রথমে তালিকা থেকে একটি পণ্য নির্বাচন করুন!');
      return;
    }

    const qtyNum = Math.max(1, parseInt(String(newQuantity)) || 1);
    const priceNum = Math.max(0, parseFloat(String(newPrice)) || 0);
    const commNum = Math.max(0, parseFloat(String(newCommission)) || 0);
    const pairsPerCarton = selectedProduct.pairsPerCarton || 12;
    const totalPairs = newUnitType === 'cartons' ? qtyNum * pairsPerCarton : qtyNum;
    const netRate = Math.max(0, priceNum - commNum);
    const totalCommission = totalPairs * commNum;
    const totalAmount = totalPairs * priceNum;

    // Check if already in items with same unit type
    const existingIndex = items.findIndex(
      (item) => item.productId === selectedProduct.id && item.unitType === newUnitType
    );

    if (existingIndex > -1) {
      const updated = [...items];
      const existing = updated[existingIndex];
      const combinedQty = existing.quantityInput + qtyNum;
      const combinedPairs = newUnitType === 'cartons' ? combinedQty * pairsPerCarton : combinedQty;
      const effectiveComm = commNum > 0 ? commNum : (existing.commissionPerPair || 0);
      const effectiveNet = Math.max(0, priceNum - effectiveComm);
      updated[existingIndex] = {
        ...existing,
        quantityInput: combinedQty,
        totalPairs: combinedPairs,
        unitSellPrice: priceNum,
        commissionPerPair: effectiveComm,
        netUnitPrice: effectiveNet,
        totalCommission: combinedPairs * effectiveComm,
        totalAmount: combinedPairs * priceNum,
      };
      setItems(updated);
    } else {
      const newItem: OrderItem = {
        productId: selectedProduct.id,
        articleCode: selectedProduct.articleCode,
        productName: selectedProduct.name,
        sizeRange: selectedProduct.sizeRange || '৩৯-৪৪',
        unitType: newUnitType,
        quantityInput: qtyNum,
        totalPairs,
        unitSellPrice: priceNum,
        unitBuyPrice: selectedProduct.buyPrice || 0,
        commissionPerPair: commNum,
        netUnitPrice: netRate,
        totalCommission,
        totalAmount,
      };
      setItems([...items, newItem]);
    }

    // Reset addition inputs
    setSelectedProduct(null);
    setProductSearchInput('');
    setNewQuantity(1);
    setNewPrice('');
    setNewCommission('');
    setShowAddProductSection(false);
  };

  // Handle quantity change for existing item
  const handleQuantityChange = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = [...items];
    const item = updated[index];
    const pairsPerCarton = 12;
    const totalPairs = item.unitType === 'cartons' ? qty * pairsPerCarton : qty;
    const comm = item.commissionPerPair || 0;
    const netUnitPrice = Math.max(0, item.unitSellPrice - comm);
    const totalCommission = totalPairs * comm;
    const totalAmount = totalPairs * item.unitSellPrice;
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

  // Handle unit price change for existing item
  const handlePriceChange = (index: number, newPrice: number) => {
    const price = Math.max(0, newPrice);
    const updated = [...items];
    const item = updated[index];
    const comm = item.commissionPerPair || 0;
    const netUnitPrice = Math.max(0, price - comm);
    const totalCommission = item.totalPairs * comm;
    const totalAmount = item.totalPairs * price;
    updated[index] = {
      ...item,
      unitSellPrice: price,
      netUnitPrice,
      totalCommission,
      totalAmount,
    };
    setItems(updated);
  };

  // Handle commission change for existing item
  const handleCommissionChange = (index: number, newCommission: number) => {
    const comm = Math.max(0, newCommission);
    const updated = [...items];
    const item = updated[index];
    const netUnitPrice = Math.max(0, item.unitSellPrice - comm);
    const totalCommission = item.totalPairs * comm;
    const totalAmount = item.totalPairs * item.unitSellPrice;
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
      if (!confirm('সতর্কতা: এটি এই মেমোর একমাত্র পণ্য। আপনি কি এটি বাদ দিতে চান? সংরক্ষণ করতে হলে অন্তত ১টি পণ্য থাকতে হবে।')) {
        return;
      }
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations
  const discountNum = typeof discount === 'number' ? discount : parseFloat(discount) || 0;
  const paidAmountNum = typeof paidAmount === 'number' ? paidAmount : parseFloat(paidAmount) || 0;

  const totalPairs = items.reduce((sum, i) => sum + i.totalPairs, 0);
  const totalCommission = items.reduce((sum, i) => sum + (i.totalCommission || (i.totalPairs * (i.commissionPerPair || 0))), 0);
  const grossTotal = items.reduce((sum, i) => sum + (i.totalPairs * i.unitSellPrice), 0);
  const netBeforeDiscount = Math.max(0, grossTotal - totalCommission);
  const grandTotal = Math.max(0, netBeforeDiscount - discountNum);
  const dueAmount = Math.max(0, grandTotal - paidAmountNum);
  const overpaidAmount = Math.max(0, paidAmountNum - grandTotal);
  const previousDue = order.previousDue || 0;
  const totalNetDue = previousDue + dueAmount - overpaidAmount;

  const status = dueAmount === 0 ? 'পরিশোধিত' : paidAmountNum > 0 ? 'আংশিক বাকী' : 'সম্পূর্ণ বাকী';

  const handleSave = () => {
    if (items.length === 0) {
      alert('অর্ডারে কোনো পণ্য নেই! অনুগ্রহ করে অন্তত একটি পণ্য যোগ করুন।');
      return;
    }

    const updatedOrder: Order = {
      ...order,
      items,
      totalPairs,
      totalCartons: Math.round((totalPairs / 12) * 10) / 10,
      totalCommission,
      subTotal: grossTotal,
      discount: discountNum,
      grandTotal,
      paidAmount: paidAmountNum,
      dueAmount,
      totalNetDue,
      paymentMethod,
      status,
      notes,
    };
    onSave(updatedOrder);
  };

  const modalHeading = title || (isSalesHistory 
    ? `বিক্রয় মেমো এডিট (মেমো #${order.memoNo})` 
    : `পেন্ডিং অর্ডার এডিট (মেমো #${order.memoNo})`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{modalHeading}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              দোকান: <strong className="text-slate-200">{order.shopName}</strong> | প্রো: {order.customerName} | তারিখ: {order.date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors cursor-pointer shrink-0"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Section Header: Items & Add Product Button */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                অর্ডারকৃত পণ্যের তালিকা ({toBnDigit(items.length)}টি)
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddProductSection(!showAddProductSection);
                if (!showAddProductSection) {
                  setShowProductDropdown(true);
                }
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddProductSection ? 'ফর্ম বন্ধ করুন' : 'নতুন পণ্য / মাল যোগ করুন'}</span>
            </button>
          </div>

          {/* Collapsible New Product Add Section */}
          {showAddProductSection && (
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-3.5 sm:p-4 space-y-3 animate-fadeIn shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  নতুন পণ্য নির্বাচন ও অর্ডারে যোগ
                </span>
                <span className="text-[10px] text-slate-400">স্টক থেকে সঠিক পণ্য বাছাই করুন</span>
              </div>

              {/* Product Search & Dropdown */}
              <div className="relative">
                <label className="block text-slate-300 text-[11px] mb-1 font-semibold">পণ্য খুঁজুন (কোড বা নাম):</label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchInput}
                    onChange={(e) => {
                      setProductSearchInput(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="যেমন: M-102 বা লোফার..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setProductSearchInput('');
                        setShowProductDropdown(true);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showProductDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800 text-xs">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-slate-500">কোনো পণ্য পাওয়া যায়নি</div>
                    ) : (
                      filteredProducts.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProduct(prod)}
                          className="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-amber-300 font-mono text-xs">{prod.articleCode}</span>
                              <span className="text-slate-200 font-medium truncate">{prod.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded font-semibold text-[10px]">
                                সাইজ: {prod.sizeRange || '৩৯-৪৪'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-emerald-400 font-bold block">{formatTaka(prod.sellPrice)}</span>
                            <span className="text-[10px] text-slate-400">স্টক: {toBnDigit(prod.stockPairs)} জোড়া</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Quantity, Unit, Rate, Commission Inputs */}
              {selectedProduct && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">একক:</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setNewUnitType('cartons')}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          newUnitType === 'cartons'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        ডজন
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewUnitType('pairs')}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          newUnitType === 'pairs'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        জোড়া
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">পরিমাণ ({newUnitType === 'cartons' ? 'ডজন' : 'জোড়া'}):</label>
                    <input
                      type="number"
                      min="1"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="১"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 font-bold text-center focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">বিক্রয় দর / জোড়া (৳):</label>
                    <input
                      type="number"
                      min="0"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="০"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-emerald-400 font-bold text-center focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-300 text-[10px] mb-1">কমিশন ছাড়/জোড়া (৳):</label>
                    <input
                      type="number"
                      min="0"
                      value={newCommission}
                      onChange={(e) => setNewCommission(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="০"
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-amber-300 font-bold text-center focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Preview & Confirm Button */}
              {selectedProduct && (
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800 flex-wrap">
                  <div className="text-slate-300 text-xs">
                    মোট জোড়া: <strong className="text-white font-bold">{toBnDigit(newUnitType === 'cartons' ? (parseInt(String(newQuantity)) || 1) * (selectedProduct.pairsPerCarton || 12) : (parseInt(String(newQuantity)) || 1))} জোড়া</strong> | 
                    নিট মোট: <strong className="text-amber-300 font-black ml-1">
                      {formatTaka(
                        (newUnitType === 'cartons' ? (parseInt(String(newQuantity)) || 1) * (selectedProduct.pairsPerCarton || 12) : (parseInt(String(newQuantity)) || 1)) *
                        Math.max(0, (parseFloat(String(newPrice)) || 0) - (parseFloat(String(newCommission)) || 0))
                      )}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setProductSearchInput('');
                        setShowAddProductSection(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={handleAddProductToOrder}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      মেমোতে যোগ করুন
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Items Editor List */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="bg-slate-950 p-6 rounded-2xl border border-dashed border-slate-800 text-center text-slate-400 space-y-2">
                <p>মেমোতে বর্তমানে কোনো পণ্য নেই।</p>
                <button
                  type="button"
                  onClick={() => setShowAddProductSection(true)}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  নতুন পণ্য যোগ করুন
                </button>
              </div>
            ) : (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-[140px]">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
                          {item.articleCode}
                        </span>
                        <span>{item.productName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        সাইজ: {item.sizeRange} | মোট: {toBnDigit(item.totalPairs)} জোড়া
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-0.5">দর (৳):</label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitSellPrice}
                          onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 sm:w-18 bg-slate-900 border border-slate-700 text-center font-bold text-emerald-400 rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-amber-300 block mb-0.5">কমিশন (৳):</label>
                        <input
                          type="number"
                          min="0"
                          value={item.commissionPerPair !== undefined && item.commissionPerPair !== null ? item.commissionPerPair : ''}
                          onChange={(e) => handleCommissionChange(idx, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="০"
                          className="w-14 sm:w-16 bg-slate-900 border border-amber-500/40 text-center font-bold text-amber-300 rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500"
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
                        <span className="text-[9px] text-slate-400 block">মোট মূল্য</span>
                        <span className="font-extrabold text-amber-300">{formatTaka(item.totalPairs * item.unitSellPrice)}</span>
                        {item.commissionPerPair && item.commissionPerPair > 0 ? (
                          <span className="text-[9px] text-amber-400/80 block">(-৳{item.totalPairs * item.commissionPerPair} কমিশন)</span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => setItemToRemoveIndex(idx)}
                        className="w-8 h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="এই পণ্যটি মেমো থেকে ডিলেট করুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <div className="grid grid-cols-2 gap-1.5">
                {(['নগদ ক্যাশ', 'বিকাশ / নগদ', 'ব্যাংক ট্রান্সফার', 'বাকী (ডিউ)'] as const).map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`px-2 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs'
                          : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <span className="truncate">{method}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
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

      {/* Item Remove Confirmation Modal Popup */}
      {itemToRemoveIndex !== null && items[itemToRemoveIndex] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">পণ্য রিমুভ নিশ্চিতকরণ</h4>
                <p className="text-xs text-slate-400">মেমো তালিকা থেকে পণ্য বাদ দেওয়া</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
              <div className="text-xs font-bold text-amber-300">
                {items[itemToRemoveIndex].articleCode} - {items[itemToRemoveIndex].productName}
              </div>
              <div className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>পরিমাণ: {toBnDigit(items[itemToRemoveIndex].totalPairs)} জোড়া</span>
                <span className="font-bold text-emerald-400">
                  {formatTaka(items[itemToRemoveIndex].totalPairs * items[itemToRemoveIndex].unitSellPrice)}
                </span>
              </div>
            </div>

            {items.length <= 1 ? (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                ⚠️ এটি এই মেমোর একমাত্র পণ্য। মেমোটি কার্যকর রাখতে অন্তত ১টি পণ্য থাকতে হবে।
              </p>
            ) : (
              <p className="text-xs text-slate-300">
                আপনি কি নিশ্চিত যে এই পণ্যটি মেমো থেকে বাদ দিতে চান?
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setItemToRemoveIndex(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  setItems(items.filter((_, idx) => idx !== itemToRemoveIndex));
                  setItemToRemoveIndex(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>হ্যাঁ, বাদ দিন</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export const EditOrderModal = EditPendingOrderModal;
