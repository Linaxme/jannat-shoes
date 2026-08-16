import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  PhoneCall,
  MapPin,
  RefreshCw,
  LogOut,
  UserCheck,
  ShieldAlert,
  Shield,
  Menu,
  X,
  ChevronRight,
  ShoppingCart,
  Clock,
  TrendingUp,
  History,
  UserPlus,
  Sliders,
  MessageSquare,
  Languages,
  ShoppingBag,
  User,
  Check,
  Copy,
  Bell,
  Smartphone,
  Download,
  BarChart3,
  Trash2,
  CheckCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserAccount, UserRole, SystemConfig, AppNotification } from '../types';
import { NavTab } from './Navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { toBnDigit } from '../utils/formatters';

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
  notifications?: AppNotification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onClearNotifications?: () => void;
  onInstallPWA?: () => void;
  canInstallPWA?: boolean;
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
  notifications = [],
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onClearNotifications,
  onInstallPWA,
  canInstallPWA = false,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [expandedNotifIds, setExpandedNotifIds] = useState<Record<string, boolean>>({});
  const notifRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useLanguage();

  const isStaff = currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'seller';
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const toggleExpandNotification = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedNotifIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isNotifOpen]);

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
    { id: 'pos' as NavTab, label: 'মেমো', icon: ShoppingCart, roles: ['super_admin', 'admin', 'seller'] },
    { id: 'pending' as NavTab, label: currentUserRole === 'customer' ? 'অর্ডার স্ট্যাটাস' : 'পেন্ডিং অর্ডার', icon: Clock, badgeCount: pendingOrdersCount, badgeColor: 'bg-amber-500', roles: ['super_admin', 'admin', 'seller', 'customer'] },
    { id: 'catalog' as NavTab, label: isStaff ? 'ক্যাটালগ' : 'প্রোডাক্ট ক্যাটালগ', icon: ShoppingBag, roles: ['super_admin', 'admin', 'seller', 'customer'] },
    { id: 'sales' as NavTab, label: currentUserRole === 'customer' ? 'অর্ডার হিস্টোরি' : 'বিক্রয় ইতিহাস', icon: History, roles: ['super_admin', 'admin', 'seller', 'customer'] },
    { id: 'reports' as NavTab, label: 'কাস্টম রিপোর্ট', icon: BarChart3, roles: ['super_admin', 'admin'] },
    { id: 'seller-tracking' as NavTab, label: 'সেলস ট্র্যাকিং', icon: TrendingUp, roles: ['super_admin', 'admin'] },
    { id: 'users' as NavTab, label: 'ইউজার', icon: UserPlus, roles: ['super_admin', 'admin', ...(systemConfig?.allowSellerToManageUsers ? ['seller'] : [])] },
    { id: 'features' as NavTab, label: 'সেটিং', icon: Sliders, roles: ['super_admin', 'admin'] },
    ...(systemConfig?.enableSMS !== false ? [{ id: 'sms' as NavTab, label: t('sms'), icon: MessageSquare, roles: ['super_admin', 'admin'] }] : []),
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-2">
        <div className="flex items-stretch justify-between gap-2 sm:gap-4">
          
          {/* Brand & Store Name */}
          <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
            <div className="p-1.5 sm:p-2 bg-amber-500 rounded-lg text-slate-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/10 flex-shrink-0 mt-0.5">
              <Store className="w-5 h-5 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div className="text-left flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white leading-tight">
                    {t('store_name')}
                  </h1>
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    {t('wholesale')}
                  </span>
                </div>

                {/* Tagline / Slogan */}
                <p className="text-[10px] sm:text-[11px] text-amber-300/90 font-medium leading-none mt-1 sm:mt-0.5">
                  {t('store_slogan')}
                </p>
              </div>

              {/* Phone & Address */}
              <div className="text-[10px] sm:text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1.5 sm:mt-0.5">
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
                <span className="flex items-center gap-1 text-slate-400 leading-none">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{t('address')}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Side Actions: Notification Bell, APK Button, Menu Button & Date */}
          <div className="flex flex-col items-end justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Desktop User Info (Hidden on mobile) */}
              {currentUser && (
                <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 pr-3 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/30">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{currentUser.name}</span>
                      {getRoleBadge(currentUser.role)}
                    </div>
                  </div>
                </div>
              )}

              {/* APK Download Button (if URL configured) */}
              {systemConfig?.apkDownloadUrl && (
                <a
                  href={systemConfig.apkDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="অ্যান্ড্রয়েড অ্যাপ (APK) ডাউনলোড করুন"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">অ্যাপ ডাউনলোড</span>
                </a>
              )}

              {/* Notification Bell with Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer relative flex items-center gap-1.5 ${
                    isNotifOpen
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  title="নোটিফিকেশন ও এলার্ট"
                >
                  <Bell className="w-4 h-4 text-amber-400" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifsCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popup Dropdown / Mobile Modal */}
                {isNotifOpen && (
                  <>
                    {/* Mobile Backdrop */}
                    <div 
                      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden animate-fadeIn"
                      onClick={() => setIsNotifOpen(false)}
                    />

                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="fixed left-2.5 right-2.5 top-16 sm:top-full sm:mt-2 sm:right-0 sm:left-auto w-auto sm:w-96 max-h-[82vh] sm:max-h-[480px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-fadeIn"
                    >
                      {/* Popup Header */}
                      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                            <Bell className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-xs text-white">নোটিফিকেশন</span>
                          {unreadNotifsCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] rounded font-bold">
                              {toBnDigit(unreadNotifsCount)}টি নতুন
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {onMarkAllNotificationsAsRead && unreadNotifsCount > 0 && (
                            <button
                              type="button"
                              onClick={onMarkAllNotificationsAsRead}
                              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 cursor-pointer"
                              title="সবগুলো পড়া হয়েছে হিসেবে চিহ্নিত করুন"
                            >
                              <CheckCheck className="w-3 h-3" /> সব পড়ুন
                            </button>
                          )}
                          {onClearNotifications && notifications.length > 0 && (
                            <button
                              type="button"
                              onClick={onClearNotifications}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                              title="সব নোটিফিকেশন মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsNotifOpen(false)}
                            className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center sm:hidden cursor-pointer"
                            title="বন্ধ করুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="overflow-y-auto divide-y divide-slate-800/60 no-scrollbar flex-1">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                            <Bell className="w-8 h-8 text-slate-700" />
                            <span>বর্তমানে কোনো নোটিফিকেশন নেই</span>
                          </div>
                        ) : (
                          notifications.slice(0, 30).map((n) => {
                            const isExpanded = !!expandedNotifIds[n.id];
                            const isLong = (n.message && n.message.length > 70) || (n.message && n.message.includes('\n'));

                            return (
                              <div
                                key={n.id}
                                onClick={() => {
                                  if (!n.read && onMarkNotificationAsRead) {
                                    onMarkNotificationAsRead(n.id);
                                  }
                                  toggleExpandNotification(n.id);
                                }}
                                className={`p-3 text-xs transition cursor-pointer hover:bg-slate-800/80 ${
                                  !n.read
                                    ? 'bg-amber-500/5 border-l-2 border-amber-400'
                                    : 'bg-slate-900/40 hover:bg-slate-800/40'
                                } ${isExpanded ? 'bg-slate-800/60 ring-1 ring-amber-500/20' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {!n.read && (
                                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                                    )}
                                    <span className={`font-bold truncate ${!n.read ? 'text-amber-300' : 'text-slate-200'}`}>
                                      {n.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {new Date(n.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isLong && (
                                      <span className="text-slate-500 ml-0.5">
                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-1">
                                  <p
                                    className={`text-[11px] text-slate-300 leading-relaxed whitespace-pre-line break-words transition-all ${
                                      isExpanded ? '' : 'line-clamp-2'
                                    }`}
                                  >
                                    {n.message}
                                  </p>

                                  {isLong && (
                                    <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-slate-800/40 text-[10px]">
                                      <span className="text-slate-500">
                                        {new Date(n.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className="text-amber-400 font-semibold flex items-center gap-0.5 hover:underline">
                                        {isExpanded ? 'সংক্ষেপ করুন' : 'পুরো বার্তা পড়ুন'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Unified Menu Drawer Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition-all duration-150 cursor-pointer relative border ${
                  isDrawerTabActive || isDrawerOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800 hover:border-slate-700'
                }`}
                title={t('menu_desc')}
              >
                <Menu className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDrawerTabActive || isDrawerOpen ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{t('menu')}</span>
                
                {totalDrawerBadges > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full font-black text-[9px] flex items-center justify-center shadow-lg animate-pulse ${
                    isDrawerTabActive || isDrawerOpen ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {totalDrawerBadges}
                  </span>
                )}
              </button>
            </div>
            {/* Today's Date */}
            <div className="text-[11px] sm:text-xs text-slate-300 font-semibold px-1 pr-1.5">
              {new Date().toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
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
            className="bg-slate-900 border-l border-slate-800 w-full max-w-[285px] h-full flex flex-col shadow-2xl animate-slideLeft"
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

              {/* Install PWA Button */}
              {canInstallPWA && onInstallPWA && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onInstallPWA();
                  }}
                  className="w-full p-2.5 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-300 rounded-xl font-bold text-xs flex items-center justify-between transition cursor-pointer mb-2"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>হোম স্ক্রিনে অ্যাপ ইনস্টল করুন</span>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black">PWA</span>
                </button>
              )}

              {/* Download APK Link */}
              {systemConfig?.apkDownloadUrl && (
                <a
                  href={systemConfig.apkDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full p-2.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold text-xs flex items-center justify-between transition cursor-pointer mb-2"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>অ্যান্ড্রয়েড APK ডাউনলোড</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                </a>
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




