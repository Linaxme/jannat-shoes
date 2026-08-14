import { ShoeProduct, Customer, SalesRep, Order, DuePaymentLog, UITheme, UserAccount, SystemConfig } from '../types';

export const INITIAL_PRODUCTS: ShoeProduct[] = [];
export const INITIAL_SALES_REPS: SalesRep[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_PAYMENT_LOGS: DuePaymentLog[] = [];

export const UI_THEMES: UITheme[] = [
  {
    id: 'royal_navy',
    nameBn: '১. রয়্যাল ব্লু ও অ্যাম্বার (Royal Navy)',
    nameEn: 'Royal Navy & Golden Amber',
    descBn: 'পাইকারি শো-রুমের জন্য আভিজাত্যপূর্ণ ও ক্লিয়ার কন্ট্রাস্ট থিম',
    bgClass: 'bg-slate-900 text-slate-100',
    cardClass: 'bg-slate-800/90 border border-slate-700/80 shadow-lg text-slate-100',
    headerClass: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-800/50',
    primaryBtnClass: 'bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-900/40 active:scale-[0.98]',
    accentBadgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    textPrimaryClass: 'text-indigo-400',
    borderClass: 'border-slate-700'
  },
  {
    id: 'leather_craft',
    nameBn: '২. প্রিমিয়াম লেদার ও ক্লাসিক (Leather Craft)',
    nameEn: 'Leather Craft & Cream',
    descBn: 'আসল চামড়ার জুতা ব্র্যান্ডের জন্য উষ্ণ কফি ও গোল্ডেন ভাইব',
    bgClass: 'bg-stone-900 text-stone-100',
    cardClass: 'bg-stone-800/90 border border-stone-700 shadow-lg text-stone-100',
    headerClass: 'bg-gradient-to-r from-stone-950 via-amber-950 to-stone-950 border-b border-amber-800/50',
    primaryBtnClass: 'bg-amber-700 hover:bg-amber-600 text-amber-50 font-medium shadow-md shadow-amber-950/50 active:scale-[0.98]',
    accentBadgeClass: 'bg-amber-400/20 text-amber-200 border border-amber-400/40',
    textPrimaryClass: 'text-amber-400',
    borderClass: 'border-stone-700'
  },
  {
    id: 'emerald_dark',
    nameBn: '৩. মডার্ন এমারেল্ড প্রফিট (Emerald Profit)',
    nameEn: 'Emerald Green & Dark Charcoal',
    descBn: 'লাভ-ক্ষতি ও ক্যাশ হিসাবের স্পষ্টতার জন্য উজ্জ্বল সবুজ থিম',
    bgClass: 'bg-zinc-950 text-zinc-100',
    cardClass: 'bg-zinc-900/90 border border-zinc-800 shadow-lg text-zinc-100',
    headerClass: 'bg-gradient-to-r from-zinc-950 via-emerald-950 to-zinc-950 border-b border-emerald-800/50',
    primaryBtnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950/50 active:scale-[0.98]',
    accentBadgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    textPrimaryClass: 'text-emerald-400',
    borderClass: 'border-zinc-800'
  }
];

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr_super',
    name: 'সুপার এডমিন (ওয়েব মেইনটেইনার)',
    loginId: 'admin@linax.com',
    password: 'admin1234',
    role: 'super_admin',
    phone: '01826990490',
    email: 'admin@linax.com',
    isActive: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'usr_admin',
    name: 'মো আলাউদ্দিন ইসলাম',
    loginId: '01872259237',
    password: 'admin1234',
    role: 'admin',
    phone: '01872259237',
    email: 'alauddin@linax.com',
    isActive: true,
    createdAt: '2026-01-01'
  }
];

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  id: 'global_config',
  enableSellerTracking: true,
  enableTargetSystem: true,
  enableCommissionSystem: true,
  enableSampleBooking: true,
  enableStockAlerts: true,
  enableProfitCalculation: true,
  enableSMS: true,
  allowGuestBrowsingAndOrder: true,
  allowSellerToSeeFinancials: false,
  allowSellerToSeeOtherSellersSales: false,
  allowSellerToSeeOtherSellersDue: true,
  allowSellerToEditStock: false,
  allowSellerToManageUsers: false,
  smsBalance: 50,
  totalSentSms: 0,
  categories: ['জেন্টস ফর্মাল', 'জেন্টস ক্যাজুয়াল', 'স্পোর্টস কেডস', 'লেডিস হিল/স্যান্ডেল', 'বাচ্চাদের জুতা'],
};

