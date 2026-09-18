import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { UserAccount, UserRole, SalesRep, UITheme, SystemConfig, Customer } from '../types';
import { toBnDigit, formatTaka } from '../utils/formatters';
import { UserPlus, Shield, UserCheck, ShieldAlert, ShieldCheck, Key, MapPin, Target, Percent, Lock, UserX, PlusCircle, Sparkles, CheckCircle2, ChevronDown, Edit, Sliders, Settings, Store, Search, Users, DollarSign, Info, Trash2 } from 'lucide-react';

interface UserManagementProps {
  currentUser: UserAccount;
  userAccounts: UserAccount[];
  sellers: SalesRep[];
  customers?: Customer[];
  activeTheme: UITheme;
  systemConfig?: SystemConfig;
  onUpdateSystemConfig?: (newConfig: SystemConfig) => void;
  onAddUserAccount: (newAcc: UserAccount, newSeller?: SalesRep) => void;
  onAddCustomer?: (newCust: Customer) => void;
  onToggleUserStatus: (userId: string, newStatus: boolean) => void;
  onResetPassword: (userId: string, newPass: string) => void;
  onUpdateSeller?: (updatedSeller: SalesRep) => void;
  onUpdateCustomer?: (updatedCust: Customer, note?: string) => void;
  onDeleteUserAccount?: (userId: string, customerId?: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  userAccounts,
  sellers,
  customers = [],
  activeTheme,
  systemConfig,
  onUpdateSystemConfig,
  onAddUserAccount,
  onAddCustomer,
  onToggleUserStatus,
  onResetPassword,
  onUpdateSeller,
  onUpdateCustomer,
  onDeleteUserAccount,
}) => {
  const { t } = useLanguage();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userToTrash, setUserToTrash] = useState<{ user: UserAccount; customerId?: string; custData?: any } | null>(null);

  const [activeMainTab, setActiveMainTab] = useState<'staff' | 'customers'>('staff');

  // Filters
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'seller' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const toggleExpandUser = (userId: string) => {
    setExpandedUserId(prev => prev === userId ? null : userId);
  };

  // Form State
  const [name, setName] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [loginId, setLoginId] = useState<string>('');
  const [password, setPassword] = useState<string>('seller123');
  const [role, setRole] = useState<UserRole>('seller');
  const [phone, setPhone] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [initialDue, setInitialDue] = useState<number | string>('');
  const [targetPairs, setTargetPairs] = useState<number | string>('');
  const [targetAmount, setTargetAmount] = useState<number | string>('');

  // Password reset modal state
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // Seller edit state
  const [editingSeller, setEditingSeller] = useState<SalesRep | null>(null);
  const [editTargetPairs, setEditTargetPairs] = useState<number | string>('');
  const [editTargetAmount, setEditTargetAmount] = useState<number | string>('');
  const [editCommissionRate, setEditCommissionRate] = useState<number | string>('');
  const [editCommissionPerPair, setEditCommissionPerPair] = useState<number | string>('');
  const [editCommissionType, setEditCommissionType] = useState<'percent' | 'per_pair' | 'both'>('percent');

  // New Seller Commission state (Add Modal)
  const [commissionRate, setCommissionRate] = useState<number | string>('');
  const [commissionPerPair, setCommissionPerPair] = useState<number | string>('');
  const [commissionType, setCommissionType] = useState<'percent' | 'per_pair' | 'both'>('percent');

  const openSellerEditModal = (seller: SalesRep) => {
    setEditingSeller(seller);
    setEditTargetPairs(seller.monthlyTargetPairs || '');
    setEditTargetAmount(seller.monthlyTargetAmount || '');
    setEditCommissionRate(seller.commissionRatePercent ?? '');
    setEditCommissionPerPair(seller.commissionPerPair ?? '');
    const cType: 'percent' | 'per_pair' | 'both' = seller.commissionType ||
      (seller.commissionPerPair && !seller.commissionRatePercent ? 'per_pair' :
       seller.commissionPerPair && seller.commissionRatePercent ? 'both' : 'percent');
    setEditCommissionType(cType);
  };

  // Customer edit info state
  const [editingCust, setEditingCust] = useState<Customer | null>(null);
  const [editCustName, setEditCustName] = useState<string>('');
  const [editCustShopName, setEditCustShopName] = useState<string>('');
  const [editCustPhone, setEditCustPhone] = useState<string>('');
  const [editCustAddress, setEditCustAddress] = useState<string>('');

  // Customer Due adjustment state
  const [adjustingCust, setAdjustingCust] = useState<Customer | null>(null);
  const [adjustCustAmount, setAdjustCustAmount] = useState<number | string>('');
  const [adjustCustType, setAdjustCustType] = useState<'add' | 'set'>('add');
  const [adjustCustNote, setAdjustCustNote] = useState<string>('পূর্বের খাতার বাকী');

  const openCustomerEditModal = (cust: Customer) => {
    setEditingCust(cust);
    setEditCustName(cust.name || '');
    setEditCustShopName(cust.shopName || '');
    setEditCustPhone(cust.phone || '');
    setEditCustAddress(cust.address || '');
  };

  const handleCustomerEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCust || !onUpdateCustomer) return;

    const updated: Customer = {
      ...editingCust,
      name: editCustName.trim(),
      shopName: editCustShopName.trim(),
      phone: editCustPhone.trim(),
      address: editCustAddress.trim(),
    };

    onUpdateCustomer(updated, 'দোকানের বিবরণ ও প্রোফাইল আপডেট করা হয়েছে');
    setEditingCust(null);
  };

  const openAdjustDueModal = (cust: Customer) => {
    setAdjustingCust(cust);
    setAdjustCustAmount('');
    setAdjustCustType('add');
    setAdjustCustNote('পূর্বের খাতার বাকী');
  };

  const handleAdjustDueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingCust || !onUpdateCustomer) return;

    const val = Number(adjustCustAmount);
    if (isNaN(val) || val < 0) {
      alert('সঠিক টাকার অংক লিখুন!');
      return;
    }

    let finalDue = adjustingCust.currentDue;
    if (adjustCustType === 'add') {
      finalDue = adjustingCust.currentDue + val;
    } else {
      finalDue = val;
    }

    const updated: Customer = {
      ...adjustingCust,
      currentDue: finalDue,
    };

    const note =
      adjustCustNote ||
      (adjustCustType === 'add'
        ? `পূর্বের বকেয়া ৳${val.toLocaleString('bn-BD')} যুক্ত করা হয়েছে`
        : `বকেয়া সমন্বয় করে ৳${val.toLocaleString('bn-BD')} নির্ধারণ করা হয়েছে`);

    onUpdateCustomer(updated, note);
    setAdjustingCust(null);
    setAdjustCustAmount('');
  };

  const handleUpdateSellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSeller && onUpdateSeller) {
      onUpdateSeller({
        ...editingSeller,
        monthlyTargetPairs: Number(editTargetPairs) || 0,
        monthlyTargetAmount: Number(editTargetAmount) || 0,
        commissionRatePercent: Number(editCommissionRate) || 0,
        commissionPerPair: Number(editCommissionPerPair) || 0,
        commissionType: editCommissionType,
      });
      setEditingSeller(null);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Handling for Customer registration
    if (role === 'customer') {
      if (!shopName.trim()) return;
      const phoneVal = (phone.trim() || loginId.trim());

      // If phone number is NOT provided, save directly as an offline customer
      if (!phoneVal) {
        const initialDueVal = Math.max(0, Number(initialDue) || 0);
        const newCust: Customer = {
          id: `c_${Date.now()}`,
          name: name.trim(),
          shopName: shopName.trim(),
          address: area.trim() || 'ঠিকানা দেওয়া নেই',
          phone: '',
          assignedSellerId: currentUser?.sellerId || currentUser?.id || '',
          assignedSellerName: currentUser?.name || 'প্রধান শাখা',
          currentDue: initialDueVal,
          creditLimit: 50000,
        };

        if (onAddCustomer) {
          onAddCustomer(newCust);
        } else {
          onAddUserAccount({
            id: `usr_${Date.now()}`,
            name: name.trim(),
            shopName: shopName.trim(),
            loginId: '',
            password: '—',
            role: 'customer',
            phone: '',
            area: area.trim(),
            initialDue: initialDueVal,
            isActive: true,
            createdAt: new Date().toISOString().split('T')[0],
            isOffline: true,
          });
        }

        // Reset Form
        setName('');
        setShopName('');
        setLoginId('');
        setPassword('123456');
        setPhone('');
        setArea('');
        setInitialDue('');
        setShowAddModal(false);
        return;
      }
    } else {
      // For staff (admin/seller), loginId and password are required
      if (!loginId.trim() || !password) return;
    }

    const newId = `usr_${Date.now()}`;
    let createdSellerId: string | undefined = undefined;
    let newSellerObj: SalesRep | undefined = undefined;

    // If adding a seller, also create their SalesRep record
    if (role === 'seller') {
      createdSellerId = `sr_${Date.now()}`;
      newSellerObj = {
        id: createdSellerId,
        name: name.trim(),
        phone: phone.trim() || loginId.trim(),
        area: area.trim() || '',
        monthlyTargetPairs: Number(targetPairs) || 0,
        monthlyTargetAmount: Number(targetAmount) || 0,
        commissionRatePercent: Number(commissionRate) || 0,
        commissionPerPair: Number(commissionPerPair) || 0,
        commissionType: commissionType,
      };
    }

    const newAcc: UserAccount = {
      id: newId,
      name: name.trim(),
      shopName: shopName.trim() || undefined,
      loginId: loginId.trim(),
      password: password,
      role: role,
      phone: phone.trim() || loginId.trim(),
      area: area.trim() || undefined,
      initialDue: role === 'customer' ? Math.max(0, Number(initialDue) || 0) : undefined,
      sellerId: createdSellerId,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      isOffline: false,
    };

    onAddUserAccount(newAcc, newSellerObj);

    // Reset Form
    setName('');
    setShopName('');
    setLoginId('');
    setPassword('123456');
    setPhone('');
    setArea('');
    setInitialDue('');
    setTargetPairs('');
    setTargetAmount('');
    setCommissionRate('');
    setCommissionPerPair('');
    setCommissionType('percent');
    setShowAddModal(false);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetTargetUser && newPasswordInput) {
      onResetPassword(resetTargetUser.id, newPasswordInput);
      setResetTargetUser(null);
      setNewPasswordInput('');
    }
  };

  const getCustomerForUser = (usr: UserAccount): Customer | undefined => {
    if (usr.role !== 'customer') return undefined;
    const userPhone = (usr.phone || usr.loginId || '').replace(/\D/g, '');
    const userShop = (usr.shopName || '').toLowerCase().trim();
    const userName = (usr.name || '').toLowerCase().trim();

    const found = customers.find((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      if (userPhone && cPhone && userPhone.length >= 6 && (userPhone.endsWith(cPhone) || cPhone.endsWith(userPhone))) {
        return true;
      }
      if (userShop && c.shopName && c.shopName.toLowerCase().trim() === userShop) {
        return true;
      }
      if (userName && c.name && c.name.toLowerCase().trim() === userName) {
        return true;
      }
      return false;
    });

    if (found) return found;

    return {
      id: usr.id,
      name: usr.name,
      shopName: usr.shopName || usr.name,
      phone: usr.phone || usr.loginId,
      address: usr.area || '',
      assignedSellerId: '',
      assignedSellerName: 'উন্মুক্ত / সরাসরি',
      currentDue: usr.initialDue || 0,
      creditLimit: 50000,
    };
  };

  const allNonSuperUsers = userAccounts.filter((u) => u.role !== 'super_admin');
  const staffUsers = allNonSuperUsers.filter((u) => u.role === 'admin' || u.role === 'seller');
  const customerUsers = allNonSuperUsers.filter((u) => u.role === 'customer');

  // Unified list of registered shops (both online accounts and offline customers)
  const unifiedCustomerList = useMemo(() => {
    const list: (UserAccount & { isOffline?: boolean; linkedCustomer?: Customer })[] = [];
    const matchedCustomerIds = new Set<string>();

    customerUsers.forEach((u) => {
      const cust = getCustomerForUser(u);
      if (cust) matchedCustomerIds.add(cust.id);
      list.push({
        ...u,
        isOffline: false,
        linkedCustomer: cust,
      });
    });

    // Add offline customers who do not have an online UserAccount
    customers.forEach((c) => {
      if (!matchedCustomerIds.has(c.id)) {
        list.push({
          id: `cust_${c.id}`,
          name: c.name,
          shopName: c.shopName,
          loginId: c.phone || '—',
          password: '—',
          role: 'customer',
          phone: c.phone || '',
          area: c.address,
          initialDue: c.currentDue,
          isActive: true,
          createdAt: '—',
          isOffline: true,
          linkedCustomer: c,
        });
      }
    });

    return list;
  }, [customerUsers, customers]);

  const customerCount = unifiedCustomerList.length;
  const sellerCount = allNonSuperUsers.filter((u) => u.role === 'seller').length;
  const adminCount = allNonSuperUsers.filter((u) => u.role === 'admin').length;
  const staffCount = sellerCount + adminCount;

  const filteredUsers = (activeMainTab === 'staff' ? staffUsers : unifiedCustomerList).filter((u) => {
    if (activeMainTab === 'staff' && selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (u.name || "").toLowerCase().includes(q);
      const matchShop = (u.shopName || '').toLowerCase().includes(q);
      const matchLogin = (u.loginId || "").toLowerCase().includes(q);
      const matchPhone = (u.phone || '').toLowerCase().includes(q);
      return matchName || matchShop || matchLogin || matchPhone;
    }
    return true;
  });

  const getRoleBadge = (r: UserRole, shopName?: string) => {
    switch (r) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit shrink-0 whitespace-nowrap">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {t('super_admin')}
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit shrink-0 whitespace-nowrap">
            <Shield className="w-3.5 h-3.5 shrink-0" /> {t('admin')}
          </span>
        );
      case 'seller':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit shrink-0 whitespace-nowrap">
            <UserCheck className="w-3.5 h-3.5 shrink-0" /> {t('seller')}
          </span>
        );
      case 'customer':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit max-w-[100px] sm:max-w-[180px] shrink-0 whitespace-nowrap" title={shopName || 'দোকান'}>
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{shopName || 'দোকান'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Primary Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/80 rounded-2xl p-1.5 gap-2 shadow-md">
        <button
          onClick={() => {
            setActiveMainTab('staff');
            setSelectedRoleFilter('all');
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeMainTab === 'staff'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>স্টাফ ও সেলার ({toBnDigit(staffCount)})</span>
        </button>

        <button
          onClick={() => {
            setActiveMainTab('customers');
            setSelectedRoleFilter('all');
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeMainTab === 'customers'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          <span>নিবন্ধিত দোকান ({toBnDigit(customerCount)})</span>
        </button>
      </div>

      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            {activeMainTab === 'staff' ? (
              <UserPlus className="w-6 h-6 text-amber-400" />
            ) : (
              <Store className="w-6 h-6 text-emerald-400" />
            )}
            <span>
              {activeMainTab === 'staff' ? 'স্টাফ ও সেলার' : 'নিবন্ধিত দোকান'}
            </span>
          </h2>
        </div>

        {(currentUser.role === 'admin' || currentUser.role === 'super_admin') ? (
          <button
            onClick={() => {
              setRole(activeMainTab === 'staff' ? 'seller' : 'customer');
              setShowAddModal(true);
            }}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer ${
              activeMainTab === 'staff'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {activeMainTab === 'staff' ? 'নতুন সেলার/এডমিন তৈরি' : 'নতুন দোকান নিবন্ধন'}
            </span>
          </button>
        ) : (
          <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400">
            {t('user_mgmt_desc')}
          </div>
        )}
      </div>

      {/* Search and Role Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {activeMainTab === 'staff' ? (
            <>
              <button
                onClick={() => setSelectedRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedRoleFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>সব স্টাফ ({toBnDigit(staffCount)})</span>
              </button>
              <button
                onClick={() => setSelectedRoleFilter('seller')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedRoleFilter === 'seller'
                    ? 'bg-blue-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>সেলার ({toBnDigit(sellerCount)})</span>
              </button>
              <button
                onClick={() => setSelectedRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedRoleFilter === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>এডমিন ({toBnDigit(adminCount)})</span>
              </button>
            </>
          ) : (
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Store className="w-4 h-4" />
              <span>মোট নিবন্ধিত দোকানদার: {toBnDigit(customerCount)} জন</span>
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeMainTab === 'staff'
                ? 'সেলার/এডমিন নাম বা মোবাইল খুঁজুন...'
                : 'দোকানের নাম, প্রোপাইটার বা মোবাইল খুঁজুন...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>



      {/* Mobile User Accounts Card View (Visible on small screens) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
            কোনো ইউজার পাওয়া যায়নি।
          </div>
        ) : (
          filteredUsers.map((usr, idx) => {
            const sellerData = sellers.find(
              (s) =>
                s.id === usr.sellerId ||
                (usr.role === 'seller' &&
                  ((s.phone && usr.phone && s.phone === usr.phone) ||
                    (s.name && usr.name && s.name.toLowerCase() === usr.name.toLowerCase())))
            );
            const custData = getCustomerForUser(usr);
            const isExpanded = expandedUserId === usr.id;
            const uniqueKey = `user-${usr.isOffline ? 'offline' : 'online'}-${usr.id}-${idx}`;

            return (
              <div
                key={uniqueKey}
                className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden transition-all duration-200"
              >
                {/* Header: Name & Role (Toggles expansion) */}
                <div 
                  onClick={() => toggleExpandUser(usr.id)}
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/40 active:bg-slate-800/60 transition gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7.5 h-7.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {usr.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-1">
                        <span className="truncate">{usr.role === 'customer' ? (usr.shopName || usr.name) : usr.name}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                      </div>
                      {usr.role === 'customer' ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="truncate">প্রোপাইটার: {usr.name}</span>
                          {(usr.area || custData?.address) && (
                            <span className="text-slate-500 flex items-center gap-0.5 shrink-0">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[90px]">{usr.area || custData?.address}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        usr.shopName && (
                          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 truncate">
                            দোকান: {usr.shopName}
                          </div>
                        )
                      )}
                      {usr.sellerId && (
                        <div className="text-[9px] text-amber-400/80 font-mono mt-0.5 truncate">
                          {t('seller_id')}: {usr.sellerId}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {usr.role === 'customer' ? (
                      custData ? (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center justify-center leading-normal ${
                          custData.currentDue > 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                        }`}>
                          ৳&nbsp;{custData.currentDue.toLocaleString('bn-BD')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          ৳ ০
                        </span>
                      )
                    ) : (
                      <div className="shrink-0">
                        {getRoleBadge(usr.role, usr.shopName)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3.5 pt-1 border-t border-slate-800/60 bg-slate-950/40 space-y-2.5 text-[11px] animate-fadeIn">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">{t('login_id')} / মোবাইল:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {usr.phone || usr.loginId || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">{t('password')}:</span>
                        <span className="font-mono text-slate-300">
                          {usr.password === '—' || usr.isOffline ? '—' : `•••••••• (${usr.password})`}
                        </span>
                      </div>

                      {usr.role === 'customer' && (
                        <>
                          <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400">বর্তমান বকেয়া (Due):</span>
                            <span className={`font-mono font-bold whitespace-nowrap ${
                              (custData?.currentDue || 0) > 0 ? 'text-rose-400 font-black' : 'text-emerald-400'
                            }`}>
                              ৳&nbsp;{(custData?.currentDue || 0).toLocaleString('bn-BD')}
                            </span>
                          </div>

                          {(usr.area || custData?.address) && (
                            <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                              <span className="text-slate-400">ঠিকানা / এলাকা:</span>
                              <span className="text-slate-200 font-semibold">{usr.area || custData?.address}</span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">{t('status')}:</span>
                        <span>
                          {usr.isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {t('active')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              {t('inactive')}
                            </span>
                          )}
                        </span>
                      </div>

                      {sellerData && (
                        <div className="space-y-1.5 pt-1">
                          {(!systemConfig || systemConfig.enableTargetSystem !== false) && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="flex flex-col bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Target className="w-3 h-3 text-amber-400" />
                                  টার্গেট (জোড়া)
                                </span>
                                <span className="text-amber-300 font-bold text-xs">
                                  {toBnDigit(sellerData.monthlyTargetPairs || 0)} জোড়া
                                </span>
                              </div>
                              <div className="flex flex-col bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Target className="w-3 h-3 text-emerald-400" />
                                  টার্গেট (টাকা)
                                </span>
                                <span className="text-emerald-400 font-bold text-xs">
                                  ৳ {toBnDigit(sellerData.monthlyTargetAmount || 0)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                            <span className="text-slate-300 text-[11px] flex items-center gap-1 font-semibold">
                              <Percent className="w-3 h-3 text-amber-400" />
                              কমিশন:
                            </span>
                            <span className="text-amber-300 font-bold text-xs">
                              {(sellerData.commissionRatePercent || 0) > 0 || (sellerData.commissionPerPair || 0) > 0 ? (
                                <>
                                  {(sellerData.commissionRatePercent || 0) > 0 && `${toBnDigit(sellerData.commissionRatePercent)}% সেলস `}
                                  {(sellerData.commissionPerPair || 0) > 0 &&
                                    `${(sellerData.commissionRatePercent || 0) > 0 ? '+ ' : ''}৳${toBnDigit(sellerData.commissionPerPair)}/জোড়া`}
                                </>
                              ) : (
                                <span className="text-slate-400 text-[11px] font-normal">নির্ধারিত নয়</span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-800/40 flex flex-wrap items-center gap-2">
                      {usr.role === 'customer' && custData && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                        <>
                          <button
                            onClick={() => openAdjustDueModal(custData)}
                            className="flex-1 min-w-[120px] py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>বকেয়া সমন্বয়</span>
                          </button>
                          <button
                            onClick={() => openCustomerEditModal(custData)}
                            className="flex-1 min-w-[100px] py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>তথ্য এডিট</span>
                          </button>
                        </>
                      )}

                      {sellerData && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (!systemConfig || systemConfig.enableTargetSystem !== false) && (
                        <button
                          onClick={() => openSellerEditModal(sellerData)}
                          className="flex-1 min-w-[130px] py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Percent className="w-3.5 h-3.5 text-amber-400" />
                          <span>টার্গেট ও কমিশন সেট</span>
                        </button>
                      )}

                      {!usr.isOffline && (currentUser.role === 'admin' || currentUser.role === 'super_admin' || usr.id === currentUser.id) && (
                        <button
                          onClick={() => setResetTargetUser(usr)}
                          className="flex-1 min-w-[120px] py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>পাসওয়ার্ড পরিবর্তন</span>
                        </button>
                      )}

                      {!usr.isOffline && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && usr.id !== currentUser.id && (
                        <button
                          onClick={() => onToggleUserStatus(usr.id, !usr.isActive)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            usr.isActive
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {usr.isActive ? 'ডিজেবল' : 'এনাবল'}
                        </button>
                      )}

                          {onDeleteUserAccount && (
                            <button
                              type="button"
                              onClick={() => setUserToTrash({ user: usr, customerId: custData?.id, custData })}
                              className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                              title={usr.role === 'customer' ? 'দোকান ও একাউন্ট ট্র্যাশে পাঠান' : 'ইউজার একাউন্ট ট্র্যাশে পাঠান'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{usr.role === 'customer' ? 'দোকান ট্র্যাশ' : 'ট্র্যাশ'}</span>
                            </button>
                          )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* User Accounts List Table - Replaced with sleek expandable list for desktop */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center justify-between">
          <span>{activeMainTab === 'staff' ? 'ব্যবহারকারীর নাম (নামে ক্লিক করুন)' : 'দোকানদারের নাম (নামে ক্লিক করুন)'}</span>
          <span className="pr-12">{activeMainTab === 'staff' ? 'রোল (Role)' : 'দোকানের নাম'}</span>
        </div>
        
        <div className="divide-y divide-slate-800/80 text-slate-200">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              কোনো ইউজার পাওয়া যায়নি।
            </div>
          ) : (
            filteredUsers.map((usr, idx) => {
              const sellerData = sellers.find(
                (s) =>
                  s.id === usr.sellerId ||
                  (usr.role === 'seller' &&
                    ((s.phone && usr.phone && s.phone === usr.phone) ||
                      (s.name && usr.name && s.name.toLowerCase() === usr.name.toLowerCase())))
              );
              const custData = getCustomerForUser(usr);
              const isExpanded = expandedUserId === usr.id;
              const uniqueKey = `desktop-user-${usr.isOffline ? 'offline' : 'online'}-${usr.id}-${idx}`;

              return (
                <div key={uniqueKey} className="transition-all duration-200">
                  {/* Row Header */}
                  <div 
                    onClick={() => toggleExpandUser(usr.id)}
                    className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {usr.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 text-sm flex items-center gap-2 hover:text-amber-400 transition-colors">
                          <span>{usr.role === 'customer' ? (usr.shopName || usr.name) : usr.name}</span>
                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                        </div>
                        {usr.role === 'customer' ? (
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span>প্রোপাইটার: <strong className="text-slate-300">{usr.name}</strong></span>
                            {(usr.area || custData?.address) && (
                              <span className="text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {usr.area || custData?.address}
                              </span>
                            )}
                          </div>
                        ) : (
                          usr.shopName && (
                            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                              দোকান: {usr.shopName}
                            </div>
                          )
                        )}
                        {usr.sellerId && (
                          <div className="text-[10px] font-mono text-amber-400/80 mt-0.5">
                            সেলার আইডি: {usr.sellerId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {usr.role === 'customer' ? (
                        custData ? (
                          <div className="text-right shrink-0">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center leading-normal ${
                              custData.currentDue > 0
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              ৳&nbsp;{custData.currentDue.toLocaleString('bn-BD')}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            ৳ ০
                          </span>
                        )
                      ) : (
                        <div className="shrink-0">{getRoleBadge(usr.role, usr.shopName)}</div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div className="px-5 py-4 bg-slate-950/50 border-t border-slate-800/60 animate-fadeIn space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">লগইন আইডি / মোবাইল</div>
                          <div className="font-mono text-amber-300 font-semibold">
                            {usr.phone || usr.loginId || '—'}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">পাসওয়ার্ড</div>
                          <div className="font-mono text-slate-300">
                            {usr.password === '—' || usr.isOffline ? '—' : `•••••••• (${usr.password})`}
                          </div>
                        </div>

                        {usr.role === 'customer' && (
                          <>
                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">বর্তমান বকেয়া (Due)</div>
                              <div className={`font-mono text-sm font-bold whitespace-nowrap ${
                                (custData?.currentDue || 0) > 0 ? 'text-rose-400 font-black' : 'text-emerald-400'
                              }`}>
                                ৳&nbsp;{(custData?.currentDue || 0).toLocaleString('bn-BD')}
                              </div>
                            </div>

                            {(usr.area || custData?.address) && (
                              <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ঠিকানা / এলাকা</div>
                                <div className="text-slate-200 font-medium">{usr.area || custData?.address}</div>
                              </div>
                            )}
                          </>
                        )}

                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">স্ট্যাটাস</div>
                          <div>
                            {usr.isActive ? (
                              <span className="px-2.5 py-0.5 inline-block rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                সক্রিয় (Active)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 inline-block rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                নিষ্ক্রিয় (Inactive)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {sellerData && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-800/40">
                          <div className="space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-amber-400" />
                              টার্গেট (জোড়া)
                            </div>
                            <div className="text-amber-300 font-bold">{toBnDigit(sellerData.monthlyTargetPairs || 0)} জোড়া</div>
                          </div>
                          <div className="space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-emerald-400" />
                              টার্গেট (টাকায়)
                            </div>
                            <div className="text-emerald-400 font-bold">৳ {toBnDigit(sellerData.monthlyTargetAmount || 0)}</div>
                          </div>
                          <div className="space-y-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                            <div className="text-[10px] text-amber-400/90 uppercase font-bold tracking-wider flex items-center gap-1">
                              <Percent className="w-3.5 h-3.5 text-amber-400" />
                              নির্ধারিত কমিশন
                            </div>
                            <div className="text-amber-300 font-bold text-xs">
                              {(sellerData.commissionRatePercent || 0) > 0 || (sellerData.commissionPerPair || 0) > 0 ? (
                                <>
                                  {(sellerData.commissionRatePercent || 0) > 0 && `${toBnDigit(sellerData.commissionRatePercent)}% সেলস `}
                                  {(sellerData.commissionPerPair || 0) > 0 &&
                                    `${(sellerData.commissionRatePercent || 0) > 0 ? '+ ' : ''}৳${toBnDigit(sellerData.commissionPerPair)}/জোড়া`}
                                </>
                              ) : (
                                <span className="text-slate-400 font-normal">সেট করা নেই</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expandable Action Buttons */}
                      <div className="pt-3 border-t border-slate-800/50 flex items-center justify-end gap-3">
                        {usr.role === 'customer' && custData && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                          <>
                            <button
                              onClick={() => openAdjustDueModal(custData)}
                              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>বকেয়া সমন্বয় করুন</span>
                            </button>
                            <button
                              onClick={() => openCustomerEditModal(custData)}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>দোকানের তথ্য এডিট</span>
                            </button>
                          </>
                        )}

                        {sellerData && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (!systemConfig || systemConfig.enableTargetSystem !== false) && (
                          <button
                            onClick={() => openSellerEditModal(sellerData)}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Percent className="w-3.5 h-3.5 text-amber-400" />
                            <span>টার্গেট ও কমিশন সেট করুন</span>
                          </button>
                        )}

                        {!usr.isOffline && (currentUser.role === 'admin' || currentUser.role === 'super_admin' || usr.id === currentUser.id) && (
                          <button
                            onClick={() => setResetTargetUser(usr)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>পাসওয়ার্ড পরিবর্তন</span>
                          </button>
                        )}

                        {!usr.isOffline && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && usr.id !== currentUser.id && (
                          <button
                            onClick={() => onToggleUserStatus(usr.id, !usr.isActive)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                              usr.isActive
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {usr.isActive ? 'ডিজেবল করুন' : 'এনাবল করুন'}
                          </button>
                        )}

                            {onDeleteUserAccount && (
                              <button
                                type="button"
                                onClick={() => setUserToTrash({ user: usr, customerId: custData?.id, custData })}
                                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                title={usr.role === 'customer' ? 'দোকান ও একাউন্ট ট্র্যাশে পাঠান' : 'ইউজার একাউন্ট ট্র্যাশে পাঠান'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{usr.role === 'customer' ? 'দোকান ট্র্যাশ' : 'ট্র্যাশ'}</span>
                              </button>
                            )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create New User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>
                  {role === 'customer'
                    ? 'নতুন নিবন্ধিত দোকানদার একাউন্ট তৈরি'
                    : 'নতুন সেলার বা এডমিন একাউন্ট তৈরি'}
                </span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              
              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  একাউন্ট এর রোল (Role) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 text-amber-300 p-2.5 rounded-xl font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value="customer">দোকানদার / কাস্টমার (Registered Shopkeeper)</option>
                  <option value="seller">সেলার (Sales Representative)</option>
                  <option value="admin">এডমিন (Store Admin)</option>
                </select>
              </div>

              {/* User Name */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {role === 'customer' ? 'দোকানদার / প্রোপাইটারের নাম' : 'ব্যবহারকারীর নাম'}{' '}
                  <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={role === 'customer' ? 'যেমন: মোহাম্মদ রহিম' : 'ব্যবহারকারীর নাম'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Shop Name if Customer */}
              {role === 'customer' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    দোকানের নাম (Shop Name) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: জান্নাত সুজ"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Login Mobile Number */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    {role === 'customer' ? (
                      <>
                        দোকানদারের মোবাইল নম্বর <span className="text-slate-400 font-normal text-[11px]">(ঐচ্ছিক)</span>
                      </>
                    ) : (
                      <>
                        লগইন মোবাইল নম্বর <span className="text-amber-400">*</span>
                      </>
                    )}
                  </label>
                  <input
                    type="tel"
                    required={role !== 'customer'}
                    placeholder={role === 'customer' ? 'যেমন: 01700000000 (ঐচ্ছিক)' : 'যেমন: 01700000000'}
                    value={loginId}
                    onChange={(e) => {
                      setLoginId(e.target.value);
                      setPhone(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Initial Password */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    {role === 'customer' ? (
                      <>
                        লগইন পাসওয়ার্ড {loginId.trim() ? <span className="text-amber-400">*</span> : <span className="text-slate-400 font-normal text-[11px]">(মোবাইল দিলে প্রযোজ্য)</span>}
                      </>
                    ) : (
                      <>
                        লগইন পাসওয়ার্ড <span className="text-amber-400">*</span>
                      </>
                    )}
                  </label>
                  <input
                    type="text"
                    required={role !== 'customer' && Boolean(loginId.trim())}
                    placeholder={role === 'customer' && !loginId.trim() ? 'নম্বর না দিলে প্রযোজ্য নয়' : 'পাসওয়ার্ড (যেমন: 123456)'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={role === 'customer' && !loginId.trim()}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono p-2.5 rounded-xl focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Address / Area */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {role === 'customer' ? 'দোকানের ঠিকানা / বাজার / এলাকা' : 'কর্ম এলাকা (Area)'}
                </label>
                <input
                  type="text"
                  placeholder={role === 'customer' ? 'যেমন: চকবাজার, ঢাকা' : 'যেমন: সাভার এরিয়া'}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Opening Due if Customer */}
              {role === 'customer' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    পূর্বের বাকী / প্রারম্ভিক বকেয়া (Opening Due ৳)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold">৳</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={initialDue}
                      onChange={(e) => setInitialDue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold pl-8 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    দোকানের পূর্বের কোনো খাতার বাকী থাকলে এখানে লিখুন। পরে যেকোনো সময় এটি বাকী খাতা থেকে সমন্বয় করা যাবে।
                  </p>
                </div>
              )}

              {role === 'customer' && (
                <div className={`p-3 rounded-xl text-[11px] border ${
                  loginId.trim()
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}>
                  {loginId.trim() ? (
                    <span><strong>অনলাইন অ্যাকাউন্ট:</strong> দোকানদার এই মোবাইল নম্বর ও পাসওয়ার্ড ব্যবহার করে অনলাইনে ক্যাটালগ লগইন করতে পারবেন।</span>
                  ) : (
                    <span>মোবাইল নম্বর না দিলেও দোকানটি সফলভাবে সংরক্ষিত হবে এবং সেলস ও বকেয়া খাতায় স্বাভাবিকভাবে ব্যবহার করা যাবে।</span>
                  )}
                </div>
              )}

              {role === 'seller' && (!systemConfig || systemConfig.enableTargetSystem !== false) && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                      <label className="block font-semibold text-slate-300 mb-1 text-[11px] uppercase tracking-wider">
                        টার্গেট (জোড়া)
                      </label>
                      <input
                        type="number"
                        value={targetPairs}
                        onChange={(e) => setTargetPairs(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="যেমন: ১০০০"
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                      <label className="block font-semibold text-slate-300 mb-1 text-[11px] uppercase tracking-wider">
                        টার্গেট (টাকায়)
                      </label>
                      <input
                        type="number"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="যেমন: ৫০০০০"
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono p-2.5 rounded-xl focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Commission Setup Section for New Seller */}
                  <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-amber-400 text-xs flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-amber-400" />
                        সেলস কমিশন নির্ধারণ (Commission Rates)
                      </label>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">ঐচ্ছিক</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-300 mb-1 text-[11px] font-medium">
                          কমিশন হার (% সেলসে)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="যেমন: ২.৫"
                            className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono p-2.5 pr-7 rounded-xl focus:outline-none focus:border-amber-400 text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1 text-[11px] font-medium">
                          প্রতি জোড়ায় কমিশন (৳)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={commissionPerPair}
                            onChange={(e) => setCommissionPerPair(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="যেমন: ৫"
                            className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono p-2.5 pr-7 rounded-xl focus:outline-none focus:border-emerald-400 text-xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xs">৳</span>
                        </div>
                      </div>
                    </div>

                    {(Number(commissionRate) > 0 || Number(commissionPerPair) > 0) && (
                      <div className="text-[11px] bg-slate-900/90 text-amber-300 p-2 rounded-lg border border-amber-500/20">
                        💡 <strong>কমিশন নীতি:</strong>{' '}
                        {Number(commissionRate) > 0 && `মোট বিক্রিত টাকার ওপর ${toBnDigit(commissionRate)}%`}
                        {Number(commissionRate) > 0 && Number(commissionPerPair) > 0 && ' এবং '}
                        {Number(commissionPerPair) > 0 && `প্রতি জোড়ায় ৳${toBnDigit(commissionPerPair)}`}
                        {' সেলারের অর্জিত কমিশন হিসেবে যুক্ত হবে।'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  একাউন্ট যুক্ত করুন
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>পাসওয়ার্ড রিসেট: {resetTargetUser.name}</span>
            </h3>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="text"
                  required
                  placeholder="নতুন পাসওয়ার্ড লিখুন"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Seller Target & Commission Modal */}
      {editingSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 my-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <Percent className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                    টার্গেট ও কমিশন নির্ধারণ
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="text-amber-400 font-semibold">{editingSeller.name}</span>
                    {editingSeller.area && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>{editingSeller.area}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSeller(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSellerSubmit} className="space-y-4 text-xs">
              {/* Section 1: Monthly Target */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    মাসিক সেলস টার্গেট (Monthly Targets)
                  </span>
                  <span className="text-[10px] text-slate-500">লক্ষ্যমাত্রা</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1 text-[11px]">টার্গেট (জোড়া)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="যেমন: ১০০০"
                        value={editTargetPairs}
                        onChange={(e) => setEditTargetPairs(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 p-2.5 pr-10 rounded-xl focus:outline-none focus:border-amber-400 font-mono text-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">জোড়া</span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1 text-[11px]">টার্গেট (টাকায়)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="যেমন: ৩,০০,০০০"
                        value={editTargetAmount}
                        onChange={(e) => setEditTargetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 p-2.5 pr-8 rounded-xl focus:outline-none focus:border-emerald-400 font-mono text-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">৳</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Commission Setup */}
              <div className="bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    কমিশন কনফিগারেশন (Commission Setup)
                  </span>
                  <span className="text-[10px] text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-semibold">
                    ইনসেন্টিভ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1 text-[11px]">
                      কমিশন হার (% সেলসে)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="যেমন: ২.৫"
                        value={editCommissionRate}
                        onChange={(e) => setEditCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-bold p-2.5 pr-7 rounded-xl focus:outline-none focus:border-amber-400 font-mono text-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">মোট বিক্রিত টাকার ওপর</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-200 mb-1 text-[11px]">
                      প্রতি জোড়ায় কমিশন (৳)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="যেমন: ৫"
                        value={editCommissionPerPair}
                        onChange={(e) => setEditCommissionPerPair(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-bold p-2.5 pr-7 rounded-xl focus:outline-none focus:border-emerald-400 font-mono text-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xs">৳</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">প্রতি জোড়া বিক্রয়ের জন্য</span>
                  </div>
                </div>

                {/* Real-time Calculation Simulator */}
                {(() => {
                  const simulatedPairs = Number(editTargetPairs) || 1000;
                  const simulatedAmount = Number(editTargetAmount) || 200000;
                  const cRate = Number(editCommissionRate) || 0;
                  const cPair = Number(editCommissionPerPair) || 0;
                  const estimatedComm = Math.round((simulatedAmount * cRate / 100) + (simulatedPairs * cPair));

                  return (
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          টার্গেট পূর্ণ হলে সম্ভাব্য কমিশন:
                        </span>
                        <span className="text-emerald-400 font-black text-sm">
                          {formatTaka(estimatedComm)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        * টার্গেট {toBnDigit(simulatedPairs)} জোড়া বা {formatTaka(simulatedAmount)} সেলস সম্পন্ন হলে আনুমানিক এই কমিশন পাবে।
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingSeller(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Profile / Info Modal */}
      {editingCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-400" />
                <span>দোকান ও কাস্টমার তথ্য এডিট</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCust(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCustomerEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">দোকানের নাম (Shop Name) *</label>
                <input
                  type="text"
                  required
                  value={editCustShopName}
                  onChange={(e) => setEditCustShopName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">দোকানদার / প্রোপাইটারের নাম *</label>
                <input
                  type="text"
                  required
                  value={editCustName}
                  onChange={(e) => setEditCustName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
                  value={editCustPhone}
                  onChange={(e) => setEditCustPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ঠিকানা / বাজার / এলাকা</label>
                <input
                  type="text"
                  value={editCustAddress}
                  onChange={(e) => setEditCustAddress(e.target.value)}
                  placeholder="যেমন: চকবাজার, ঢাকা"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCust(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  তথ্য সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Customer Due / Opening Due Modal */}
      {adjustingCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>বকেয়া সমন্বয়: {adjustingCust.shopName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAdjustingCust(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustDueSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>দোকানদার:</span>
                  <span className="text-slate-200 font-bold">{adjustingCust.name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>বর্তমান বকেয়া:</span>
                  <span className="text-rose-400 font-black">{formatTaka(adjustingCust.currentDue)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">সমন্বয়ের ধরণ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustCustType('add')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      adjustCustType === 'add'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    ➕ পূর্বের বাকী যোগ করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustCustType('set')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      adjustCustType === 'set'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    ✏️ মোট বাকী সেট করুন
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {adjustCustType === 'add' ? 'যোগ করার পরিমাণ (টাকা ৳) *' : 'মোট বকেয়া নির্ধারণ (টাকা ৳) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={adjustCustAmount}
                    onChange={(e) => setAdjustCustAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-black text-base pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Calculated Result */}
              {(() => {
                const inputVal = Number(adjustCustAmount) || 0;
                const newDue = adjustCustType === 'add' ? adjustingCust.currentDue + inputVal : inputVal;
                return (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-amber-200">আপডেটের পর মোট বাকী:</span>
                    <span className="font-mono font-black text-rose-400 text-sm">৳ {newDue.toLocaleString('bn-BD')}</span>
                  </div>
                );
              })()}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">নোট / কারণ</label>
                <input
                  type="text"
                  value={adjustCustNote}
                  onChange={(e) => setAdjustCustNote(e.target.value)}
                  placeholder="যেমন: পূর্বের খাতার বাকী"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-2 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustingCust(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  বকেয়া সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Move User/Customer to Trash Confirmation */}
      {userToTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {userToTrash.user.role === 'customer' ? 'দোকান ট্র্যাশে পাঠানো' : 'ইউজার ট্র্যাশে পাঠানো'}
                </h4>
                <p className="text-xs text-slate-400">ট্র্যাশ থেকে যেকোনো সময় রিস্টোর করা যাবে</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">নাম:</span>
                <span className="font-bold text-white">{userToTrash.user.name}</span>
              </div>
              {userToTrash.user.shopName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">দোকান:</span>
                  <span className="font-bold text-amber-300">{userToTrash.user.shopName}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">মোবাইল:</span>
                <span className="font-mono text-slate-300">{userToTrash.user.phone || userToTrash.user.loginId}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800 pt-1.5">
                <span className="text-slate-400">ভূমিকা:</span>
                <span className="font-bold text-indigo-400">
                  {userToTrash.user.role === 'customer' ? 'দোকানদার/কাস্টমার' : userToTrash.user.role === 'seller' ? 'বিক্রয় প্রতিনিধি' : 'এডমিন'}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-xl text-rose-200">
              ⚠️ আপনি কি নিশ্চিতভাবে <strong>{userToTrash.user.shopName || userToTrash.user.name}</strong> ট্র্যাশে পাঠাতে চান? এটি সরাসরি ডিলিট হবে না, ট্র্যাশ (রিসাইকেল বিন) থেকে যেকোনো সময় রিস্টোর করা যাবে।
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUserToTrash(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteUserAccount && userToTrash) {
                    onDeleteUserAccount(userToTrash.user.id, userToTrash.customerId);
                    setUserToTrash(null);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ট্র্যাশে পাঠান</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;
