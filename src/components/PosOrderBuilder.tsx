import React, { useState, useMemo, useEffect } from 'react';
import { ShoeProduct, Customer, SalesRep, OrderItem, Order, UserAccount, SystemConfig } from '../types';
import { formatTaka, toBnDigit, getLocalDateStr } from '../utils/formatters';
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
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';

interface PosOrderBuilderProps {
  products: ShoeProduct[];
  customers: Customer[];
  sellers: SalesRep[];
  currentUser?: UserAccount | null;
  activeTheme?: any;
  systemConfig?: SystemConfig;
  preSelectedCustomerId?: string;
  onCreateOrder: (newOrder: Order) => void;
  onQuickAddCustomer: (newCust: Customer) => void;
}

export const PosOrderBuilder: React.FC<PosOrderBuilderProps> = ({
  products,
  customers,
  sellers,
  currentUser,
  systemConfig,
  preSelectedCustomerId,
  onCreateOrder,
  onQuickAddCustomer,
}) => {
  // Read initial draft from localStorage safely for state initialization
  const [initialDraft] = useState(() => {
    try {
      const saved = localStorage.getItem('lixa_pos_draft');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Customer Selection by Phone / Name Auto-lookup
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    () => preSelectedCustomerId || (initialDraft?.cartItems?.length > 0 ? (initialDraft?.selectedCustomerId || '') : '')
  );

  useEffect(() => {
    if (preSelectedCustomerId) {
      setSelectedCustomerId(preSelectedCustomerId);
    }
  }, [preSelectedCustomerId]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  // Filtered customer suggestions
  const customerSuggestions = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    const q = customerSearchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');

    return customers.filter((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      const phoneMatch = cleanQ.length > 0 && cPhone.includes(cleanQ);
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const shopMatch = (c.shopName || '').toLowerCase().includes(q);
      const addressMatch = (c.address || '').toLowerCase().includes(q);
      return phoneMatch || nameMatch || shopMatch || addressMatch;
    }).slice(0, 8);
  }, [customers, customerSearchQuery]);

  // If user types a full 11-digit phone number, auto-select if exact match exists
  useEffect(() => {
    const clean = customerSearchQuery.replace(/\D/g, '');
    if (clean.length === 11) {
      const exactMatch = customers.find((c) => (c.phone || '').replace(/\D/g, '') === clean);
      if (exactMatch && exactMatch.id !== selectedCustomerId) {
        setSelectedCustomerId(exactMatch.id);
        setShowCustomerDropdown(false);
      }
    }
  }, [customerSearchQuery, customers, selectedCustomerId]);

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
  const [entryQty, setEntryQty] = useState<number | string>('');
  const [entryUnitType, setEntryUnitType] = useState<'pairs' | 'cartons'>('pairs');
  const [entryPricePerPair, setEntryPricePerPair] = useState<number | string>('');
  const [entryCommissionPerPair, setEntryCommissionPerPair] = useState<number | string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Cart Items
  const [cartItems, setCartItems] = useState<OrderItem[]>(
    () => initialDraft?.cartItems || []
  );

  // Adjustments & Payment
  const [discount, setDiscount] = useState<number | string>(
    () => typeof initialDraft?.discount === 'number' && initialDraft.discount > 0 ? initialDraft.discount : ''
  );
  const [paidAmount, setPaidAmount] = useState<number | string>(
    () => typeof initialDraft?.paidAmount === 'number' && initialDraft.paidAmount > 0 ? initialDraft.paidAmount : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<'নগদ ক্যাশ' | 'বিকাশ / নগদ' | 'ব্যাংক ট্রান্সফার' | 'বাকী (ডিউ)'>(
    () => initialDraft?.paymentMethod || 'নগদ ক্যাশ'
  );
  const [notes, setNotes] = useState<string>(
    () => initialDraft?.notes || ''
  );
  const [orderType, setOrderType] = useState<'sample_booking' | 'direct_sale'>(
    () => initialDraft?.orderType || 'sample_booking'
  );

  // Save POS Draft to LocalStorage continuously so data is preserved when navigating tabs or page reloads
  useEffect(() => {
    if (cartItems.length > 0 || Number(discount) > 0 || Number(paidAmount) > 0 || notes) {
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

  useEffect(() => {
    if (systemConfig && systemConfig.enableSampleBooking === false && orderType === 'sample_booking') {
      setOrderType('direct_sale');
    }
  }, [systemConfig, orderType]);

  // Form error and submission state
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Quick New Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOpeningDue, setNewOpeningDue] = useState<number | string>('');

  // Get selected customer details - null/undefined if no customer is selected yet
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Suggestions for auto-complete
  const suggestions = products.filter((p) => {
    if (!productSearchInput.trim()) return false;
    const q = productSearchInput.toLowerCase();
    return (
      (p.articleCode || "").toLowerCase().includes(q) ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.sizeRange || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q)
    );
  });

  // Cart Calculations
  const discountNum = typeof discount === 'number' ? discount : parseFloat(discount) || 0;
  const paidAmountNum = typeof paidAmount === 'number' ? paidAmount : parseFloat(paidAmount) || 0;

  const totalPairs = cartItems.reduce((sum, item) => sum + item.totalPairs, 0);
  const grossTotal = cartItems.reduce((sum, item) => sum + (item.totalPairs * item.unitSellPrice), 0);
  const totalCommission = cartItems.reduce((sum, item) => sum + (item.totalPairs * (item.commissionPerPair || 0)), 0);
  const subTotal = grossTotal - totalCommission;
  const grandTotal = Math.max(0, subTotal - discountNum);
  const previousDue = selectedCustomer?.currentDue || 0;
  const newDueAmount = Math.max(0, grandTotal - paidAmountNum);
  const overpaidAmount = Math.max(0, paidAmountNum - grandTotal);
  const totalNetDue = previousDue + newDueAmount - overpaidAmount;

  // Handle Select Suggestion
  const handleSelectSuggestion = (p: ShoeProduct) => {
    setSelectedProduct(p);
    setProductSearchInput(`${p.articleCode} - ${p.name}`);
    setEntryPricePerPair(p.sellPrice || p.buyPrice || '');
    setEntryCommissionPerPair('');
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

    const qtyNumber = typeof entryQty === 'number' ? entryQty : parseInt(entryQty as string) || 0;
    if (qtyNumber <= 0) {
      alert('অনুগ্রহ করে জোড়ার পরিমাণ লিখুন!');
      return;
    }

    const parsedPrice = typeof entryPricePerPair === 'number' ? entryPricePerPair : parseFloat(entryPricePerPair as string);
    const price = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : (prod.sellPrice || prod.buyPrice || 0);

    const parsedCommission = typeof entryCommissionPerPair === 'number' ? entryCommissionPerPair : parseFloat(entryCommissionPerPair as string);
    const commission = !isNaN(parsedCommission) && parsedCommission > 0 ? parsedCommission : 0;
    const netUnitPrice = Math.max(0, price - commission);

    const calculatedPairs = entryUnitType === 'cartons' ? qtyNumber * prod.pairsPerCarton : qtyNumber;
    const itemTotalCommission = calculatedPairs * commission;
    const itemTotalAmount = calculatedPairs * netUnitPrice;

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
      const newQty = updated[existingIndex].quantityInput + qtyNumber;
      const newPairs = entryUnitType === 'cartons' ? newQty * prod.pairsPerCarton : newQty;
      const effectiveComm = commission > 0 ? commission : (updated[existingIndex].commissionPerPair || 0);
      const effectiveNet = Math.max(0, price - effectiveComm);
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantityInput: newQty,
        totalPairs: newPairs,
        unitSellPrice: price,
        commissionPerPair: effectiveComm,
        netUnitPrice: effectiveNet,
        totalCommission: newPairs * effectiveComm,
        totalAmount: newPairs * effectiveNet,
      };
      setCartItems(updated);
    } else {
      const newItem: OrderItem = {
        productId: prod.id,
        articleCode: prod.articleCode,
        productName: prod.name,
        sizeRange: prod.sizeRange,
        unitType: entryUnitType,
        quantityInput: qtyNumber,
        totalPairs: calculatedPairs,
        unitSellPrice: price,
        commissionPerPair: commission,
        netUnitPrice,
        totalCommission: itemTotalCommission,
        unitBuyPrice: prod.buyPrice,
        totalAmount: itemTotalAmount,
      };
      setCartItems([...cartItems, newItem]);
    }

    // Reset entry inputs to empty
    setProductSearchInput('');
    setSelectedProduct(null);
    setEntryQty('');
    setEntryPricePerPair('');
    setEntryCommissionPerPair('');
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

    const comm = item.commissionPerPair || 0;
    const netRate = Math.max(0, item.unitSellPrice - comm);
    updated[index] = {
      ...item,
      quantityInput: newQtyInput,
      totalPairs: newPairs,
      netUnitPrice: netRate,
      totalCommission: newPairs * comm,
      totalAmount: newPairs * netRate,
    };
    setCartItems(updated);
  };

  // Update Cart Item Price
  const handleUpdateUnitPrice = (index: number, newPriceInput: number) => {
    const updated = [...cartItems];
    const item = updated[index];
    const validPrice = Math.max(0, newPriceInput);
    const comm = item.commissionPerPair || 0;
    const netRate = Math.max(0, validPrice - comm);
    updated[index] = {
      ...item,
      unitSellPrice: validPrice,
      netUnitPrice: netRate,
      totalCommission: item.totalPairs * comm,
      totalAmount: item.totalPairs * netRate,
    };
    setCartItems(updated);
  };

  // Update Cart Item Commission
  const handleUpdateCommission = (index: number, newCommissionInput: number) => {
    const updated = [...cartItems];
    const item = updated[index];
    const validComm = Math.max(0, newCommissionInput);
    const netRate = Math.max(0, item.unitSellPrice - validComm);
    updated[index] = {
      ...item,
      commissionPerPair: validComm,
      netUnitPrice: netRate,
      totalCommission: item.totalPairs * validComm,
      totalAmount: item.totalPairs * netRate,
    };
    setCartItems(updated);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Submit Order
  const handleSubmitOrder = async () => {
    setFormError(null);

    if (cartItems.length === 0) {
      setFormError('অনুগ্রহ করে প্রথমে অন্তত একটি প্রোডাক্ট মেমোতে যোগ করুন!');
      return;
    }
    if (!selectedCustomer) {
      setFormError('অনুগ্রহ করে কাস্টমার সিলেক্ট করুন বা নতুন কাস্টমার যোগ করুন!');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const todayStr = getLocalDateStr(new Date());
      const nowTime = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
      const memoNo = `MEMO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      let status: 'পরিশোধিত' | 'আংশিক বাকী' | 'সম্পূর্ণ বাকী' = 'পরিশোধিত';
      if (paidAmountNum === 0) {
        status = 'সম্পূর্ণ বাকী';
      } else if (paidAmountNum < grandTotal) {
        status = 'আংশিক বাকী';
      }

      const approxCartons = Math.ceil(totalPairs / 12);

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        createdAt: Date.now(),
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
        subTotal: grossTotal,
        totalCommission,
        discount: discountNum,
        adjustmentAmount: 0,
        grandTotal,
        paidAmount: paidAmountNum,
        dueAmount: newDueAmount,
        previousDue,
        totalNetDue,
        paymentMethod,
        status,
        orderType,
        deliveryStatus: orderType === 'sample_booking' ? 'booked' : 'delivered',
        notes,
      };

      await onCreateOrder(newOrder);
      setCartItems([]);
      setDiscount('');
      setPaidAmount('');
      setNotes('');
      setSelectedCustomerId('');
      setCustomerSearchQuery('');
      localStorage.removeItem('lixa_pos_draft');
    } catch (err) {
      console.error('Submit order error:', err);
      setFormError('অর্ডার প্রক্রিয়া করার সময় ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Clear draft order manually
  const handleClearDraft = () => {
    setCartItems([]);
    setDiscount('');
    setPaidAmount('');
    setNotes('');
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setFormError(null);
    localStorage.removeItem('lixa_pos_draft');
  };

  // Save Quick Customer
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !newCustName.trim()) {
      setFormError('দোকানের নাম ও প্রোপাইটারের নাম পূরণ করা আবশ্যক!');
      return;
    }
    const sellerId = currentUser?.sellerId || currentSellerInfo.id || currentUser?.id || '';
    const sellerName = currentSellerInfo.name || currentUser?.name || 'প্রধান শাখা';

    const initialDueVal = Math.max(0, Number(newOpeningDue) || 0);

    const newCust: Customer = {
      id: `c-${Date.now()}`,
      name: newCustName.trim(),
      shopName: newShopName.trim(),
      address: newAddress.trim() || 'ঢাকা',
      phone: newPhone.trim() || '',
      assignedSellerId: sellerId,
      assignedSellerName: sellerName,
      currentDue: initialDueVal,
      creditLimit: 50000,
    };
    onQuickAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewShopName('');
    setNewAddress('');
    setNewPhone('');
    setNewOpeningDue('');
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

      {/* Customer Selection: Smart Phone / Name Search without long dropdown */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-amber-400" />
            দোকানদার / কাস্টমার:
          </label>
          <button
            type="button"
            onClick={() => {
              setNewPhone(customerSearchQuery.replace(/\D/g, ''));
              setShowAddCustomerModal(true);
            }}
            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" /> + নতুন কাস্টমার
          </button>
        </div>

        {/* Customer Search & Phone Input with live auto-lookup */}
        <div className="relative">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4 text-amber-400" />
              </div>
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="ফোন নম্বর বা দোকানের নাম..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
              {customerSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearchQuery('');
                    setSelectedCustomerId('');
                    setShowCustomerDropdown(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick change / reset button */}
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId('');
                  setCustomerSearchQuery('');
                  setShowCustomerDropdown(true);
                }}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
                title="দোকান পরিবর্তন করুন"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>পরিবর্তন</span>
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showCustomerDropdown && customerSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800/80">
              <div className="p-2 bg-slate-900/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ম্যাচিং রেজিস্টার্ড দোকান ({toBnDigit(customerSuggestions.length)}টি):
              </div>
              {customerSuggestions.map((c, idx) => (
                <div
                  key={`cust-sugg-${c.id}-${idx}`}
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setCustomerSearchQuery(c.phone ? `${c.shopName} - ${c.phone}` : c.shopName);
                    setShowCustomerDropdown(false);
                  }}
                  className={`p-2.5 hover:bg-amber-500/10 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs ${
                    selectedCustomerId === c.id ? 'bg-amber-500/15 border-l-2 border-amber-400' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{c.shopName}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({c.name})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      {c.phone && <span className="font-mono">{c.phone}</span>}
                      {c.phone && <span>•</span>}
                      <span className="truncate font-sans">{c.address}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400">বর্তমান বাকী</div>
                    <div className={`font-bold ${c.currentDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatTaka(c.currentDue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Not found state if user typed phone/name but no match */}
          {showCustomerDropdown && customerSearchQuery.trim() && customerSuggestions.length === 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-center space-y-2">
              <p className="text-xs text-slate-400">
                "<span className="text-amber-300 font-semibold">{customerSearchQuery}</span>" নামে বা নম্বরে কোনো দোকান পাওয়া যায়নি।
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewPhone(customerSearchQuery.replace(/\D/g, ''));
                  setShowAddCustomerModal(true);
                  setShowCustomerDropdown(false);
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                নতুন দোকান হিসেবে যুক্ত করুন
              </button>
            </div>
          )}
        </div>

        {/* Selected Customer Highlight Card */}
        {selectedCustomer ? (
          <div className="p-3 bg-slate-950/70 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Store className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-300 text-sm truncate">
                {selectedCustomer.shopName}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                <span className="text-[11px] text-slate-400">পূর্বের বকেয়া:</span>
                <span className={`font-black text-sm ${selectedCustomer.currentDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatTaka(selectedCustomer.currentDue)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId('');
                  setCustomerSearchQuery('');
                }}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors cursor-pointer"
                title="বাতিল করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400/80" />
            <span>দোকান বা কাস্টমার নির্বাচন করুন</span>
          </div>
        )}
      </div>


      {/* QUICK ENTRY BOX (Product Search, Quantity & Price Inputs) */}
      <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl space-y-3 shadow-lg">
        <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400" />
          আইটেম এন্ট্রি
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          
          {/* Product Auto-complete Search Box */}
          <div className={`${currentUser?.role === 'admin' ? 'sm:col-span-5' : 'sm:col-span-6'} relative`}>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              প্রোডাক্ট / আর্টিকল:
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
                placeholder="আর্টিকল বা নাম..."
                className="w-full bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* Suggestions Overlay Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-950 border border-slate-700/90 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800/80">
                {suggestions.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectSuggestion(p)}
                    className="p-2.5 hover:bg-slate-800/90 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex-shrink-0">
                        <ProductImageDisplay
                          src={p.imageUrl}
                          alt={p.articleCode}
                          articleCode={p.articleCode}
                          category={p.category}
                          size="xs"
                          showLabel={false}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-amber-300 font-mono text-xs">{p.articleCode}</span>
                          <span className="text-slate-200 font-medium truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] flex-wrap">
                          <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded font-semibold text-[10px]">
                            সাইজ: {p.sizeRange || '৩৯-৪৪'}
                          </span>
                          {p.category && (
                            <span className="text-slate-400 text-[10px] hidden sm:inline">• {p.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-emerald-400 text-xs">৳{p.sellPrice}/জোড়া</div>
                      <div className="text-[11px] text-slate-300">
                        স্টক: <span className="text-amber-400 font-bold">{toBnDigit(p.stockPairs)}</span> জোড়া
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Product Size & Stock Quick Badge */}
            {selectedProduct && (
              <div className="mt-2 px-2.5 py-1.5 bg-slate-950/90 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 text-[11px]">সাইজ:</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-xs">
                    {selectedProduct.sizeRange || '৩৯-৪৪'}
                  </span>
                  <span className="text-slate-400 text-[11px] ml-1">স্টক:</span>
                  <span className="text-emerald-400 font-bold text-xs">
                    {toBnDigit(selectedProduct.stockPairs)} জোড়া
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  (প্রতি ডজন {toBnDigit(selectedProduct.pairsPerCarton || 12)} জোড়া)
                </span>
              </div>
            )}
          </div>

          {/* Quantity Input Box */}
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
              value={entryQty}
              onChange={(e) => setEntryQty(e.target.value === '' ? '' : parseInt(e.target.value))}
              placeholder="পরিমাণ"
              className="w-full bg-slate-950 border border-slate-800 text-xs sm:text-sm text-amber-300 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Price per pair Input Box */}
          <div className={`${currentUser?.role === 'admin' ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              দর (৳):
            </label>
            <input
              type="number"
              min="0"
              value={entryPricePerPair}
              onChange={(e) => setEntryPricePerPair(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="দর"
              className="w-full bg-slate-950 border border-slate-800 text-xs sm:text-sm text-emerald-400 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Commission per pair Input Box (Admin Only) */}
          {currentUser?.role === 'admin' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-amber-300 mb-1">
                কমিশন (৳):
              </label>
              <input
                type="number"
                min="0"
                value={entryCommissionPerPair}
                onChange={(e) => setEntryCommissionPerPair(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="কমিশন"
                className="w-full bg-slate-950 border border-amber-500/40 text-xs sm:text-sm text-amber-300 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

        </div>

        {/* Live Calculation Preview when Price and Commission are present */}
        {Number(entryPricePerPair) > 0 && Number(entryCommissionPerPair) > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-amber-300">
            <span className="font-semibold text-slate-300">হিসাব প্রিভিউ:</span>
            <span>বিক্রয় মূল্য ৳{entryPricePerPair} - কমিশন ৳{entryCommissionPerPair} =</span>
            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              নিট দর ৳{Math.max(0, Number(entryPricePerPair) - Number(entryCommissionPerPair))}/জোড়া
            </span>
            {Number(entryQty) > 0 && (
              <span className="text-slate-400 text-[11px] ml-auto">
                (মোট: {entryUnitType === 'cartons' ? Number(entryQty) * (selectedProduct?.pairsPerCarton || 12) : entryQty} জোড়া | নিট বিল: ৳{((entryUnitType === 'cartons' ? Number(entryQty) * (selectedProduct?.pairsPerCarton || 12) : Number(entryQty)) * Math.max(0, Number(entryPricePerPair) - Number(entryCommissionPerPair))).toLocaleString('bn-BD')})
              </span>
            )}
          </div>
        )}

        {/* Add Button */}
        <div className="pt-1 text-right">
          <button
            type="button"
            onClick={handleAddProductToMemo}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
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
            <table className="min-w-[620px] w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium pb-2">
                  <th className="pb-2.5 pr-2">প্রোডাক্ট ও আর্টিকল</th>
                  <th className="pb-2.5 px-2">সাইজ</th>
                  <th className="pb-2.5 px-2 text-center">পরিমাণ</th>
                  <th className="pb-2.5 px-2 text-right">বিক্রয় দর (৳)</th>
                  <th className="pb-2.5 px-2 text-right">কমিশন (৳)</th>
                  <th className="pb-2.5 px-2 text-right">নিট মোট (৳)</th>
                  <th className="pb-2.5 pl-2 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {cartItems.map((item, index) => (
                  <tr key={`${item.productId}-${item.unitType}-${index}`} className="hover:bg-slate-800/40">
                    
                    {/* Article Only */}
                    <td className="py-3 pr-2">
                      <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-xs">
                        {item.articleCode}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-2 text-slate-300 font-semibold">
                      {item.sizeRange ? item.sizeRange.replace(/\(.*?\)/g, '').trim() : '৩৯-৪৪'}
                    </td>

                    {/* Quantity Control */}
                    <td className="py-3 px-2 text-center">
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
                    <td className="py-3 px-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span className="text-[11px] text-slate-400 font-bold">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitSellPrice}
                          onChange={(e) => handleUpdateUnitPrice(index, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-950 border border-slate-700 text-emerald-400 font-bold text-right text-xs py-1 px-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                          title="দর পরিবর্তন করুন"
                        />
                      </div>
                      {item.commissionPerPair && item.commissionPerPair > 0 ? (
                        <div className="text-[10px] text-slate-400 font-normal">
                          নিট: ৳{item.unitSellPrice - item.commissionPerPair}
                        </div>
                      ) : null}
                    </td>

                    {/* Commission Per Pair (Editable) */}
                    <td className="py-3 px-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span className="text-[11px] text-slate-400 font-bold">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={item.commissionPerPair !== undefined && item.commissionPerPair !== null ? item.commissionPerPair : ''}
                          onChange={(e) => handleUpdateCommission(index, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="০"
                          className="w-16 bg-slate-950 border border-amber-500/40 text-amber-300 font-bold text-right text-xs py-1 px-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                          title="জোড়া প্রতি কমিশন পরিবর্তন করুন"
                        />
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="py-3 px-2 text-right font-bold text-emerald-400">
                      <div>{formatTaka(item.totalAmount)}</div>
                      {item.totalCommission && item.totalCommission > 0 ? (
                        <div className="text-[10px] text-amber-400/80 font-normal">
                          ছাড়: -৳{item.totalCommission}
                        </div>
                      ) : null}
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
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
              <span>মোট গায়ের দাম:</span>
              <span className="font-bold text-slate-100">{formatTaka(grossTotal)}</span>
            </div>

            {totalCommission > 0 && (
              <div className="flex justify-between text-amber-400 font-medium">
                <span>জোড়া প্রতি কমিশন (ছাড়):</span>
                <span className="font-bold">- {formatTaka(totalCommission)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-300">
              <span>নিট বিল (Subtotal):</span>
              <span className="font-bold text-slate-100">{formatTaka(subTotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">অতিরিক্ত ছাড় / ডিসকাউন্ট (৳):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="০"
                className="w-28 bg-slate-900 border border-slate-700 text-amber-300 font-bold text-right text-xs py-1 px-2 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex justify-between text-slate-100 font-bold text-sm py-1 border-t border-slate-800">
              <span>সর্বমোট প্রদেয় বিল (Grand Total):</span>
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
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="০"
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
              {overpaidAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>অতিরিক্ত জমা (অ্যাডভান্স):</span>
                  <span>{formatTaka(overpaidAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>কাস্টমারের পূর্বের বাকী:</span>
                <span>{formatTaka(previousDue)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-800 text-rose-400">
                <span>{totalNetDue < 0 ? 'কাস্টমারের বর্তমান অ্যাডভান্স:' : 'কাস্টমারের সর্বমোট বাকী:'}</span>
                <span className={totalNetDue < 0 ? "text-sm text-emerald-400" : "text-sm text-rose-400"}>{formatTaka(Math.abs(totalNetDue))}</span>
              </div>
            </div>

          </div>

        </div>

        {/* Validation error display */}
        {formError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-bold flex items-center gap-2 animate-bounce">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmitOrder}
          disabled={isSubmittingOrder}
          className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-all ${
            isSubmittingOrder
              ? 'bg-slate-800 text-slate-400 cursor-wait'
              : cartItems.length > 0
                ? orderType === 'sample_booking'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-amber-500/20 active:scale-[0.99]'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-emerald-500/20 active:scale-[0.99]'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700/80 cursor-pointer border border-slate-700/50'
          }`}
        >
          {isSubmittingOrder ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              <span>বুকিং প্রক্রিয়া করা হচ্ছে...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>{orderType === 'sample_booking' ? 'অর্ডার বুকিং নিশ্চিত করুন' : 'সরাসরি বিক্রয় মেমো নিশ্চিত করুন'}</span>
            </>
          )}
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
                <label className="block text-slate-300 font-medium mb-1">
                  মোবাইল নম্বর <span className="text-slate-400 font-normal text-[10px]">(ঐচ্ছিক)</span>
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="মোবাইল নম্বর (ঐচ্ছিক)"
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

              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                <label className="block text-amber-300 font-semibold mb-1">
                  পূর্বের বকেয়া / প্রারম্ভিক বাকী (৳) (ঐচ্ছিক)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newOpeningDue}
                  onChange={(e) => setNewOpeningDue(e.target.value)}
                  placeholder="0 (যদি আগের কোনো বাকী থাকে)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-400 font-mono focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block mt-1">দোকানের পূর্বের কোনো বকেয়া থাকলে এখানে লিখুন</span>
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

export default PosOrderBuilder;

