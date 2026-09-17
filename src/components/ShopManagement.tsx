import React, { useState, useMemo } from 'react';
import {
  Store,
  Plus,
  Search,
  Phone,
  MapPin,
  User,
  Copy,
  Check,
  Receipt,
  ShoppingCart,
  Building2,
  Filter,
  X,
  Edit2,
  FileSpreadsheet,
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Customer, UserAccount, SalesRep, Order, UITheme, SystemConfig } from '../types';
import { formatTaka, toBnDigit } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';

interface ShopManagementProps {
  currentUser?: UserAccount | null;
  customers: Customer[];
  userAccounts: UserAccount[];
  sellers: SalesRep[];
  orders: Order[];
  activeTheme?: UITheme;
  systemConfig?: SystemConfig;
  onAddShop: (customer: Customer, userAccount: UserAccount) => Promise<void> | void;
  onUpdateShop?: (customer: Customer, userAccount?: UserAccount) => Promise<void> | void;
  onNavigateToPos?: (customerId: string) => void;
}

export interface UnifiedShopItem {
  id: string;
  name: string;
  shopName: string;
  phone: string;
  address: string;
  currentDue: number;
  creditLimit: number;
  assignedSellerId: string;
  assignedSellerName: string;
  linkedUserAccount?: UserAccount;
  linkedCustomer?: Customer;
  totalOrdersCount: number;
  totalOrderAmount: number;
  lastOrderDate?: string;
}

export const ShopManagement: React.FC<ShopManagementProps> = ({
  currentUser,
  customers,
  userAccounts,
  sellers,
  orders,
  onAddShop,
  onUpdateShop,
  onNavigateToPos,
}) => {
  const { t } = useLanguage();

  // Search, Filter and Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'due' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'due_high' | 'orders_high' | 'recent'>('due_high');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShop, setEditingShop] = useState<UnifiedShopItem | null>(null);
  const [selectedShopDetail, setSelectedShopDetail] = useState<UnifiedShopItem | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields for Adding a New Shop
  const [formShopName, setFormShopName] = useState('');
  const [formProprietorName, setFormProprietorName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formInitialDue, setFormInitialDue] = useState('0');
  const [formPassword, setFormPassword] = useState('123456');
  const [formError, setFormError] = useState('');

  // Form Fields for Editing
  const [editShopName, setEditShopName] = useState('');
  const [editProprietorName, setEditProprietorName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSellerId, setEditSellerId] = useState('');

  // Merge Customers and Customer UserAccounts into a Unified List
  const unifiedShops = useMemo(() => {
    const list: UnifiedShopItem[] = [];
    const customerUsers = userAccounts.filter((u) => u.role === 'customer');
    const matchedCustIds = new Set<string>();

    // Index orders by customer identifier (customerId, phone, or shopName)
    const ordersByCustomer = new Map<string, Order[]>();
    orders.forEach((o) => {
      const keyId = o.customerId;
      const keyShop = (o.shopName || '').trim().toLowerCase();
      const keyPhone = (o.customerPhone || '').replace(/\D/g, '');

      const keys = [keyId, keyShop, keyPhone].filter(Boolean);
      keys.forEach((k) => {
        if (!ordersByCustomer.has(k)) ordersByCustomer.set(k, []);
        ordersByCustomer.get(k)!.push(o);
      });
    });

    const getShopOrders = (cId: string, sName: string, phone: string) => {
      const cleanPhone = (phone || '').replace(/\D/g, '');
      const sLower = (sName || '').trim().toLowerCase();
      const foundOrders = new Set<Order>();

      if (cId && ordersByCustomer.has(cId)) {
        ordersByCustomer.get(cId)!.forEach((o) => foundOrders.add(o));
      }
      if (cleanPhone && ordersByCustomer.has(cleanPhone)) {
        ordersByCustomer.get(cleanPhone)!.forEach((o) => foundOrders.add(o));
      }
      if (sLower && ordersByCustomer.has(sLower)) {
        ordersByCustomer.get(sLower)!.forEach((o) => foundOrders.add(o));
      }
      return Array.from(foundOrders);
    };

    // 1. Process customer UserAccounts first
    customerUsers.forEach((u, idx) => {
      const uPhoneClean = (u.phone || u.loginId || '').replace(/\D/g, '');
      const uShopLower = (u.shopName || '').trim().toLowerCase();

      // Find matching Customer record
      const matchedCust = customers.find((c) => {
        const cPhoneClean = (c.phone || '').replace(/\D/g, '');
        const cShopLower = (c.shopName || '').trim().toLowerCase();
        return (
          (uPhoneClean && cPhoneClean && uPhoneClean === cPhoneClean) ||
          (uShopLower && cShopLower && uShopLower === cShopLower)
        );
      });

      if (matchedCust) matchedCustIds.add(matchedCust.id);

      const custOrders = getShopOrders(matchedCust?.id || '', u.shopName || u.name, u.phone || u.loginId);
      const totalAmount = custOrders.reduce((sum, ord) => sum + (ord.grandTotal || 0), 0);
      const sortedDates = custOrders.map((o) => o.date).filter(Boolean).sort().reverse();

      list.push({
        id: u.id || matchedCust?.id || `shop_u_${idx}`,
        name: u.name || matchedCust?.name || 'দোকানদার',
        shopName: u.shopName || matchedCust?.shopName || u.name || 'দোকান',
        phone: u.phone || u.loginId || matchedCust?.phone || '',
        address: u.area || matchedCust?.address || '—',
        currentDue: matchedCust?.currentDue !== undefined ? matchedCust.currentDue : (u.initialDue || 0),
        creditLimit: matchedCust?.creditLimit || 50000,
        assignedSellerId: matchedCust?.assignedSellerId || u.sellerId || '',
        assignedSellerName: matchedCust?.assignedSellerName || '',
        linkedUserAccount: u,
        linkedCustomer: matchedCust,
        totalOrdersCount: custOrders.length,
        totalOrderAmount: totalAmount,
        lastOrderDate: sortedDates[0] || u.createdAt || '—',
      });
    });

    // 2. Add customers who do not have a separate UserAccount record
    customers.forEach((c) => {
      if (!matchedCustIds.has(c.id)) {
        const custOrders = getShopOrders(c.id, c.shopName, c.phone);
        const totalAmount = custOrders.reduce((sum, ord) => sum + (ord.grandTotal || 0), 0);
        const sortedDates = custOrders.map((o) => o.date).filter(Boolean).sort().reverse();

        list.push({
          id: c.id,
          name: c.name || 'দোকানদার',
          shopName: c.shopName || c.name || 'দোকান',
          phone: c.phone || '',
          address: c.address || '—',
          currentDue: c.currentDue || 0,
          creditLimit: c.creditLimit || 50000,
          assignedSellerId: c.assignedSellerId || '',
          assignedSellerName: c.assignedSellerName || '',
          linkedCustomer: c,
          totalOrdersCount: custOrders.length,
          totalOrderAmount: totalAmount,
          lastOrderDate: sortedDates[0] || '—',
        });
      }
    });

    return list;
  }, [customers, userAccounts, orders]);

  // Seller identifiers
  const currentSellerId = currentUser?.sellerId || currentUser?.id || '';

  // Summary Metrics
  const totalShopsCount = unifiedShops.length;
  const totalDueAmount = unifiedShops.reduce((sum, s) => sum + (s.currentDue > 0 ? s.currentDue : 0), 0);
  const shopsWithDueCount = unifiedShops.filter((s) => s.currentDue > 0).length;
  const myShopsCount = unifiedShops.filter((s) => {
    if (!currentSellerId) return false;
    return (
      s.assignedSellerId === currentSellerId ||
      s.assignedSellerName === currentUser?.name
    );
  }).length;

  // Filtered & Sorted Shops
  const filteredShops = useMemo(() => {
    let result = [...unifiedShops];

    // Filter by Active Tab
    if (activeFilter === 'my') {
      result = result.filter((s) => {
        return (
          s.assignedSellerId === currentSellerId ||
          s.assignedSellerName === currentUser?.name
        );
      });
    } else if (activeFilter === 'due') {
      result = result.filter((s) => s.currentDue > 0);
    } else if (activeFilter === 'paid') {
      result = result.filter((s) => s.currentDue <= 0);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.shopName.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.assignedSellerName.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'due_high') {
        return b.currentDue - a.currentDue;
      }
      if (sortBy === 'orders_high') {
        return b.totalOrdersCount - a.totalOrdersCount;
      }
      if (sortBy === 'name') {
        return a.shopName.localeCompare(b.shopName, 'bn');
      }
      // 'recent'
      return (b.lastOrderDate || '').localeCompare(a.lastOrderDate || '');
    });

    return result;
  }, [unifiedShops, activeFilter, searchQuery, sortBy, currentSellerId, currentUser?.name]);

  // Handle Copy Phone
  const handleCopyPhone = (phone: string, id: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Open Edit Modal
  const handleOpenEdit = (shop: UnifiedShopItem) => {
    setEditingShop(shop);
    setEditShopName(shop.shopName);
    setEditProprietorName(shop.name);
    setEditPhone(shop.phone);
    setEditAddress(shop.address === '—' ? '' : shop.address);
    setEditSellerId(shop.assignedSellerId);
  };

  // Submit Edit Shop
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;

    if (!editShopName.trim() || !editProprietorName.trim()) {
      alert('দোকানের নাম ও প্রোপাইটারের নাম অবশ্যই দিতে হবে।');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSeller = sellers.find((s) => s.id === editSellerId);
      const updatedCustomer: Customer = {
        id: editingShop.linkedCustomer?.id || editingShop.id,
        name: editProprietorName.trim(),
        shopName: editShopName.trim(),
        address: editAddress.trim() || 'ঢাকা',
        phone: editPhone.trim(),
        assignedSellerId: editSellerId || editingShop.assignedSellerId,
        assignedSellerName: selectedSeller ? selectedSeller.name : editingShop.assignedSellerName,
        currentDue: editingShop.currentDue,
        creditLimit: editingShop.creditLimit,
      };

      let updatedUserAcc: UserAccount | undefined;
      if (editingShop.linkedUserAccount) {
        updatedUserAcc = {
          ...editingShop.linkedUserAccount,
          name: editProprietorName.trim(),
          shopName: editShopName.trim(),
          phone: editPhone.trim(),
          area: editAddress.trim(),
          loginId: editPhone.trim() || editingShop.linkedUserAccount.loginId,
          sellerId: editSellerId || editingShop.assignedSellerId,
        };
      }

      if (onUpdateShop) {
        await onUpdateShop(updatedCustomer, updatedUserAcc);
      }

      setEditingShop(null);
    } catch (err) {
      console.error(err);
      alert('দোকান আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Add New Shop
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formShopName.trim()) {
      setFormError('দোকানের নাম প্রদান করুন।');
      return;
    }
    if (!formProprietorName.trim()) {
      setFormError('প্রোপাইটার / মালিকের নাম প্রদান করুন।');
      return;
    }

    // Check for duplicate shop phone
    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length > 0) {
      const isDuplicate = unifiedShops.some(
        (s) => s.phone && s.phone.replace(/\D/g, '') === cleanPhone
      );
      if (isDuplicate) {
        setFormError('এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি দোকান নিবন্ধিত আছে।');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const initialDueNum = Math.max(0, parseFloat(formInitialDue) || 0);
      const isOffline = !cleanPhone;

      // 1. New Customer Record
      const newCustomer: Customer = {
        id: `c_${now}`,
        name: formProprietorName.trim(),
        shopName: formShopName.trim(),
        address: formAddress.trim() || 'ঢাকা',
        phone: formPhone.trim(),
        assignedSellerId: currentUser?.sellerId || currentUser?.id || '',
        assignedSellerName: currentUser?.name || 'প্রধান শাখা',
        currentDue: initialDueNum,
        creditLimit: 50000,
      };

      // 2. New UserAccount Record (Role: Customer)
      const newUserAcc: UserAccount = {
        id: `usr_${now}`,
        name: formProprietorName.trim(),
        shopName: formShopName.trim(),
        loginId: isOffline ? '' : formPhone.trim(),
        password: isOffline ? '—' : (formPassword.trim() || '123456'),
        role: 'customer',
        phone: formPhone.trim(),
        area: formAddress.trim() || 'ঢাকা',
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
        isOffline: isOffline,
        initialDue: initialDueNum,
        sellerId: currentUser?.sellerId || currentUser?.id || '',
      };

      await onAddShop(newCustomer, newUserAcc);

      // Reset form & close modal
      setFormShopName('');
      setFormProprietorName('');
      setFormPhone('');
      setFormAddress('');
      setFormInitialDue('0');
      setFormPassword('123456');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      setFormError('দোকান যুক্ত করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredShops.map((s, idx) => ({
        'ক্রমিক নং': idx + 1,
        'দোকানের নাম': s.shopName,
        'প্রোপাইটার / মালিক': s.name,
        'মোবাইল নম্বর': s.phone || 'নেই',
        'ঠিকানা / বাজার': s.address,
        'বর্তমান বকেয়া (৳)': s.currentDue,
        'মোট অর্ডার সংখ্যা': s.totalOrdersCount,
        'মোট ক্রয় (৳)': s.totalOrderAmount,
        'দায়িত্বপ্রাপ্ত সেলার': s.assignedSellerName || 'উন্মুক্ত',
        'সর্বশেষ তারিখ': s.lastOrderDate,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'দোকান তালিকা');
      XLSX.writeFile(workbook, `দোকান_তালিকা_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error('Failed to export Excel:', e);
      alert('এক্সেল ফাইল তৈরিতে ত্রুটি হয়েছে।');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
                  দোকান তালিকা
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {toBnDigit(totalShopsCount)} টি
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="এক্সেল শীট ডাউনলোড করুন"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">এক্সেল</span>
            </button>

            <button
              onClick={() => {
                setFormError('');
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center gap-2 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন দোকান</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>মোট দোকান</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-100 mt-1">
              {toBnDigit(totalShopsCount)} <span className="text-xs font-normal text-slate-400">টি</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-rose-400" />
              <span>মোট বকেয়া</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-400 mt-1">
              {formatTaka(totalDueAmount)}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>বকেয়া দোকান</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-400 mt-1">
              {toBnDigit(shopsWithDueCount)} <span className="text-xs font-normal text-slate-400">টি</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>এলাকার দোকান</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
              {toBnDigit(myShopsCount)} <span className="text-xs font-normal text-slate-400">টি</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span>সব দোকান</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
              {toBnDigit(totalShopsCount)}
            </span>
          </button>

          {currentUser?.role === 'seller' && (
            <button
              onClick={() => setActiveFilter('my')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeFilter === 'my'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <span>আমার দোকান</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
                {toBnDigit(myShopsCount)}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveFilter('due')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeFilter === 'due'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-950 text-rose-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>বকেয়া আছে</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950/40 text-rose-200">
              {toBnDigit(shopsWithDueCount)}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeFilter === 'paid'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-emerald-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>পরিশোধিত</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="দোকান, মালিক বা এলাকা খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="due_high">সর্বোচ্চ বকেয়া</option>
              <option value="orders_high">সর্বোচ্চ অর্ডার</option>
              <option value="name">নাম অনুযায়ী</option>
              <option value="recent">সর্বশেষ সক্রিয়</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shops Grid / List View */}
      {filteredShops.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">কোন দোকান খুঁজে পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            আপনার অনুসন্ধান বা ফিল্টারের সাথে মিলে এমন কোনো দোকান নেই। সঠিক বানান দিয়ে খুঁজুন অথবা নতুন দোকান যুক্ত করুন।
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('all');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
          >
            ফিল্টার রিসেট করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredShops.map((shop, idx) => {
            const hasDue = shop.currentDue > 0;
            const isMyAssigned =
              currentSellerId &&
              (shop.assignedSellerId === currentSellerId ||
                shop.assignedSellerName === currentUser?.name);

            return (
              <div
                key={`shop-card-${shop.id}-${idx}`}
                className="bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-150 flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Card Header: Shop Name & Due Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="text-sm font-bold text-slate-100 truncate cursor-pointer hover:text-amber-400 transition"
                            onClick={() => setSelectedShopDetail(shop)}
                            title={shop.shopName}
                          >
                            {shop.shopName}
                          </h3>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                            <User className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{shop.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Standardized Due Amount Badge */}
                    <div className="shrink-0 text-right">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center leading-normal ${
                          hasDue
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {hasDue ? `বকেয়া:\u00A0${formatTaka(shop.currentDue)}` : 'পরিশোধিত'}
                      </span>
                    </div>
                  </div>

                  {/* Shop Details info (Market, Phone, Assigned Seller) */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/60 space-y-1.5 text-xs text-slate-300">
                    {/* Area / Market */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1 shrink-0">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        বাজার / ঠিকানা:
                      </span>
                      <span className="text-slate-300 font-semibold truncate max-w-[180px]" title={shop.address}>
                        {shop.address || '—'}
                      </span>
                    </div>

                    {/* Mobile / Contact with Call and Copy */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1 shrink-0">
                        <Phone className="w-3 h-3 text-slate-500" />
                        মোবাইল:
                      </span>
                      {shop.phone ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-200">{shop.phone}</span>
                          <button
                            onClick={() => handleCopyPhone(shop.phone, shop.id)}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                            title="কপি করুন"
                          >
                            {copiedPhoneId === shop.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <a
                            href={`tel:${shop.phone}`}
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                            title="সরাসরি কল দিন"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">নম্বর নেই</span>
                      )}
                    </div>

                    {/* Assigned Seller Tag */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 shrink-0">দায়িত্বপ্রাপ্ত সেলার:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-[150px] ${
                          isMyAssigned
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {shop.assignedSellerName || 'প্রধান শাখা'}
                      </span>
                    </div>

                    {/* Orders Summary Badge */}
                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                      <span>মোট অর্ডার: <strong className="text-slate-200 font-mono">{toBnDigit(shop.totalOrdersCount)}</strong> টি</span>
                      <span>মোট ক্রয়: <strong className="text-slate-200 font-mono">{formatTaka(shop.totalOrderAmount)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedShopDetail(shop)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1 cursor-pointer"
                      title="বিস্তারিত হিসাব দেখুন"
                    >
                      <Receipt className="w-3 h-3 text-slate-400" />
                      <span>হিসাব</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(shop)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                      title="দোকানের তথ্য এডিট করুন"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* New Memo / POS Button */}
                  {onNavigateToPos && (
                    <button
                      onClick={() => onNavigateToPos(shop.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>নতুন মেমো</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Add New Shop (সেলার নতুন দোকান যুক্ত করার ফর্ম) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">নতুন দোকান নিবন্ধন করুন</h3>
                  <p className="text-xs text-slate-400">
                    দোকানের নাম ও তথ্য প্রদান করে গ্রাহক তালিকাভুক্ত করুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateShop} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Shop Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  দোকানের নাম <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: আল-মদিনা শু হাউস / মেসার্স রফিক সুজ"
                  value={formShopName}
                  onChange={(e) => setFormShopName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Proprietor / Owner Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  প্রোপাইটার / মালিকের নাম <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  value={formProprietorName}
                  onChange={(e) => setFormProprietorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  মোবাইল নম্বর (লগইন আইডি হিসেবে ব্যবহৃত হবে)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="যেমন: 01711223344"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  * মোবাইল নম্বর দিলে দোকানদার নিজে অ্যাপে লগইন করে অর্ডার ও ক্যাটালগ দেখতে পারবেন।
                </p>
              </div>

              {/* Address / Market */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  বাজার / এলাকা / ঠিকানা
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="যেমন: চকবাজার মার্কেট, ঢাকা"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Initial Due & Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    পূর্বের বকেয়া (যদি থাকে)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                      ৳
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={formInitialDue}
                      onChange={(e) => setFormInitialDue(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ডিফল্ট পাসওয়ার্ড
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Assigned Rep info banner */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>দায়িত্বপ্রাপ্ত সেলার:</span>
                <span className="font-bold text-amber-400">
                  {currentUser?.name || 'প্রধান শাখা'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'দোকান সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Shop Info */}
      {editingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">দোকানের তথ্য সংশোধন</h3>
              </div>
              <button
                onClick={() => setEditingShop(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  দোকানের নাম
                </label>
                <input
                  type="text"
                  required
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  প্রোপাইটার / মালিকের নাম
                </label>
                <input
                  type="text"
                  required
                  value={editProprietorName}
                  onChange={(e) => setEditProprietorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  বাজার / এলাকা / ঠিকানা
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {sellers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    দায়িত্বপ্রাপ্ত সেলার নির্ধারণ
                  </label>
                  <select
                    value={editSellerId}
                    onChange={(e) => setEditSellerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                  >
                    <option value="">উন্মুক্ত / প্রধান শাখা</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.area || 'এলাকা'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingShop(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'আপডেট হচ্ছে...' : 'আপডেট সম্পন্ন করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detailed Shop Ledger & Profile */}
      {selectedShopDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{selectedShopDetail.shopName}</h3>
                  <p className="text-xs text-slate-400">প্রোপাইটার: {selectedShopDetail.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShopDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Top Quick Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[11px]">বর্তমান বকেয়া (Due):</span>
                  <div className={`text-base sm:text-lg font-black mt-0.5 ${
                    selectedShopDetail.currentDue > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {formatTaka(selectedShopDetail.currentDue)}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[11px]">মোট ক্রয়কৃত পরিমাণ:</span>
                  <div className="text-base sm:text-lg font-black text-slate-100 mt-0.5">
                    {formatTaka(selectedShopDetail.totalOrderAmount)}
                  </div>
                </div>
              </div>

              {/* Profile Details List */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">মোবাইল নম্বর:</span>
                  <div className="flex items-center gap-1.5 font-mono text-slate-200">
                    <span>{selectedShopDetail.phone || 'নেই'}</span>
                    {selectedShopDetail.phone && (
                      <a
                        href={`tel:${selectedShopDetail.phone}`}
                        className="p-1 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700"
                        title="কল দিন"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">বাজার / ঠিকানা:</span>
                  <span className="text-slate-200 font-semibold">{selectedShopDetail.address}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">দায়িত্বপ্রাপ্ত সেলার:</span>
                  <span className="text-amber-400 font-bold">{selectedShopDetail.assignedSellerName || 'প্রধান শাখা'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">মোট সম্পন্ন মেমো:</span>
                  <span className="text-slate-200 font-mono font-bold">{toBnDigit(selectedShopDetail.totalOrdersCount)} টি</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                {onNavigateToPos && (
                  <button
                    onClick={() => {
                      const id = selectedShopDetail.id;
                      setSelectedShopDetail(null);
                      onNavigateToPos(id);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>এই দোকানে মেমো তৈরি করুন</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedShopDetail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
