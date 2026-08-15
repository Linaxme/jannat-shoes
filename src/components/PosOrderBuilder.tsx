import React, { useState, useMemo, useEffect } from 'react';
import { ShoeProduct, Customer, SalesRep, OrderItem, Order, UserAccount, SystemConfig } from '../types';
import { formatTaka, toBnDigit } from '../utils/formatters';
import { ProductImageDisplay } from './Shoe2DPlaceholder';
import {
  ShoppingBag,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  PlusCircle,
  User,
  Store,
  Layers,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Save,
  ClipboardList,
  Zap,
} from 'lucide-react';

interface PosOrderBuilderProps {
  products: ShoeProduct[];
  customers: Customer[];
  sellers: SalesRep[];
  currentUser?: UserAccount | null;
  activeTheme?: any;
  systemConfig?: SystemConfig;
  onCreateOrder: (newOrder: Order) => void;
  onQuickAddCustomer: (newCust: Customer) => void;
}

export const PosOrderBuilder: React.FC<PosOrderBuilderProps> = ({
  products,
  customers,
  sellers,
  currentUser,
  systemConfig,
  onCreateOrder,
  onQuickAddCustomer,
}) => {
  // Read initial draft from localStorage if available
  const savedDraft = useMemo(() => {
    try {
      const saved = localStorage.getItem('lixa_pos_draft');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, []);

  // Customer Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    () => savedDraft?.selectedCustomerId || customers[0]?.id || ''
  );

  // Logged in Seller Resolution
  const currentSellerInfo = useMemo(() => {
    if (currentUser) {
      const matchedSeller = sellers.find(
        (s) => s.id === currentUser.sellerId || (s.name || "").toLowerCase() === (currentUser.name || "").toLowerCase()
      );
      const sellerIdVal = currentUser.sellerId || matchedSeller?.id || currentUser.loginId || currentUser.id;
      return {
        id: matchedSeller?.id || currentUser.sellerId || currentUser.id,
        sellerIdDisplay: sellerIdVal,
        name: currentUser.name,
        area: matchedSeller?.area || currentUser.area || (currentUser.role === 'super_admin' ? 'সুপার এডমিন' : currentUser.role === 'admin' ? 'এডমিন' : 'সেলস এলাকা'),
      };
    }
    const defaultSeller = sellers[0] || { id: 's1', name: 'এডমিন সেলার', area: 'প্রধান শাখা' };
    return {
      ...defaultSeller,
      sellerIdDisplay: defaultSeller.id,
    };
  }, [currentUser, sellers]);

  // Quick Product Entry States
  const [productSearchInput, setProductSearchInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ShoeProduct | null>(null);
  const [entryQty, setEntryQty] = useState<number>(12);
  const [entryUnitType, setEntryUnitType] = useState<'pairs' | 'cartons'>('pairs');
  const [entryPricePerPair, setEntryPricePerPair] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Cart Items
  const [cartItems, setCartItems] = useState<OrderItem[]>(
    () => savedDraft?.cartItems || []
  );

  // Adjustments & Payment
  const [discount, setDiscount] = useState<number>(
    () => typeof savedDraft?.discount === 'number' ? savedDraft.discount : 0
  );
  const [paidAmount, setPaidAmount] = useState<number>(
    () => typeof savedDraft?.paidAmount === 'number' ? savedDraft.paidAmount : 0
  );
  const [paymentMethod, setPaymentMethod] = useState<'নগদ ক্যাশ' | 'বিকাশ / নগদ' | 'ব্যাংক ট্রান্সফার' | 'বাকী (ডিউ)'>(
    () => savedDraft?.paymentMethod || 'নগদ ক্যাশ'
  );
  const [notes, setNotes] = useState<string>(
    () => savedDraft?.notes || ''
  );
  const [orderType, setOrderType] = useState<'sample_booking' | 'direct_sale'>(
    () => savedDraft?.orderType || 'sample_booking'
  );

  // Save POS Draft to LocalStorage continuously so data is preserved when navigating tabs or page reloads
  useEffect(() => {
    if (cartItems.length > 0 || discount > 0 || paidAmount > 0 || notes) {
      localStorage.setItem('lixa_pos_draft', JSON.stringify({
        selectedCustomerId,
        cartItems,
        discount,
        paidAmount,
        paymentMethod,
        notes,
        orderType,
      }));
    } else {
      localStorage.removeItem('lixa_pos_draft');
    }
  }, [selectedCustomerId, cartItems, discount, paidAmount, paymentMethod, notes, orderType]);

  React.useEffect(() => {
    if (systemConfig && systemConfig.enableSampleBooking === false && orderType === 'sample_booking') {
      setOrderType('direct_sale');
    }
  }, [systemConfig, orderType]);

  // Quick New Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Get selected customer details
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Suggestions for auto-complete
  const suggestions = products.filter((p) => {
    if (!productSearchInput.trim()) return false;
    const q = productSearchInput.toLowerCase();
    return (
      (p.articleCode || "").toLowerCase().includes(q) ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q)
    );
  });

  // Cart Calculations
  const totalPairs = cartItems.reduce((sum, item) => sum + item.totalPairs, 0);
  const subTotal = cartItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const grandTotal = Math.max(0, subTotal - discount);
  const previousDue = selectedCustomer?.currentDue || 0;
  const newDueAmount = Math.max(0, grandTotal - paidAmount);
  const totalNetDue = previousDue + newDueAmount;

  // Handle Select Suggestion
  const handleSelectSuggestion = (p: ShoeProduct) => {
    setSelectedProduct(p);
    setProductSearchInput(`${p.articleCode} - ${p.name}`);
    setEntryPricePerPair(p.sellPrice || p.buyPrice || 0);
    setShowSuggestions(false);
  };

  // Add Item to Cart
  const handleAddProductToMemo = () => {
    let prod = selectedProduct;

    if (!prod && productSearchInput.trim()) {
      const match = products.find(
        (p) =>
          (p.articleCode || "").toLowerCase() === productSearchInput.trim().toLowerCase() ||
          (p.name || "").toLowerCase().includes(productSearchInput.trim().toLowerCase())
      );
      if (match) prod = match;
    }

    if (!prod) {
      alert('অনুগ্রহ করে সঠিক প্রোডাক্ট নাম বা আর্টিকল কোড নির্বাচন করুন!');
      return;
    }

    if (entryQty <= 0) {
      alert('অনুগ্রহ করে সঠিক পরিমাণ দিন!');
      return;
    }

    const price = entryPricePerPair > 0 ? entryPricePerPair : (prod.sellPrice || prod.buyPrice);
    const calculatedPairs = entryUnitType === 'cartons' ? entryQty * prod.pairsPerCarton : entryQty;
    const itemTotalAmount = calculatedPairs * price;

    const existingIndex = cartItems.findIndex(
      (item) => item.productId === prod!.id && item.unitType === entryUnitType
    );
    
    // Check total existing pairs in POS cart for this product
    const currentCartPairs = cartItems
      .filter((item) => item.productId === prod!.id)
      .reduce((sum, item) => sum + item.totalPairs, 0);

    if (currentCartPairs + calculatedPairs > prod.stockPairs) {
      alert(`দুঃখিত, পর্যাপ্ত স্টক নেই! বর্তমানে স্টক আছে ${toBnDigit(prod.stockPairs)} জোড়া।`);
      return;
    }

    if (existingIndex > -1) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantityInput + entryQty;
      const newPairs = entryUnitType === 'cartons' ? newQty * prod.pairsPerCarton : newQty;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantityInput: newQty,
        totalPairs: newPairs,
        unitSellPrice: price,
        totalAmount: newPairs * price,
      };
      setCartItems(updated);
    } else {
      const newItem: OrderItem = {
        productId: prod.id,
        articleCode: prod.articleCode,
        productName: prod.name,
        sizeRange: prod.sizeRange,
        unitType: entryUnitType,
        quantityInput: entryQty,
        totalPairs: calculatedPairs,
        unitSellPrice: price,
        unitBuyPrice: prod.buyPrice,
        totalAmount: itemTotalAmount,
      };
      setCartItems([...cartItems, newItem]);
    }

    // Reset entry inputs
    setProductSearchInput('');
    setSelectedProduct(null);
    setEntryQty(12);
    setEntryPricePerPair(0);
  };

  // Update Cart Quantity
  const handleUpdateQty = (index: number, newQtyInput: number) => {
    if (newQtyInput <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...cartItems];
    const item = updated[index];
    const product = products.find((p) => p.id === item.productId);
    
    if (!product) return;

    const pairsPerCarton = product ? product.pairsPerCarton : 12;

    const newPairs = item.unitType === 'cartons' ? newQtyInput * pairsPerCarton : newQtyInput;
    
    // Check total pairs for this product across all POS cart items (excluding the old quantity of THIS item)
    const otherCartPairs = cartItems
      .filter((c, i) => c.productId === item.productId && i !== index)
      .reduce((sum, c) => sum + c.totalPairs, 0);

    if (otherCartPairs + newPairs > product.stockPairs) {
      alert(`দুঃখিত, পর্যাপ্ত স্টক নেই! বর্তমানে স্টক আছে ${toBnDigit(product.stockPairs)} জোড়া।`);
      return;
    }

    updated[index] = {
      ...item,
      quantityInput: newQtyInput,
      totalPairs: newPairs,
      totalAmount: newPairs * item.unitSellPrice,
    };
    setCartItems(updated);
  };

  // Update Cart Item Price
  const handleUpdateUnitPrice = (index: number, newPriceInput: number) => {
    const updated = [...cartItems];
    const item = updated[index];
    const validPrice = Math.max(0, newPriceInput);
    updated[index] = {
      ...item,
      unitSellPrice: validPrice,
      totalAmount: item.totalPairs * validPrice,
    };
    setCartItems(updated);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Submit Order
  const handleSubmitOrder = () => {
    if (cartItems.length === 0) {
      alert('অনুগ্রহ করে প্রথমে অন্তত একটি প্রোডাক্ট মেমোতে যোগ করুন!');
      return;
    }
    if (!selectedCustomer) {
      alert('অনুগ্রহ করে কাস্টমার সিলেক্ট করুন!');
      return;
    }

    if (orderType === 'sample_booking') {
      const confirmBooking = window.confirm(`আপনি কি এই অর্ডারটি বুকিং করতে চান?\n\nমোট জোড়া: ${totalPairs}\nআনুমানিক বিল: ৳ ${grandTotal.toLocaleString('bn-BD')}`);
      if (!confirmBooking) return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    const memoNo = `MEMO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let status: 'পরিশোধিত' | 'আংশিক বাকী' | 'সম্পূর্ণ বাকী' = 'পরিশোধিত';
    if (paidAmount === 0) {
      status = 'সম্পূর্ণ বাকী';
    } else if (paidAmount < grandTotal) {
      status = 'আংশিক বাকী';
    }

    const approxCartons = Math.ceil(totalPairs / 12);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      memoNo,
      date: todayStr,
      time: nowTime,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      shopName: selectedCustomer.shopName,
      customerPhone: selectedCustomer.phone,
      customerAddress: selectedCustomer.address,
      sellerId: currentSellerInfo.id,
      sellerName: currentSellerInfo.name,
      items: cartItems,
      totalPairs,
      totalCartons: approxCartons,
      subTotal,
      discount,
      adjustmentAmount: 0,
      grandTotal,
      paidAmount,
      dueAmount: newDueAmount,
      previousDue,
      totalNetDue,
      paymentMethod,
      status,
      orderType,
      deliveryStatus: orderType === 'sample_booking' ? 'booked' : 'delivered',
      notes,
    };

    onCreateOrder(newOrder);
    setCartItems([]);
    setDiscount(0);
    setPaidAmount(0);
    setNotes('');
    localStorage.removeItem('lixa_pos_draft');
  };

  // Clear draft order manually
  const handleClearDraft = () => {
    if (window.confirm('আপনি কি নিশ্চিত যে বর্তমান খসড়া মেমোর সমস্ত তথ্য মুছে নতুন মেমো শুরু করতে চান?')) {
      setCartItems([]);
      setDiscount(0);
      setPaidAmount(0);
      setNotes('');
      localStorage.removeItem('lixa_pos_draft');
    }
  };

  // Save Quick Customer
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !newCustName.trim()) {
      alert('দোকানের নাম ও প্রোপাইটারের নাম পূরণ করা আবশ্যক!');
      return;
    }
    const sellerId = currentUser?.sellerId || currentSellerInfo.id || currentUser?.id || '';
    const sellerName = currentSellerInfo.name || currentUser?.name || 'প্রধান শাখা';

    const newCust: Customer = {
      id: `c-${Date.now()}`,
      name: newCustName.trim(),
      shopName: newShopName.trim(),
      address: newAddress.trim() || 'ঢাকা',
      phone: newPhone.trim() || '01700-000000',
      assignedSellerId: sellerId,
      assignedSellerName: sellerName,
      currentDue: 0,
      creditLimit: 50000,
    };
    onQuickAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewShopName('');
    setNewAddress('');
    setNewPhone('');
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      
      {/* Minimal Header like Dashboard */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-black text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            বিক্রয় ও অর্ডার বুকিং
          </span>
          <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-slate-800 to-transparent flex-1" />
        </div>

        {/* Draft indicator & Reset button */}
        {cartItems.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>খসড়া ({toBnDigit(cartItems.length)}টি)</span>
            </span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="নতুন মেমো শুরু করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>নতুন মেমো</span>
            </button>
          </div>
        )}
      </div>

      {/* Two Tabs: অর্ডার বুকিং (Order Booking) vs সরাসরি বিক্রয় (Direct Sale) */}
      {(!systemConfig || systemConfig.enableSampleBooking) && (
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType('sample_booking')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                orderType === 'sample_booking'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/80'
              }`}
            >
              <ClipboardList className={`w-4 h-4 ${orderType === 'sample_booking' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>অর্ডার বুকিং</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderType('direct_sale')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                orderType === 'direct_sale'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/80'
              }`}
            >
              <Zap className={`w-4 h-4 ${orderType === 'direct_sale' ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span>সরাসরি বিক্রয়</span>
            </button>
          </div>
        </div>
      )}

      {/* Customer Selection Card */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              কাস্টমার / দোকান সিলেক্ট করুন:
            </label>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5 font-bold"
            >
              <PlusCircle className="w-3 h-3" /> নতুন কাস্টমার
            </button>
          </div>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                {c.shopName} ({c.name}) - বাকী: ৳{c.currentDue}
              </option>
            ))}
          </select>
          {selectedCustomer && (
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>ঠিকানা: {selectedCustomer.address}</span>
              <span className="text-rose-400 font-semibold">
                পূর্বের বাকী: {formatTaka(selectedCustomer.currentDue)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ENTRY BOX (Product Search, Quantity & Price Inputs) */}
      <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl space-y-3 shadow-lg">
        <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400" />
          প্রোডাক্ট যোগ করার তথ্য
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          
          {/* Product Auto-complete Search Box (Span 6 on desktop) */}
          <div className="sm:col-span-6 relative">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              প্রোডাক্ট নাম বা আর্টিকল কোড:
            </label>
            <div className="relative">
              <input
                type="text"
                value={productSearchInput}
                onChange={(e) => {
                  setProductSearchInput(e.target.value);
                  setSelectedProduct(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="আর্টিকল কোড বা নাম..."
                className="w-full bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* Suggestions Overlay Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800/80">
                {suggestions.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectSuggestion(p)}
                    className="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex-shrink-0">
                        <ProductImageDisplay
                          src={p.imageUrl}
                          alt={p.articleCode}
                          articleCode={p.articleCode}
                          category={p.category}
                          size="xs"
                          showLabel={false}
                        />
                      </div>
                      <div className="font-bold text-amber-300 font-mono text-xs">{p.articleCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">৳{p.sellPrice}/জোড়া</div>
                      <div className="text-[10px] text-slate-400">স্টক: {toBnDigit(p.stockPairs)} জোড়া</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quantity Input Box (Span 3) */}
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                পরিমাণ:
              </label>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setEntryUnitType('pairs')}
                  className={`px-1.5 py-0.5 rounded font-bold ${
                    entryUnitType === 'pairs' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  জোড়া
                </button>
                <button
                  type="button"
                  onClick={() => setEntryUnitType('cartons')}
                  className={`px-1.5 py-0.5 rounded font-bold ${
                    entryUnitType === 'cartons' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  ডজন
                </button>
              </div>
            </div>
            <input
              type="number"
              min="1"
              value={entryQty || ''}
              onChange={(e) => setEntryQty(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 text-xs sm:text-sm text-amber-300 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Price per pair Input Box (Span 3) */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              প্রতি জোড়ার দাম (৳):
            </label>
            <input
              type="number"
              min="0"
              value={entryPricePerPair || ''}
              onChange={(e) => setEntryPricePerPair(parseFloat(e.target.value) || 0)}
              placeholder="দাম"
              className="w-full bg-slate-950 border border-slate-800 text-xs sm:text-sm text-emerald-400 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>

        {/* Add Button */}
        <div className="pt-1 text-right">
          <button
            type="button"
            onClick={handleAddProductToMemo}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            মেমোতে যোগ করুন
          </button>
        </div>

      </div>

      {/* MEMO CART TABLE (Mobile Scrollable Table) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            মেমো আইটেম তালিকা ({toBnDigit(cartItems.length)} টি)
          </h3>
          <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            মোট {toBnDigit(totalPairs)} জোড়া
          </span>
        </div>

        {cartItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            মেমো খালি — আর্টিকল কোড দিয়ে জুতা যোগ করুন
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[550px] w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium pb-2">
                  <th className="pb-2.5 pr-3">প্রোডাক্ট ও আর্টিকল</th>
                  <th className="pb-2.5 px-3">সাইজ</th>
                  <th className="pb-2.5 px-3 text-center">পরিমাণ</th>
                  <th className="pb-2.5 px-3 text-right">দর (৳/জোড়া)</th>
                  <th className="pb-2.5 px-3 text-right">মোট বিল (৳)</th>
                  <th className="pb-2.5 pl-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {cartItems.map((item, index) => (
                  <tr key={`${item.productId}-${item.unitType}-${index}`} className="hover:bg-slate-800/40">
                    
                    {/* Article Only */}
                    <td className="py-3 pr-3">
                      <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-xs">
                        {item.articleCode}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-3 text-slate-300 font-semibold">
                      {item.sizeRange ? item.sizeRange.replace(/\(.*?\)/g, '').trim() : '৩৯-৪৪'}
                    </td>

                    {/* Quantity Control */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={item.quantityInput}
                          onChange={(e) => handleUpdateQty(index, parseInt(e.target.value) || 1)}
                          className="w-14 bg-slate-950 border border-slate-700 text-amber-300 font-bold text-center text-xs py-1 rounded-lg focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {item.unitType === 'cartons' ? 'ডজন' : 'জোড়া'}
                        </span>
                      </div>
                    </td>

                    {/* Unit Price (Editable) */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span className="text-[11px] text-slate-400 font-bold">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitSellPrice}
                          onChange={(e) => handleUpdateUnitPrice(index, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-slate-950 border border-slate-700 text-emerald-400 font-bold text-right text-xs py-1 px-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                          title="দর পরিবর্তন করুন"
                        />
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      {formatTaka(item.totalAmount)}
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CALCULATIONS & FINAL PAYMENT CARD */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          টাকার হিসাব ও মেমো নিশ্চিতকরণ
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          {/* Left Column: Totals */}
          <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between text-slate-300">
              <span>মোট বিল (Subtotal):</span>
              <span className="font-bold text-slate-100">{formatTaka(subTotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">ছাড় / ডিসকাউন্ট (৳):</span>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-28 bg-slate-900 border border-slate-700 text-amber-300 font-bold text-right text-xs py-1 px-2 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex justify-between text-slate-100 font-bold text-sm py-1 border-t border-slate-800">
              <span>সর্বমোট বিল (Grand Total):</span>
              <span className="text-amber-400 text-base">{formatTaka(grandTotal)}</span>
            </div>
          </div>

          {/* Right Column: Payment & Due */}
          <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">নগদ জমা (৳):</span>
              <input
                type="number"
                min="0"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-28 bg-slate-900 border border-emerald-500/80 text-emerald-400 font-bold text-right text-xs py-1 px-2 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">পেমেন্ট মাধ্যম:</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 focus:outline-none text-xs"
              >
                <option value="নগদ ক্যাশ">নগদ ক্যাশ</option>
                <option value="বিকাশ / নগদ">বিকাশ / নগদ</option>
                <option value="ব্যাংক ট্রান্সফার">ব্যাংক ট্রান্সফার</option>
                <option value="বাকী (ডিউ)">বাকী (ডিউ)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-rose-300 font-semibold">
                <span>এই চালানের নতুন বাকী:</span>
                <span>{formatTaka(newDueAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>কাস্টমারের পূর্বের বাকী:</span>
                <span>{formatTaka(previousDue)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-800 text-rose-400">
                <span>কাস্টমারের সর্বমোট বাকী:</span>
                <span className="text-sm">{formatTaka(totalNetDue)}</span>
              </div>
            </div>

          </div>

        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmitOrder}
          disabled={cartItems.length === 0}
          className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-all ${
            cartItems.length > 0
              ? orderType === 'sample_booking'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-emerald-500/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          {orderType === 'sample_booking' ? 'অর্ডার বুকিং নিশ্চিত করুন' : 'সরাসরি বিক্রয় মেমো নিশ্চিত করুন'}
        </button>

      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
              নতুন কাস্টমার যোগ করুন
            </h3>

            <form onSubmit={handleSaveQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">দোকানের নাম *</label>
                <input
                  type="text"
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="দোকানের নাম"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">মালিকের নাম *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="মালিকের নাম"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="মোবাইল নম্বর"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ঠিকানা / জেলা</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="জেলা / ঠিকানা"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl shadow"
                >
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

