import React from 'react';
import { UITheme, UserRole } from '../types';
import {
  LayoutDashboard,
  Boxes,
  Receipt,
  Clock,
  History,
  ShoppingCart,
  Plus,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type NavTab = 'dashboard' | 'pos' | 'stock' | 'due' | 'sales' | 'pending' | 'reports' | 'users' | 'features' | 'sms' | 'seller-tracking' | 'shops' | 'trash';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeTheme?: UITheme;
  dueAlertCount: number;
  lowStockCount: number;
  currentUserRole?: UserRole;
  pendingOrdersCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  dueAlertCount,
  lowStockCount,
  currentUserRole = 'admin',
  pendingOrdersCount = 0,
}) => {
  const { t } = useLanguage();
  const isCustomer = currentUserRole === 'customer';

  const staffTabs = [
    { id: 'dashboard' as NavTab, label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'stock' as NavTab, label: 'স্টক', icon: Boxes, badgeCount: lowStockCount, badgeColor: 'bg-rose-500' },
    { id: 'pos' as NavTab, label: 'মেমো', icon: ShoppingCart, isCenterAction: true },
    { id: 'due' as NavTab, label: 'বাকীর খাতা', icon: Receipt, badgeCount: dueAlertCount, badgeColor: 'bg-indigo-500' },
    { id: 'sales' as NavTab, label: 'বিক্রয় ইতিহাস', icon: History },
  ];

  const customerTabs = [
    { id: 'pending' as NavTab, label: 'অর্ডার স্ট্যাটাস', icon: Clock, badgeCount: pendingOrdersCount, badgeColor: 'bg-amber-500' },
    { id: 'sales' as NavTab, label: 'অর্ডার হিস্টোরি', icon: History },
  ];

  const visibleTabs = isCustomer ? customerTabs : staffTabs;

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/80 shadow-[0_-8px_25px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.55)] md:hidden transition-all duration-200">
      <div className="max-w-lg mx-auto px-2 pt-1.5 pb-2">
        <div className="flex items-center justify-around relative">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            // Elevated center button for POS / New Memo
            if ((tab as any).isCenterAction) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className="flex flex-col items-center justify-center -mt-5 group cursor-pointer focus:outline-none"
                  title="নতুন বিক্রয় মেমো তৈরি করুন"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-amber-400/40 ring-4 ring-amber-500/20 scale-105'
                        : 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/30 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.3]" />
                  </div>
                  <span
                    className={`text-[10px] font-extrabold mt-1 tracking-tight transition-colors ${
                      isActive ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer relative group focus:outline-none ${
                  isActive ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {/* Active Indicator Top Pill */}
                {isActive && (
                  <span className="absolute top-0 w-6 h-0.5 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                )}

                <div className="relative mt-0.5">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isActive ? 'scale-110 stroke-[2.2]' : 'group-hover:scale-105 stroke-[1.8]'
                    }`}
                  />

                  {/* Notification Badge */}
                  {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2 text-[9px] font-black min-w-[15px] h-[15px] px-1 rounded-full text-white flex items-center justify-center shadow ${
                        tab.badgeColor || 'bg-amber-500'
                      }`}
                    >
                      {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-tight mt-1 truncate max-w-[65px] ${
                    isActive ? 'font-bold text-amber-700 dark:text-amber-400' : 'font-medium text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

