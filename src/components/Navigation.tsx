import React from 'react';
import { UITheme, UserRole } from '../types';
import {
  LayoutDashboard,
  Boxes,
  Receipt,
  ShoppingBag,
  Clock,
  History,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type NavTab = 'dashboard' | 'pos' | 'stock' | 'due' | 'sales' | 'pending' | 'users' | 'features' | 'sms' | 'catalog' | 'seller-tracking';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeTheme: UITheme;
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

  const allTabs = [
    { id: 'catalog' as NavTab, label: 'প্রোডাক্ট ক্যাটালগ', icon: ShoppingBag, roles: ['customer'] },
    { id: 'pending' as NavTab, label: 'অর্ডার স্ট্যাটাস', icon: Clock, badgeCount: pendingOrdersCount, badgeColor: 'bg-amber-500', roles: ['customer'] },
    { id: 'sales' as NavTab, label: 'অর্ডার হিস্টোরি', icon: History, roles: ['customer'] },

    { id: 'dashboard' as NavTab, label: t('dashboard'), icon: LayoutDashboard, roles: ['super_admin', 'admin', 'seller'] },
    { id: 'stock' as NavTab, label: t('stock'), icon: Boxes, badgeCount: lowStockCount, badgeColor: 'bg-rose-500', roles: ['super_admin', 'admin', 'seller'] },
    { id: 'due' as NavTab, label: t('due'), icon: Receipt, badgeCount: dueAlertCount, badgeColor: 'bg-indigo-500', roles: ['super_admin', 'admin', 'seller'] },
  ];

  const visibleTabs = allTabs.filter((t) => t.roles.includes(currentUserRole));

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-start py-2">
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full py-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800 bg-slate-950/40 border border-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>{tab.label}</span>

                  {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${tab.badgeColor || 'bg-indigo-600'}`}>
                      {tab.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
