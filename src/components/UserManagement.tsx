import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { UserAccount, UserRole, SalesRep, UITheme, SystemConfig } from '../types';
import { toBnDigit } from '../utils/formatters';
import { UserPlus, Shield, UserCheck, ShieldAlert, ShieldCheck, Key, MapPin, Target, Percent, Lock, UserX, PlusCircle, Sparkles, CheckCircle2, ChevronDown, Edit, Sliders, Settings, Store, Search, Users } from 'lucide-react';

interface UserManagementProps {
  currentUser: UserAccount;
  userAccounts: UserAccount[];
  sellers: SalesRep[];
  activeTheme: UITheme;
  systemConfig?: SystemConfig;
  onUpdateSystemConfig?: (newConfig: SystemConfig) => void;
  onAddUserAccount: (newAcc: UserAccount, newSeller?: SalesRep) => void;
  onToggleUserStatus: (userId: string, newStatus: boolean) => void;
  onResetPassword: (userId: string, newPass: string) => void;
  onUpdateSeller?: (updatedSeller: SalesRep) => void;
  onDeleteUserAccount?: (userId: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  userAccounts,
  sellers,
  activeTheme,
  systemConfig,
  onUpdateSystemConfig,
  onAddUserAccount,
  onToggleUserStatus,
  onResetPassword,
  onUpdateSeller,
  onDeleteUserAccount,
}) => {
  const { t } = useLanguage();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [confirmingDeleteUserId, setConfirmingDeleteUserId] = useState<string | null>(null);

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
  const [targetPairs, setTargetPairs] = useState<number>(1000);
  const [targetAmount, setTargetAmount] = useState<number>(0);

  // Password reset modal state
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // Seller edit state
  const [editingSeller, setEditingSeller] = useState<SalesRep | null>(null);
  const [editTargetPairs, setEditTargetPairs] = useState<number>(1000);
  const [editTargetAmount, setEditTargetAmount] = useState<number>(0);

  const handleUpdateSellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSeller && onUpdateSeller) {
      onUpdateSeller({
        ...editingSeller,
        monthlyTargetPairs: editTargetPairs,
        monthlyTargetAmount: editTargetAmount,
      });
      setEditingSeller(null);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !loginId || !password) return;

    const newId = `usr_${Date.now()}`;
    let createdSellerId: string | undefined = undefined;
    let newSellerObj: SalesRep | undefined = undefined;

    // If adding a seller, also create their SalesRep record
    if (role === 'seller') {
      createdSellerId = `sr_${Date.now()}`;
      newSellerObj = {
        id: createdSellerId,
        name: name,
        phone: phone || loginId,
        area: '',
        monthlyTargetPairs: targetPairs,
        monthlyTargetAmount: targetAmount,
        commissionRatePercent: 0,
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
      sellerId: createdSellerId,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddUserAccount(newAcc, newSellerObj);

    // Reset Form
    setName('');
    setShopName('');
    setLoginId('');
    setPassword('seller123');
    setPhone('');
    setTargetPairs(1000);
    setTargetAmount(0);
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

  const allNonSuperUsers = userAccounts.filter((u) => u.role !== 'super_admin');
  const staffUsers = allNonSuperUsers.filter((u) => u.role === 'admin' || u.role === 'seller');
  const customerUsers = allNonSuperUsers.filter((u) => u.role === 'customer');

  const customerCount = customerUsers.length;
  const sellerCount = allNonSuperUsers.filter((u) => u.role === 'seller').length;
  const adminCount = allNonSuperUsers.filter((u) => u.role === 'admin').length;
  const staffCount = sellerCount + adminCount;

  const filteredUsers = (activeMainTab === 'staff' ? staffUsers : customerUsers).filter((u) => {
    if (activeMainTab === 'staff' && selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.name.toLowerCase().includes(q);
      const matchShop = (u.shopName || '').toLowerCase().includes(q);
      const matchLogin = u.loginId.toLowerCase().includes(q);
      const matchPhone = (u.phone || '').toLowerCase().includes(q);
      return matchName || matchShop || matchLogin || matchPhone;
    }
    return true;
  });

  const getRoleBadge = (r: UserRole, shopName?: string) => {
    switch (r) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
            <ShieldAlert className="w-3.5 h-3.5" /> {t('super_admin')}
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
            <Shield className="w-3.5 h-3.5" /> {t('admin')}
          </span>
        );
      case 'seller':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> {t('seller')}
          </span>
        );
      case 'customer':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit max-w-[180px] sm:max-w-[220px]" title={shopName || 'দোকানদার'}>
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{shopName || 'দোকানদার'}</span>
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
          filteredUsers.map((usr) => {
            const sellerData = sellers.find((s) => s.id === usr.sellerId);
            const isExpanded = expandedUserId === usr.id;

            return (
              <div
                key={usr.id}
                className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden transition-all duration-200"
              >
                {/* Header: Name & Role (Toggles expansion) */}
                <div 
                  onClick={() => toggleExpandUser(usr.id)}
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/40 active:bg-slate-800/60 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7.5 h-7.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {usr.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-1">
                        <span>{usr.name}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                      </div>
                      {usr.role !== 'customer' && usr.shopName && (
                        <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                          দোকান: {usr.shopName}
                        </div>
                      )}
                      {usr.sellerId && (
                        <div className="text-[9px] text-amber-400/80 font-mono mt-0.5">
                          {t('seller_id')}: {usr.sellerId}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {getRoleBadge(usr.role, usr.shopName)}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3.5 pt-1 border-t border-slate-800/60 bg-slate-950/40 space-y-2.5 text-[11px] animate-fadeIn">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">{t('login_id')}:</span>
                        <span className="font-mono text-amber-300 font-bold">{usr.loginId}</span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">{t('password')}:</span>
                        <span className="font-mono text-slate-300">•••••••• ({usr.password})</span>
                      </div>

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

                      {sellerData && (!systemConfig || systemConfig.enableTargetSystem !== false) && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-amber-400" />
                              টার্গেট (জোড়া):
                            </span>
                            <span className="text-amber-300 font-bold">{toBnDigit(sellerData.monthlyTargetPairs || 0)} জোড়া</span>
                          </div>
                          <div className="flex items-center justify-between bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-emerald-400" />
                              টার্গেট (টাকায়):
                            </span>
                            <span className="text-emerald-400 font-bold">৳ {toBnDigit(sellerData.monthlyTargetAmount || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-800/40 flex flex-wrap items-center gap-2">
                      {sellerData && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (!systemConfig || systemConfig.enableTargetSystem !== false) && (
                        <button
                          onClick={() => {
                            setEditingSeller(sellerData);
                            setEditTargetPairs(sellerData.monthlyTargetPairs || 1000);
                            setEditTargetAmount(sellerData.monthlyTargetAmount || 0);
                          }}
                          className="flex-1 min-w-[120px] py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>টার্গেট সেট</span>
                        </button>
                      )}

                      {(currentUser.role === 'admin' || currentUser.role === 'super_admin' || usr.id === currentUser.id) && (
                        <button
                          onClick={() => setResetTargetUser(usr)}
                          className="flex-1 min-w-[120px] py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>পাসওয়ার্ড পরিবর্তন</span>
                        </button>
                      )}

                      {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && usr.id !== currentUser.id && (
                        <>
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
                          {onDeleteUserAccount && (
                            confirmingDeleteUserId === usr.id ? (
                              <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-500/50">
                                <span className="text-[10px] font-bold text-rose-300 px-1">রিমুভ?</span>
                                <button
                                  onClick={() => {
                                    onDeleteUserAccount(usr.id);
                                    setConfirmingDeleteUserId(null);
                                  }}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-black shadow transition cursor-pointer"
                                >
                                  হ্যাঁ
                                </button>
                                <button
                                  onClick={() => setConfirmingDeleteUserId(null)}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition cursor-pointer"
                                >
                                  না
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingDeleteUserId(usr.id)}
                                className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                                title="ইউজার একাউন্ট রিমুভ করুন"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>রিমুভ</span>
                              </button>
                            )
                          )}
                        </>
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
            filteredUsers.map((usr) => {
              const sellerData = sellers.find((s) => s.id === usr.sellerId);
              const isExpanded = expandedUserId === usr.id;

              return (
                <div key={usr.id} className="transition-all duration-200">
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
                          <span>{usr.name}</span>
                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                        </div>
                        {usr.role !== 'customer' && usr.shopName && (
                          <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                            দোকান: {usr.shopName}
                          </div>
                        )}
                        {usr.sellerId && (
                          <div className="text-[10px] font-mono text-amber-400/80 mt-0.5">
                            সেলার আইডি: {usr.sellerId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>{getRoleBadge(usr.role, usr.shopName)}</div>
                    </div>
                  </div>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div className="px-5 py-4 bg-slate-950/50 border-t border-slate-800/60 animate-fadeIn space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">লগইন আইডি / ফোন</div>
                          <div className="font-mono text-amber-300 font-semibold">{usr.loginId}</div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">পাসওয়ার্ড</div>
                          <div className="font-mono text-slate-300">•••••••• ({usr.password})</div>
                        </div>

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

                      {sellerData && (!systemConfig || systemConfig.enableTargetSystem !== false) && (
                        <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-800/40">
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-amber-400" />
                              মাসিক টার্গেট (জোড়া)
                            </div>
                            <div className="text-amber-300 font-bold">{toBnDigit(sellerData.monthlyTargetPairs || 0)} জোড়া</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-emerald-400" />
                              মাসিক টার্গেট (টাকায়)
                            </div>
                            <div className="text-emerald-400 font-bold">৳ {toBnDigit(sellerData.monthlyTargetAmount || 0)}</div>
                          </div>
                        </div>
                      )}

                      {/* Expandable Action Buttons */}
                      <div className="pt-3 border-t border-slate-800/50 flex items-center justify-end gap-3">
                        {sellerData && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (!systemConfig || systemConfig.enableTargetSystem !== false) && (
                          <button
                            onClick={() => {
                              setEditingSeller(sellerData);
                              setEditTargetPairs(sellerData.monthlyTargetPairs || 1000);
                              setEditTargetAmount(sellerData.monthlyTargetAmount || 0);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>টার্গেট সেট করুন</span>
                          </button>
                        )}

                        {(currentUser.role === 'admin' || currentUser.role === 'super_admin' || usr.id === currentUser.id) && (
                          <button
                            onClick={() => setResetTargetUser(usr)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>পাসওয়ার্ড পরিবর্তন</span>
                          </button>
                        )}

                        {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && usr.id !== currentUser.id && (
                          <>
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
                            {onDeleteUserAccount && (
                              confirmingDeleteUserId === usr.id ? (
                                <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-500/50">
                                  <span className="text-[11px] font-bold text-rose-300 px-1">স্থায়ীভাবে রিমুভ করবেন?</span>
                                  <button
                                    onClick={() => {
                                      onDeleteUserAccount(usr.id);
                                      setConfirmingDeleteUserId(null);
                                    }}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-black shadow transition cursor-pointer"
                                  >
                                    হ্যাঁ
                                  </button>
                                  <button
                                    onClick={() => setConfirmingDeleteUserId(null)}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition cursor-pointer"
                                  >
                                    না
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmingDeleteUserId(usr.id)}
                                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                  title="ইউজার একাউন্ট রিমুভ করুন"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>রিমুভ</span>
                                </button>
                              )
                            )}
                          </>
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
                    {role === 'customer' ? 'দোকানদারের মোবাইল নম্বর (লগইন আইডি)' : 'লগইন মোবাইল নম্বর'}{' '}
                    <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="যেমন: 01700000000"
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
                    লগইন পাসওয়ার্ড <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="পাসওয়ার্ড"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {role === 'customer' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
                  দোকানদার এই মোবাইল নম্বর ও পাসওয়ার্ড ব্যবহার করে অনলাইনে ক্যাটালগ লগইন করতে পারবেন এবং তাদের অর্ডারের তথ্য প্রাক-পূরণ হবে।
                </div>
              )}

              {role === 'seller' && (!systemConfig || systemConfig.enableTargetSystem !== false) && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                    <label className="block font-semibold text-slate-300 mb-1 text-[11px] uppercase tracking-wider">
                      টার্গেট (জোড়া)
                    </label>
                    <input
                      type="number"
                      value={targetPairs}
                      onChange={(e) => setTargetPairs(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                    <label className="block font-semibold text-slate-300 mb-1 text-[11px] uppercase tracking-wider">
                      টার্গেট (টাকায়)
                    </label>
                    <input
                      type="number"
                      value={targetAmount || ''}
                      onChange={(e) => setTargetAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono p-2.5 rounded-xl focus:outline-none focus:border-emerald-400"
                    />
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

      {/* Edit Seller Target Modal */}
      {editingSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span>টার্গেট আপডেট: {editingSeller.name}</span>
            </h3>

            <form onSubmit={handleUpdateSellerSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">টার্গেট (জোড়া)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="যেমন: ১০০০"
                    value={editTargetPairs}
                    onChange={(e) => setEditTargetPairs(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">টার্গেট (টাকায়)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="যেমন: ৫০০০"
                    value={editTargetAmount || ''}
                    onChange={(e) => setEditTargetAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSeller(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-md"
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

