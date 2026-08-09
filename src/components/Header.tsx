import React, { useState } from 'react';
import { Store, PhoneCall, MapPin, RefreshCw, LogOut, UserCheck, ShieldAlert, Shield, Menu, X, ChevronRight, ShoppingCart, Clock, History, UserPlus, Sliders, MessageSquare, Languages, ShoppingBag, User, Check, Copy } from 'lucide-react';
import { UserAccount, UserRole, SystemConfig } from '../types';
import { NavTab } from './Navigation';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onManualSeed?: () => void;
  isLoadingCloud?: boolean;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  dueAlertCount?: number;
  lowStockCount?: number;
  pendingOrdersCount?: number;
  currentUserRole?: UserRole;
  systemConfig?: SystemConfig;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onManualSeed,
  isLoadingCloud,
  activeTab,
  onSelectTab,
  dueAlertCount = 0,
  lowStockCount = 0,
  pendingOrdersCount = 0,
  currentUserRole = 'admin',
  systemConfig,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const isStaff = currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'seller';

  const handleCopyPhone = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const phoneStr = '01872-259237';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(phoneStr).then(() => {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }).catch(() => {
        fallbackCopy(phoneStr);
      });
    } else {
      fallbackCopy(phoneStr);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const allTabs = [
    { id: 'catalog' as NavTab, label: isStaff ? 'ক্যাটালগ' : '🛍️ পাইকারি ক্যাটালগ', icon: ShoppingBag, roles: ['super_admin', 'admin', 'seller', 'customer'] },
    { id: 'pos' as NavTab, label: t('pos'), icon: ShoppingCart, roles: ['super_admin', 'admin', 'seller'] },
    { id: 'pending' as NavTab, label: t('pending'), icon: Clock, badgeCount: pendingOrdersCount, badgeColor: 'bg-amber-500', roles: ['super_admin', 'admin', 'seller'] },
    { id: 'sales' as NavTab, label: t('history'), icon: History, roles: ['super_admin', 'admin', 'seller'] },
    { id: 'users' as NavTab, label: t('users'), icon: UserPlus, roles: ['super_admin', 'admin', ...(systemConfig?.allowSellerToManageUsers ? ['seller'] : [])] },
    ...(systemConfig?.enableSMS !== false ? [{ id: 'sms' as NavTab, label: t('sms'), icon: MessageSquare, roles: ['super_admin', 'admin'] }] : []),
    { id: 'features' as NavTab, label: '⚙️ সেটিং', icon: Sliders, roles: ['super_admin', 'admin'] },
  ];

  const visibleDrawerTabs = allTabs.filter((t) => t.roles.includes(currentUserRole));
  const totalDrawerBadges = visibleDrawerTabs.reduce((acc, t) => acc + (t.badgeCount || 0), 0);
  const isDrawerTabActive = visibleDrawerTabs.some((t) => t.id === activeTab);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit"><ShieldAlert className="w-3 h-3" /> সুপার এডমিন</span>;
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> মালিক / এডমিন</span>;
      case 'seller':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit"><UserCheck className="w-3 h-3" /> সেলার</span>;
      case 'customer':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit"><User className="w-3 h-3" /> দোকানদার</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <header className={`bg-slate-950 border-b border-slate-800 sticky top-0 backdrop-blur-md bg-opacity-95 transition-all duration-150 ${isDrawerOpen ? 'z-50' : 'z-40'}`}>
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-3.5 sm:py-3">
        <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
          
          {/* Brand & Store Name */}
          <div className="flex items-start gap-2.5 sm:gap-3.5 flex-1 min-w-0">
            <div className="p-2 sm:p-2.5 bg-amber-500 rounded-xl text-slate-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/10 flex-shrink-0 mt-0.5 sm:mt-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white leading-tight">
                  {t('store_name')}
                </h1>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                  {t('wholesale')}
                </span>
              </div>

              {/* Tagline / Slogan */}
              <p className="text-[10px] sm:text-xs text-amber-300/90 font-medium leading-normal mt-1 sm:mt-0.5">
                {t('store_slogan')}
              </p>

              {/* Phone & Address */}
              <div className="text-[10px] sm:text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1.5 sm:mt-1">
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  onTouchStart={handleCopyPhone}
                  className="flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 active:text-amber-200 transition-colors cursor-pointer select-none text-[11px] sm:text-xs w-fit"
                  title="ফোন নম্বর কপি করতে ক্লিক বা স্পর্শ করুন"
                >
                  <PhoneCall className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="font-mono tracking-wide">{t('phone')}</span>
                  {copiedPhone && (
                    <span className="ml-1.5 text-[10px] font-bold text-emerald-400 animate-fadeIn flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> কপি হয়েছে!
                    </span>
                  )}
                </button>

                <span className="hidden sm:inline text-slate-700">•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{t('address')}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Side Actions: Menu Button (Perfectly aligned with title) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Desktop User Info (Hidden on mobile) */}
            {currentUser && (
              <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 pr-3 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/30">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    {getRoleBadge(currentUser.role)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {t('id_label')}: {currentUser.loginId}
                  </div>
                </div>
              </div>
            )}

            {/* Unified Menu Drawer Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer relative border ${
                isDrawerTabActive || isDrawerOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800 hover:border-slate-700'
              }`}
              title={t('menu_desc')}
            >
              <Menu className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDrawerTabActive || isDrawerOpen ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>{t('menu')}</span>
              
              {totalDrawerBadges > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shadow-lg animate-pulse ${
                  isDrawerTabActive || isDrawerOpen ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                }`}>
                  {totalDrawerBadges}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>

    {/* Top Header Drawer Modal */}
    {isDrawerOpen && (
      <div 
        onClick={() => setIsDrawerOpen(false)}
        className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fadeIn"
      >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border-l border-slate-800 w-full max-w-[275px] h-full flex flex-col shadow-2xl animate-slideLeft"
          >
            
            {/* Drawer Header */}
            <div className="px-3.5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Menu className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-xs">{t('menu')}</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
 
            {/* Drawer Body (List of Tabs & Logout) */}
            <div className="p-3 overflow-y-auto space-y-1.5 flex-1 no-scrollbar">
              {/* User Profile Card in Drawer Menu */}
              {currentUser ? (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl mb-2 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-500/30 shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {currentUser.name}
                    </div>
                    <div className="mt-0.5">
                      {getRoleBadge(currentUser.role)}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {t('id_label')}: {currentUser.loginId}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl mb-2 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-500/30 shrink-0">
                    আ
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      মো আলাউদ্দিন ইসলাম
                    </div>
                    <div className="mt-0.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        মালিক / এডমিন
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-bold">
                  <Languages className="w-4 h-4 text-amber-400" />
                  <span>{t('language')}</span>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setLanguage('bn')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold ${language === 'bn' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                  >
                    বাংলা
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold ${language === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                  >
                    English
                  </button>
                </div>
              </div>
 
              {visibleDrawerTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
 
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onSelectTab(tab.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-left text-xs">{tab.label}</span>
                    </div>
 
                    <div className="flex items-center gap-1.5">
                      {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${tab.badgeColor || 'bg-amber-500'}`}>
                          {tab.badgeCount}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                    </div>
                  </button>
                );
              })}
 

 
              {currentUser && onLogout && (
                <div className="pt-3 mt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              )}
            </div>
 
            {/* Drawer Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-[11px] text-slate-500">
              {t('app_version')}
            </div>

          </div>
        </div>
      )}
    </>
  );
};



