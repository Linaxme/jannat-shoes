import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Receipt,
  Store,
  Clock,
  History,
  TrendingUp,
  BarChart3,
  UserPlus,
  Sliders,
  MessageSquare,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  UserCheck,
  User,
  Download,
  Languages,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { UserAccount, UserRole, SystemConfig } from '../types';
import { NavTab } from './Navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { toBnDigit } from '../utils/formatters';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser?: UserAccount | null;
  currentUserRole?: UserRole;
  onLogout?: () => void;
  onOpenLogin?: () => void;
  dueAlertCount?: number;
  lowStockCount?: number;
  pendingOrdersCount?: number;
  trashCount?: number;
  systemConfig?: SystemConfig;
  onInstallPWA?: () => void;
  canInstallPWA?: boolean;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
  badgeColor?: string;
  roles: UserRole[];
}

interface NavSectionDef {
  title: string;
  items: NavItemDef[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  currentUserRole = 'customer',
  onLogout,
  onOpenLogin,
  dueAlertCount = 0,
  lowStockCount = 0,
  pendingOrdersCount = 0,
  trashCount = 0,
  systemConfig,
  onInstallPWA,
  canInstallPWA,
}) => {
  const { t, language, setLanguage } = useLanguage();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('app_desktop_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('app_desktop_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isStaff = currentUserRole === 'admin' || currentUserRole === 'super_admin' || currentUserRole === 'seller';
  const isOwnerAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin';

  // Navigation sections categorized professionally
  const sections: NavSectionDef[] = [];

  if (isStaff) {
    // 1. Overview / Dashboard
    sections.push({
      title: 'ওভারভিউ',
      items: [
        {
          id: 'dashboard',
          label: t('dashboard'),
          icon: LayoutDashboard,
          roles: ['super_admin', 'admin', 'seller'],
        },
      ],
    });

    // 2. Sales & Orders
    sections.push({
      title: 'বিক্রয় ও অর্ডার',
      items: [
        {
          id: 'pos',
          label: 'নতুন মেমো / POS',
          icon: ShoppingCart,
          roles: ['super_admin', 'admin', 'seller'],
        },
        {
          id: 'pending',
          label: 'পেন্ডিং অর্ডার',
          icon: Clock,
          badgeCount: pendingOrdersCount,
          badgeColor: 'bg-amber-500',
          roles: ['super_admin', 'admin', 'seller'],
        },
        {
          id: 'sales',
          label: 'বিক্রয় ইতিহাস',
          icon: History,
          roles: ['super_admin', 'admin', 'seller'],
        },
      ],
    });

    // 3. Accounts, Inventory & Shops
    sections.push({
      title: 'হিসাব ও ইনভেন্টরি',
      items: [
        {
          id: 'stock',
          label: t('stock'),
          icon: Boxes,
          badgeCount: lowStockCount,
          badgeColor: 'bg-rose-500',
          roles: ['super_admin', 'admin', 'seller'],
        },
        {
          id: 'due',
          label: t('due'),
          icon: Receipt,
          badgeCount: dueAlertCount,
          badgeColor: 'bg-indigo-500',
          roles: ['super_admin', 'admin', 'seller'],
        },
        {
          id: 'shops',
          label: 'দোকান',
          icon: Store,
          roles: ['super_admin', 'admin', 'seller'],
        },
      ],
    });

    // 4. Management & Administration
    const adminItems: NavItemDef[] = [];
    if (isOwnerAdmin) {
      adminItems.push({
        id: 'seller-tracking',
        label: 'সেলস ট্র্যাকিং',
        icon: TrendingUp,
        roles: ['super_admin', 'admin'],
      });
      adminItems.push({
        id: 'reports',
        label: 'কাস্টম রিপোর্ট',
        icon: BarChart3,
        roles: ['super_admin', 'admin'],
      });
    }

    // User management: admin/super_admin or seller if enabled
    if (isOwnerAdmin || systemConfig?.allowSellerToManageUsers) {
      adminItems.push({
        id: 'users',
        label: 'ইউজার ও একাউন্ট',
        icon: UserPlus,
        roles: ['super_admin', 'admin', 'seller'],
      });
    }

    if (isOwnerAdmin) {
      adminItems.push({
        id: 'features',
        label: 'সিস্টেম সেটিংস',
        icon: Sliders,
        roles: ['super_admin', 'admin'],
      });
      if (systemConfig?.enableSMS !== false) {
        adminItems.push({
          id: 'sms',
          label: t('sms'),
          icon: MessageSquare,
          roles: ['super_admin', 'admin'],
        });
      }
    }

    // Recycle bin / Trash management
    if (isOwnerAdmin || systemConfig?.allowSellerToManageUsers) {
      adminItems.push({
        id: 'trash',
        label: 'রিসাইকেল বিন / ট্র্যাশ',
        icon: Trash2,
        badgeCount: trashCount,
        badgeColor: 'bg-rose-500',
        roles: ['super_admin', 'admin', 'seller'],
      });
    }

    if (adminItems.length > 0) {
      sections.push({
        title: 'প্রশাসন ও সেটিংস',
        items: adminItems,
      });
    }
  } else {
    // Customer Storefront Menu
    sections.push({
      title: 'দোকানদার মেনু',
      items: [
        {
          id: 'pending',
          label: 'অর্ডার স্ট্যাটাস',
          icon: Clock,
          badgeCount: pendingOrdersCount,
          badgeColor: 'bg-amber-500',
          roles: ['customer'],
        },
        {
          id: 'sales',
          label: 'অর্ডার হিস্টোরি',
          icon: History,
          roles: ['customer'],
        },
      ],
    });
  }

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
            <ShieldAlert className="w-3 h-3" /> সুপার এডমিন
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
            <Shield className="w-3 h-3" /> মালিক / এডমিন
          </span>
        );
      case 'seller':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
            <UserCheck className="w-3 h-3" /> সেলার
          </span>
        );
      case 'customer':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
            <User className="w-3 h-3" /> দোকানদার
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside
      id="desktop-left-sidebar"
      className={`hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/90 h-screen sticky top-0 z-40 transition-all duration-300 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Top Header / Brand */}
      <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Store className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                {t('store_name')}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                  {t('wholesale')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-md shadow-amber-500/20">
              <Store className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className={`p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer ${
            isCollapsed ? 'hidden' : 'block'
          }`}
          title={isCollapsed ? 'সাইডবার প্রসারিত করুন' : 'সাইডবার গুটিয়ে নিন'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* When collapsed, a tiny expand toggle button */}
      {isCollapsed && (
        <div className="py-1.5 border-b border-slate-200 dark:border-slate-800/80 flex justify-center bg-slate-50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="সাইডবার প্রসারিত করুন"
          >
            <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>
        </div>
      )}

      {/* Navigation Menu (Scrollable List) */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
        {sections.map((sec, secIdx) => {
          const visibleItems = sec.items.filter((item) =>
            item.roles.includes(currentUserRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={`sec-${secIdx}`} className="space-y-1">
              {/* Category Header */}
              {!isCollapsed && (
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {sec.title}
                </div>
              )}

              {/* Items in section */}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer group relative ${
                      isCollapsed
                        ? 'justify-center p-2.5 my-1'
                        : 'justify-between px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                          isActive
                            ? 'text-slate-950'
                            : 'text-amber-600 dark:text-amber-400 group-hover:scale-110'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate text-left text-xs">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {/* Badge Counter */}
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-full text-white shrink-0 ${
                          item.badgeColor || 'bg-amber-500'
                        } ${
                          isCollapsed
                            ? 'absolute -top-1 -right-1 ring-2 ring-white dark:ring-slate-900'
                            : ''
                        }`}
                      >
                        {toBnDigit(item.badgeCount)}
                      </span>
                    )}

                    {/* Active Indicator bar */}
                    {isActive && !isCollapsed && (
                      <div className="w-1.5 h-4 bg-slate-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: User Profile, Language & Logout */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 space-y-2 shrink-0">
        {/* User Card */}
        {currentUser ? (
          <div
            className={`bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-xl p-2 flex items-center gap-2 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/30 shrink-0">
              {currentUser.name.charAt(0)}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {currentUser.name}
                </div>
                <div className="mt-0.5">
                  {getRoleBadge(currentUser.role)}
                </div>
              </div>
            )}
          </div>
        ) : (
          !isCollapsed && (
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-xl p-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/30 shrink-0">
                আ
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  মো আলাউদ্দিন ইসলাম
                </div>
                <div className="mt-0.5">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> মালিক / এডমিন
                  </span>
                </div>
              </div>
            </div>
          )
        )}

        {/* PWA Button */}
        {canInstallPWA && onInstallPWA && !isCollapsed && (
          <button
            type="button"
            onClick={onInstallPWA}
            className="w-full px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-lg font-bold text-[11px] flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>অ্যাপ ইনস্টল</span>
            </div>
            <span className="text-[9px] bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-black">
              PWA
            </span>
          </button>
        )}

        {/* Actions Bar: Language & Logout */}
        <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
          {/* Language Switcher */}
          {!isCollapsed ? (
            <div className="flex bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  language === 'bn'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-400 border border-slate-300 dark:border-slate-800 text-[10px] font-bold"
              title={language === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
            >
              {language.toUpperCase()}
            </button>
          )}

          {/* Logout / Login Button */}
          {currentUser && onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className={`flex items-center justify-center gap-1 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer ${
                isCollapsed ? 'w-full' : 'px-2.5'
              }`}
              title="লগআউট করুন"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
              {!isCollapsed && <span>{t('logout')}</span>}
            </button>
          ) : !currentUser && onOpenLogin ? (
            <button
              type="button"
              onClick={onOpenLogin}
              className={`flex items-center justify-center gap-1 p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer ${
                isCollapsed ? 'w-full' : 'px-2.5'
              }`}
              title="লগইন করুন"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              {!isCollapsed && <span>লগইন</span>}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
};
