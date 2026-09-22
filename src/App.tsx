import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  ShoeProduct,
  Customer,
  SalesRep,
  Order,
  DuePaymentLog,
  UserAccount,
  SystemConfig,
  TrashItem,
  ConfirmDeliveryData,
} from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SALES_REPS,
  INITIAL_ORDERS,
  INITIAL_PAYMENT_LOGS,
  INITIAL_USER_ACCOUNTS,
  UI_THEMES,
  DEFAULT_SYSTEM_CONFIG,
} from './data/initialData';

import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { TabLoadingFallback } from './components/TabLoadingFallback';
import PosOrderBuilder from './components/PosOrderBuilder';

// Lazy-loaded components for rapid initial boot & light bundle size
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const InvoiceModal = lazy(() => import('./components/InvoiceModal').then(m => ({ default: m.InvoiceModal })));
const StockManagement = lazy(() => import('./components/StockManagement').then(m => ({ default: m.StockManagement })));
const DueManagement = lazy(() => import('./components/DueManagement').then(m => ({ default: m.DueManagement })));
const SalesHistory = lazy(() => import('./components/SalesHistory').then(m => ({ default: m.SalesHistory })));
const PendingOrders = lazy(() => import('./components/PendingOrders').then(m => ({ default: m.PendingOrders })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const UserManagement = lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const FeatureManagement = lazy(() => import('./components/FeatureManagement').then(m => ({ default: m.FeatureManagement })));
const SellerTracking = lazy(() => import('./components/SellerTracking').then(m => ({ default: m.SellerTracking })));
const SMSPanel = lazy(() => import('./components/SMSPanel').then(m => ({ default: m.SMSPanel })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const ShopManagement = lazy(() => import('./components/ShopManagement').then(m => ({ default: m.ShopManagement })));
const TrashManagement = lazy(() => import('./components/TrashManagement').then(m => ({ default: m.TrashManagement })));

import { fetchFirestoreData, seedFirestoreData, saveDocumentToFirestore, deleteDocumentFromFirestore, clearAllDatabaseData } from './lib/firestoreService';
import { generateSMSMessage, sendAutoSMS, SMSType } from './utils/smsService';
import { OrderItem } from './types';
import { normalizePhoneNumber, compareOrdersNewestFirst, getLocalDateStr } from './utils/formatters';

import { CheckCircle2, X } from 'lucide-react';

export default function App() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('lixa_active_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'admin' || parsed.role === 'super_admin') && (parsed.name === 'Store Admin' || parsed.name === 'এডমিন' || parsed.name === 'জান্নাত সুজ' || parsed.name?.includes('মালিক /') || parsed.name?.includes('জান্নাত'))) {
          parsed.name = 'মো আলাউদ্দিন ইসলাম';
          localStorage.setItem('lixa_active_user', JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (currentUser?.role === 'customer') return 'pending';
    if (currentUser?.role === 'seller') return 'pos';
    return 'dashboard';
  });
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(true);

  const [products, setProducts] = useState<ShoeProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<SalesRep[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<DuePaymentLog[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(INITIAL_USER_ACCOUNTS);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);

  // PWA Install Prompt State
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [canInstallPWA, setCanInstallPWA] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setCanInstallPWA(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredInstallPrompt) {
      alert('আপনার ব্রাউজারে অ্যাপ ইনস্টল করতে ব্রাউজার মেনু থেকে "Install app" অথবা "Add to Home screen" নির্বাচন করুন।');
      return;
    }
    try {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setCanInstallPWA(false);
        setDeferredInstallPrompt(null);
      }
    } catch (err) {
      console.error('PWA install prompt error:', err);
    }
  };

  // Helper to sort orders by date/time/id descending (newest first)
  const sortOrdersByRecency = (ordersList: Order[]) => {
    return [...ordersList].sort(compareOrdersNewestFirst);
  };

  // Load from Firestore on mount
  useEffect(() => {
    async function loadData() {
      setIsLoadingCloud(true);

      const res = await fetchFirestoreData();

      setProducts(res.products || []);
      setCustomers(res.customers || []);
      setSellers(res.sellers || []);
      setOrders(sortOrdersByRecency(res.orders || []));
      setPaymentLogs(res.paymentLogs || []);
      setTrashItems(res.trashItems || []);

      if (res.userAccounts && res.userAccounts.length > 0) {
        let hasAdmin = res.userAccounts.some((u) => u.role === 'admin');
        let accounts = res.userAccounts.map((u) => {
          if (u.role === 'admin') {
            const updatedAdmin = {
              ...u,
              name: u.name.includes('মালিক') || u.name === 'Store Admin' || u.name === 'এডমিন' ? 'মো আলাউদ্দিন ইসলাম' : u.name,
              phone: u.phone === '01711002233' || !u.phone ? '01872259237' : u.phone,
              loginId: u.loginId === '01711002233' || !u.loginId ? '01872259237' : u.loginId,
            };
            if (u.phone === '01711002233' || u.loginId === '01711002233') {
              saveDocumentToFirestore('userAccounts', updatedAdmin.id, updatedAdmin);
            }
            return updatedAdmin;
          }
          return u;
        });
        if (!hasAdmin) {
          const defaultAdmin: UserAccount = {
            id: 'usr_admin',
            name: 'মো আলাউদ্দিন ইসলাম',
            loginId: '01872259237',
            password: 'admin1234',
            role: 'admin',
            phone: '01872259237',
            email: 'alauddin@linax.com',
            isActive: true,
            createdAt: '2026-01-01'
          };
          accounts.push(defaultAdmin);
          saveDocumentToFirestore('userAccounts', defaultAdmin.id, defaultAdmin);
        }

        setUserAccounts(accounts);
      }
      if (res.systemConfig) {
        setSystemConfig(res.systemConfig);
      }
      setIsLoadingCloud(false);
    }
    loadData();
  }, []);

  // Modal Invoice Viewer State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !localStorage.getItem('lixa_active_user'));

  // Notification Toast State
  const [toast, setToast] = useState<string | null>(null);

  // Show Toast Helper
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Automatic SMS Sender Helper
  const triggerAutomaticSMS = async (
    type: SMSType,
    phone: string,
    data: any
  ): Promise<boolean> => {
    if (systemConfig?.enableSMS === false) {
      if (type === 'due_reminder') {
        triggerToast('SMS ফিচারটি বন্ধ রয়েছে (সিস্টেম সেটিং থেকে অফ করা)');
      }
      return false;
    }
    if (!phone) {
      triggerToast(t('toast_phone_not_found'));
      return false;
    }
    const message = generateSMSMessage(type, data);
    if (!message) return false;

    // Calculate SMS Cost dynamically based on Unicode standards (encouraging longer messages to consume more balance)
    const isUnicode = /[^\u0000-\u007F]/.test(message);
    const len = message.length;
    let smsCost = 1;
    if (isUnicode) {
      smsCost = len <= 70 ? 1 : Math.ceil(len / 67);
    } else {
      smsCost = len <= 160 ? 1 : Math.ceil(len / 153);
    }

    const currentBalance = systemConfig.smsBalance ?? 50;
    if (currentBalance < smsCost) {
      triggerToast(t('toast_insufficient_sms_balance').replace('{{required}}', smsCost.toString()).replace('{{current}}', currentBalance.toString()));
      return false;
    }

    triggerToast(t('toast_sending_sms'));
    try {
      const res = await sendAutoSMS(phone, message);
      if (res.success) {
        // Deduct SMS counts and increment total sent count in the local database balance
        const newBalance = Math.max(0, currentBalance - smsCost);
        const newTotalSent = (systemConfig.totalSentSms ?? 0) + smsCost;
        const updatedConfig = { ...systemConfig, smsBalance: newBalance, totalSentSms: newTotalSent };
        setSystemConfig(updatedConfig);
        await saveDocumentToFirestore('systemConfig', systemConfig.id, updatedConfig);

        triggerToast(t('toast_sms_sent_success').replace('{{cost}}', smsCost.toString()));
        return true;
      } else {
        triggerToast(t('toast_sms_failed').replace('{{error}}', res.error || 'অজানা ত্রুটি'));
        return false;
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(t('toast_sms_server_error'));
      return false;
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem('lixa_active_user', JSON.stringify(user));
    if (user.role === 'customer') {
      setActiveTab('pending');
    } else if (user.role === 'seller') {
      setActiveTab('pos');
    } else {
      setActiveTab('dashboard');
    }
    const roleText =
      user.role === 'super_admin'
        ? t('super_admin')
        : user.role === 'admin'
        ? t('admin')
        : user.role === 'seller'
        ? t('seller')
        : 'দোকানদার/কাস্টমার';
    triggerToast(t('toast_welcome').replace('{{name}}', user.name).replace('{{role}}', roleText));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('lixa_active_user');
    setActiveTab('dashboard');
    setIsLoginModalOpen(true);
    triggerToast(t('toast_logout'));
  };

  // User Account Management Handlers
  const handleAddUserAccount = async (newAcc: UserAccount, newSeller?: SalesRep) => {
    setUserAccounts((prev) => [newAcc, ...prev]);
    await saveDocumentToFirestore('userAccounts', newAcc.id, newAcc);

    if (newSeller) {
      setSellers((prev) => [newSeller, ...prev]);
      await saveDocumentToFirestore('sellers', newSeller.id, newSeller);
    }

    // If adding a shopkeeper (customer role), also create a Customer record so it appears in POS & Due management
    if (newAcc.role === 'customer') {
      const initialDueVal = Math.max(0, Number(newAcc.initialDue) || 0);
      const newCust: Customer = {
        id: `c_${Date.now()}`,
        name: newAcc.name,
        shopName: newAcc.shopName || newAcc.name,
        address: newAcc.area || 'ঢাকা',
        phone: newAcc.phone || newAcc.loginId,
        assignedSellerId: currentUser?.sellerId || currentUser?.id || '',
        assignedSellerName: currentUser?.name || 'প্রধান শাখা',
        currentDue: initialDueVal,
        creditLimit: 50000,
      };
      setCustomers((prev) => [newCust, ...prev]);
      await saveDocumentToFirestore('customers', newCust.id, newCust);
    }

    triggerToast(t('toast_user_added').replace('{{name}}', newAcc.name).replace('{{role}}', newAcc.role));
  };

  const handleUpdateCustomer = async (updatedCust: Customer, note?: string) => {
    setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
    await saveDocumentToFirestore('customers', updatedCust.id, updatedCust);

    // Sync corresponding userAccount if customer is registered
    const cleanPhone = (updatedCust.phone || '').replace(/\D/g, '');
    setUserAccounts((prev) =>
      prev.map((u) => {
        const uCleanPhone = (u.phone || '').replace(/\D/g, '');
        const matchesPhone = cleanPhone && uCleanPhone && cleanPhone === uCleanPhone;
        const matchesShop = u.shopName && u.shopName.trim().toLowerCase() === (updatedCust.shopName || '').trim().toLowerCase();
        
        if (u.role === 'customer' && (matchesPhone || matchesShop)) {
          const updatedU = {
            ...u,
            name: updatedCust.name,
            shopName: updatedCust.shopName,
            phone: updatedCust.phone,
            area: updatedCust.address,
            initialDue: updatedCust.currentDue,
          };
          saveDocumentToFirestore('userAccounts', u.id, updatedU);
          return updatedU;
        }
        return u;
      })
    );

    if (note) {
      // Customer Due/info update
    }
    triggerToast(`${updatedCust.shopName || updatedCust.name}-এর বকেয়া/তথ্য সফলভাবে সংরক্ষিত হয়েছে`);
  };

  const handleToggleUserStatus = async (userId: string, newStatus: boolean) => {
    setUserAccounts((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: newStatus } : u))
    );
    const target = userAccounts.find((u) => u.id === userId);
    if (target) {
      const updated = { ...target, isActive: newStatus };
      await saveDocumentToFirestore('userAccounts', userId, updated);
      triggerToast(t('toast_user_status_updated').replace('{{name}}', target.name));
    }
  };

  const handleDeleteUserAccount = async (userId: string, linkedCustomerId?: string) => {
    const target = userAccounts.find((u) => u.id === userId);
    const targetCustomer = customers.find((c) => c.id === linkedCustomerId || c.id === userId);

    const targetPhone = normalizePhoneNumber(target?.phone || target?.loginId || targetCustomer?.phone);
    const targetShop = (target?.shopName || targetCustomer?.shopName || '').trim().toLowerCase();
    const targetName = (target?.name || targetCustomer?.name || '').trim().toLowerCase();

    // 1. Identify all matching user accounts (including duplicates or synced copies)
    const usersToDelete = userAccounts.filter((u) => {
      if (u.id === userId) return true;
      if (linkedCustomerId && (u.id === linkedCustomerId || u.id === `usr_sync_${linkedCustomerId}` || u.id === `usr_${linkedCustomerId}`)) return true;
      if (target?.role === 'customer' || targetCustomer) {
        if (u.role === 'customer') {
          const uPhone = normalizePhoneNumber(u.phone || u.loginId);
          const uShop = (u.shopName || '').trim().toLowerCase();
          if (targetPhone && uPhone && targetPhone === uPhone) return true;
          if (targetShop && uShop && targetShop === uShop) return true;
        }
      }
      return false;
    });

    const userIdsSet = new Set(usersToDelete.map((u) => u.id));
    if (userIdsSet.size === 0 && userId) {
      userIdsSet.add(userId);
    }

    // 2. Identify all matching customer records to delete
    const customersToDelete = customers.filter((c) => {
      if (linkedCustomerId && c.id === linkedCustomerId) return true;
      if (c.id === userId || c.id === `c_${userId}` || c.id === `c_sync_${userId}` || userId === `usr_sync_${c.id}`) return true;
      const cPhone = normalizePhoneNumber(c.phone);
      const cShop = (c.shopName || '').trim().toLowerCase();
      const cName = (c.name || '').trim().toLowerCase();

      if (targetPhone && cPhone && targetPhone === cPhone) return true;
      if (targetShop && cShop && targetShop === cShop) return true;
      if (targetName && cName && targetName === cName && targetShop && cShop === targetShop) return true;
      return false;
    });

    const custIdsSet = new Set(customersToDelete.map((c) => c.id));
    const displayName = target?.shopName || targetCustomer?.shopName || target?.name || targetCustomer?.name || 'দোকান/একাউন্ট';

    // 3. Create snapshot and save to trash collection
    const trashEntry: TrashItem = {
      id: `trash_${target?.role === 'customer' || targetCustomer ? 'customer' : 'user'}_${userId}_${Date.now()}`,
      itemType: (target?.role === 'customer' || targetCustomer) ? 'customer' : 'user',
      itemId: userId,
      title: displayName,
      subtitle: `মোবাইল: ${targetPhone || '-'} | ভূমিকা: ${target?.role === 'customer' ? 'দোকান' : target?.role === 'seller' ? 'বিক্রয় প্রতিনিধি' : 'এডমিন'}`,
      details: targetCustomer ? `ঠিকানা: ${targetCustomer.address || '-'}, বকেয়া: ৳${targetCustomer.currentDue}` : `ইউজার আইডি: ${target?.loginId || '-'}`,
      trashedAt: new Date().toISOString(),
      trashedBy: currentUser?.name || 'Admin',
      originalData: {
        userAccounts: usersToDelete,
        customers: customersToDelete,
        seller: (target?.role === 'seller' || target?.sellerId) ? sellers.find(s => s.id === (target.sellerId || target.id)) : undefined,
      },
    };

    await saveDocumentToFirestore('trash', trashEntry.id, trashEntry);
    setTrashItems((prev) => [trashEntry, ...prev]);

    // 4. Delete from userAccounts state and Firestore
    setUserAccounts((prev) => prev.filter((u) => !userIdsSet.has(u.id)));
    for (const uId of userIdsSet) {
      await deleteDocumentFromFirestore('userAccounts', uId);
    }

    // 5. Delete from customers state and Firestore
    if (custIdsSet.size > 0) {
      setCustomers((prev) => prev.filter((c) => !custIdsSet.has(c.id)));
      for (const cId of custIdsSet) {
        await deleteDocumentFromFirestore('customers', cId);
      }
    }

    // 6. If seller, delete from sellers state and Firestore
    if (target?.role === 'seller' || target?.sellerId) {
      const sellerId = target.sellerId || target.id;
      setSellers((prev) => prev.filter((s) => s.id !== sellerId && normalizePhoneNumber(s.phone) !== targetPhone));
      await deleteDocumentFromFirestore('sellers', sellerId);
    }

    triggerToast(`${displayName} ট্র্যাশে পাঠানো হয়েছে (রিস্টোর করা যাবে)`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    // Create snapshot and save to trash collection
    const trashEntry: TrashItem = {
      id: `trash_order_${target.id}_${Date.now()}`,
      itemType: 'order',
      itemId: target.id,
      title: `মেমো #${target.memoNo} - ${target.shopName || target.customerName}`,
      subtitle: `${target.date} | ${target.totalPairs} জোড়া`,
      details: `মোট বিল: ৳${target.grandTotal}, জমা: ৳${target.paidAmount}, বাকি: ৳${target.dueAmount}`,
      trashedAt: new Date().toISOString(),
      trashedBy: currentUser?.name || 'Admin',
      originalData: target,
    };

    await saveDocumentToFirestore('trash', trashEntry.id, trashEntry);
    setTrashItems((prev) => [trashEntry, ...prev]);

    // 1. If the order was already delivered, restore product inventory stock
    if (target.deliveryStatus === 'delivered' && target.items && target.items.length > 0) {
      const updatedProducts = products.map((p) => {
        const orderedItem = target.items.find((i) => i.productId === p.id);
        if (orderedItem) {
          const restoredStock = p.stockPairs + (orderedItem.totalPairs || 0);
          const updatedP = { ...p, stockPairs: restoredStock };
          saveDocumentToFirestore('products', p.id, updatedP);
          return updatedP;
        }
        return p;
      });
      setProducts(updatedProducts);
    }

    // 2. Adjust customer due ONLY if this order was already delivered and has unpaid balance
    if (target.customerId && target.dueAmount > 0 && target.deliveryStatus === 'delivered') {
      const cust = customers.find((c) => c.id === target.customerId);
      if (cust) {
        const adjustedDue = Math.max(0, cust.currentDue - target.dueAmount);
        const updatedC = { ...cust, currentDue: adjustedDue };
        setCustomers((prev) => prev.map((c) => (c.id === cust.id ? updatedC : c)));
        saveDocumentToFirestore('customers', cust.id, updatedC);
      }
    }

    // 3. Remove order from state and Cloud Firestore
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    await deleteDocumentFromFirestore('orders', orderId);
    triggerToast(`মেমো #${target.memoNo} অর্ডারটি ট্র্যাশে পাঠানো হয়েছে (রিস্টোর করা যাবে)`);
  };

  const handleResetPassword = async (userId: string, newPass: string) => {
    setUserAccounts((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
    );
    const target = userAccounts.find((u) => u.id === userId);
    if (target) {
      const updated = { ...target, password: newPass };
      await saveDocumentToFirestore('userAccounts', userId, updated);
      triggerToast(t('toast_password_updated').replace('{{name}}', target.name));
    }
  };

  const handleUpdateSeller = async (updatedSeller: SalesRep) => {
    setSellers((prev) => {
      const exists = prev.some((s) => s.id === updatedSeller.id);
      if (exists) {
        return prev.map((s) => (s.id === updatedSeller.id ? updatedSeller : s));
      }
      return [updatedSeller, ...prev];
    });
    await saveDocumentToFirestore('sellers', updatedSeller.id, updatedSeller);
    triggerToast(t('toast_seller_updated').replace('{{name}}', updatedSeller.name));
  };

  const handleUpdateSystemConfig = async (newConfig: SystemConfig) => {
    setSystemConfig(newConfig);
    await saveDocumentToFirestore('systemConfig', newConfig.id, newConfig);
    triggerToast(t('toast_settings_updated'));
  };

  // Manual Cloud Seed / Refresh Action
  const handleManualSeed = async () => {
    setIsLoadingCloud(true);
    await seedFirestoreData();
    const res = await fetchFirestoreData();
    setProducts(res.products);
    setCustomers(res.customers);
    setSellers(res.sellers);
    setOrders(sortOrdersByRecency(res.orders));
    setPaymentLogs(res.paymentLogs);
    if (res.userAccounts) setUserAccounts(res.userAccounts);
    setIsLoadingCloud(false);
    triggerToast(t('toast_data_reloaded'));
  };

  // 1. Create New Order Handler
  const handleCreateOrder = async (newOrder: Order) => {
    setOrders((prev) => sortOrdersByRecency([newOrder, ...prev.filter((o) => o.id !== newOrder.id)]));
    await saveDocumentToFirestore('orders', newOrder.id, newOrder);

    // If direct sale, deduct stock immediately. If sample booking, stock remains reserved as booked.
    if (newOrder.deliveryStatus === 'delivered') {
      const updatedProducts = products.map((p) => {
        const orderedItem = newOrder.items.find((i) => i.productId === p.id);
        if (orderedItem) {
          const updatedStock = Math.max(0, p.stockPairs - orderedItem.totalPairs);
          const updatedP = { ...p, stockPairs: updatedStock };
          saveDocumentToFirestore('products', p.id, updatedP);
          return updatedP;
        }
        return p;
      });
      setProducts(updatedProducts);
    }

    // Update customer due ONLY if the order is delivered immediately (direct sales memo)
    if (newOrder.deliveryStatus === 'delivered') {
      const updatedCustomers = customers.map((c) => {
        if (c.id === newOrder.customerId) {
          const updatedC = { ...c, currentDue: newOrder.totalNetDue };
          saveDocumentToFirestore('customers', c.id, updatedC);
          return updatedC;
        }
        return c;
      });
      setCustomers(updatedCustomers);
    }

    if (newOrder.deliveryStatus === 'booked') {
      triggerToast(t('toast_order_booked').replace('{{memoNo}}', newOrder.memoNo));
      // Automatically send SMS for booked order
      triggerAutomaticSMS('order_placed', newOrder.customerPhone || '', newOrder);
      // Switch tab to pending list
      setActiveTab('pending');
    } else {
      setSelectedInvoiceOrder(newOrder);
      triggerToast(t('toast_memo_created').replace('{{memoNo}}', newOrder.memoNo));
      // Automatically send SMS for direct delivery/sales memo
      triggerAutomaticSMS('order_delivery', newOrder.customerPhone || '', newOrder);
    }
    setPosPreSelectedCustomerId('');
  };

  // 1.1 Confirm Delivery & Issue Cash Memo for Booked Sample Orders
  const handleConfirmDelivery = async (orderId: string, deliveryData?: ConfirmDeliveryData) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const todayStr = getLocalDateStr(new Date());
    const deliveryDate = deliveryData?.deliveryDate || todayStr;
    const collectedCash = deliveryData ? Math.max(0, deliveryData.collectedAtDelivery) : 0;

    const previousPaid = targetOrder.paidAmount || 0;
    const newTotalPaid = Math.min(targetOrder.grandTotal, previousPaid + collectedCash);
    const newDueAmount = Math.max(0, targetOrder.grandTotal - newTotalPaid);

    let newStatus: 'পরিশোধিত' | 'আংশিক বাকী' | 'সম্পূর্ণ বাকী' = 'পরিশোধিত';
    if (newTotalPaid === 0) {
      newStatus = 'সম্পূর্ণ বাকী';
    } else if (newTotalPaid < targetOrder.grandTotal) {
      newStatus = 'আংশিক বাকী';
    }

    const updatedOrder: Order = {
      ...targetOrder,
      deliveryStatus: 'delivered',
      deliveryDate,
      deliveryPaidAmount: collectedCash,
      deliveryPaymentMethod: deliveryData?.paymentMethod || 'নগদ ক্যাশ',
      deliveryNotes: deliveryData?.notes,
      paidAmount: newTotalPaid,
      dueAmount: newDueAmount,
      status: newStatus,
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setOrders((prev) => sortOrdersByRecency([updatedOrder, ...prev.filter((o) => o.id !== orderId)]));
    await saveDocumentToFirestore('orders', orderId, updatedOrder);

    // Deduct physical stock now
    const updatedProducts = products.map((p) => {
      const orderedItem = updatedOrder.items.find((i) => i.productId === p.id);
      if (orderedItem) {
        const updatedStock = Math.max(0, p.stockPairs - orderedItem.totalPairs);
        const updatedP = { ...p, stockPairs: updatedStock };
        saveDocumentToFirestore('products', p.id, updatedP);
        return updatedP;
      }
      return p;
    });
    setProducts(updatedProducts);

    // Reconcile Customer Due
    // Since the order was not delivered before, its due amount was NOT added to currentDue.
    // We now add the NEW remaining due amount to the customer's total balance.
    if (targetOrder.customerId) {
      const updatedCustomers = customers.map((c) => {
        if (c.id === targetOrder.customerId) {
          const updatedCurrentDue = Math.max(0, (c.currentDue || 0) + newDueAmount);
          const updatedC = { ...c, currentDue: updatedCurrentDue };
          saveDocumentToFirestore('customers', c.id, updatedC);
          return updatedC;
        }
        return c;
      });
      setCustomers(updatedCustomers);
    }

    setSelectedInvoiceOrder(updatedOrder);
    triggerToast(t('toast_delivery_confirmed').replace('{{memoNo}}', updatedOrder.memoNo));

    // Automatically send SMS
    triggerAutomaticSMS('order_delivery', targetOrder.customerPhone || '', updatedOrder);
  };

  // 1.2 Update Pending Order or Sales History Memo (e.g. add/remove items, adjust price or commission)
  const handleUpdateOrder = async (updatedOrder: Order) => {
    const previousOrder = orders.find((o) => o.id === updatedOrder.id);

    // If order was already delivered, adjust physical inventory differences
    if (previousOrder && previousOrder.deliveryStatus === 'delivered') {
      const productPairDiffs: Record<string, number> = {};
      (previousOrder.items || []).forEach((it) => {
        productPairDiffs[it.productId] = (productPairDiffs[it.productId] || 0) - (it.totalPairs || 0);
      });
      (updatedOrder.items || []).forEach((it) => {
        productPairDiffs[it.productId] = (productPairDiffs[it.productId] || 0) + (it.totalPairs || 0);
      });

      let stockModified = false;
      const updatedProducts = products.map((p) => {
        const diff = productPairDiffs[p.id];
        if (diff !== undefined && diff !== 0) {
          stockModified = true;
          const newStock = Math.max(0, p.stockPairs - diff);
          const updatedP = { ...p, stockPairs: newStock };
          saveDocumentToFirestore('products', p.id, updatedP);
          return updatedP;
        }
        return p;
      });
      if (stockModified) {
        setProducts(updatedProducts);
      }
    }

    setOrders((prev) => sortOrdersByRecency([updatedOrder, ...prev.filter((o) => o.id !== updatedOrder.id)]));
    await saveDocumentToFirestore('orders', updatedOrder.id, updatedOrder);

    // Update customer due ONLY if the order is delivered
    if (updatedOrder.deliveryStatus === 'delivered') {
      const updatedCustomers = customers.map((c) => {
        if (c.id === updatedOrder.customerId) {
          const updatedC = { ...c, currentDue: updatedOrder.totalNetDue };
          saveDocumentToFirestore('customers', c.id, updatedC);
          return updatedC;
        }
        return c;
      });
      setCustomers(updatedCustomers);
    }

    triggerToast(t('toast_order_updated').replace('{{memoNo}}', updatedOrder.memoNo));
  };

  // 2. Record Due Payment Handler
  const handleRecordPayment = async (newLog: DuePaymentLog) => {
    setPaymentLogs((prev) => [newLog, ...prev]);
    await saveDocumentToFirestore('paymentLogs', newLog.id, newLog);

    const updatedCustomers = customers.map((c) => {
      if (c.id === newLog.customerId) {
        const updatedC = { ...c, currentDue: newLog.remainingDue };
        saveDocumentToFirestore('customers', c.id, updatedC);
        return updatedC;
      }
      return c;
    });
    setCustomers(updatedCustomers);

    triggerToast(t('toast_payment_updated').replace('{{amount}}', newLog.amountPaid.toLocaleString('bn-BD')));

    const targetCust = customers.find((c) => c.id === newLog.customerId);
    if (targetCust) {
      // Automatically send SMS
      triggerAutomaticSMS('payment_received', targetCust.phone, newLog);
    }
  };

  // 3. Add New Product Handler
  const handleAddProduct = async (newProduct: ShoeProduct) => {
    setProducts((prev) => [newProduct, ...prev]);
    await saveDocumentToFirestore('products', newProduct.id, newProduct);
    triggerToast(t('toast_product_added').replace('{{articleCode}}', newProduct.articleCode));
  };

  // 4. Restock Product Handler
  const handleRestockProduct = async (productId: string, addedPairs: number) => {
    let updatedTarget: ShoeProduct | null = null;
    const updatedProducts = products.map((p) => {
      if (p.id === productId) {
        const updatedP = { ...p, stockPairs: p.stockPairs + addedPairs };
        updatedTarget = updatedP;
        return updatedP;
      }
      return p;
    });
    setProducts(updatedProducts);
    if (updatedTarget) {
      await saveDocumentToFirestore('products', productId, updatedTarget);
    }
    
    if (addedPairs > 0) {
      triggerToast(t('toast_stock_added').replace('{{pairs}}', addedPairs.toString()));
    } else if (addedPairs < 0) {
      triggerToast(`${Math.abs(addedPairs)} জোড়া সফলভাবে কমানো হয়েছে`);
    } else {
      triggerToast(`স্টক অপরিবর্তিত`);
    }
  };

  // 5. Update Product Handler
  const handleUpdateProduct = async (updatedProduct: ShoeProduct) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    await saveDocumentToFirestore('products', updatedProduct.id, updatedProduct);
    triggerToast(t('toast_product_updated').replace('{{articleCode}}', updatedProduct.articleCode));
  };

  // 6. Delete Product Handler (Soft delete to trash)
  const handleDeleteProduct = async (productId: string) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const trashEntry: TrashItem = {
      id: `trash_product_${target.id}_${Date.now()}`,
      itemType: 'product',
      itemId: target.id,
      title: `${target.articleCode} - ${target.name}`,
      subtitle: `স্টক: ${target.stockPairs} জোড়া | বিক্রয় মূল্য: ৳${target.sellPrice}`,
      details: `ক্যাটাগরি: ${target.category}, ক্রয় মূল্য: ৳${target.buyPrice}`,
      trashedAt: new Date().toISOString(),
      trashedBy: currentUser?.name || 'Admin',
      originalData: target,
    };

    await saveDocumentToFirestore('trash', trashEntry.id, trashEntry);
    setTrashItems((prev) => [trashEntry, ...prev]);

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    await deleteDocumentFromFirestore('products', productId);
    triggerToast(`পণ্য ${target.articleCode} ট্র্যাশে পাঠানো হয়েছে (রিস্টোর করা যাবে)`);
  };

  // Trash restoration & permanent delete handlers
  const handleRestoreItem = async (item: TrashItem) => {
    try {
      if (item.itemType === 'order') {
        const orderData: Order = item.originalData;
        await saveDocumentToFirestore('orders', orderData.id, orderData);
        setOrders((prev) => sortOrdersByRecency([orderData, ...prev.filter((o) => o.id !== orderData.id)]));
      } else if (item.itemType === 'product') {
        const productData: ShoeProduct = item.originalData;
        await saveDocumentToFirestore('products', productData.id, productData);
        setProducts((prev) => [productData, ...prev.filter((p) => p.id !== productData.id)]);
      } else if (item.itemType === 'customer' || item.itemType === 'user') {
        const snap = item.originalData;
        if (snap.userAccounts && Array.isArray(snap.userAccounts)) {
          for (const u of snap.userAccounts) {
            await saveDocumentToFirestore('userAccounts', u.id, u);
          }
          setUserAccounts((prev) => [
            ...prev.filter((u) => !snap.userAccounts.some((su: any) => su.id === u.id)),
            ...snap.userAccounts,
          ]);
        }
        if (snap.customers && Array.isArray(snap.customers)) {
          for (const c of snap.customers) {
            await saveDocumentToFirestore('customers', c.id, c);
          }
          setCustomers((prev) => [
            ...prev.filter((c) => !snap.customers.some((sc: any) => sc.id === c.id)),
            ...snap.customers,
          ]);
        }
        if (snap.seller) {
          await saveDocumentToFirestore('sellers', snap.seller.id, snap.seller);
          setSellers((prev) => [...prev.filter((s) => s.id !== snap.seller.id), snap.seller]);
        }
      }

      // Remove from trash
      await deleteDocumentFromFirestore('trash', item.id);
      setTrashItems((prev) => prev.filter((t) => t.id !== item.id));
      triggerToast(`${item.title} সফলভাবে রিস্টোর করা হয়েছে!`);
    } catch (err) {
      console.error('Error restoring item:', err);
      triggerToast('রিস্টোর করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handlePermanentDeleteItem = async (trashId: string) => {
    try {
      await deleteDocumentFromFirestore('trash', trashId);
      setTrashItems((prev) => prev.filter((t) => t.id !== trashId));
      triggerToast('ট্র্যাশ থেকে স্থায়ীভাবে ডিলিট করা হয়েছে');
    } catch (err) {
      console.error('Error permanently deleting:', err);
      triggerToast('মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      for (const item of trashItems) {
        await deleteDocumentFromFirestore('trash', item.id);
      }
      setTrashItems([]);
      triggerToast('ট্র্যাশ সফলভাবে সম্পূর্ণ খালি করা হয়েছে');
    } catch (err) {
      console.error('Error emptying trash:', err);
    }
  };

  const handleRestoreAll = async () => {
    try {
      for (const item of trashItems) {
        await handleRestoreItem(item);
      }
      setTrashItems([]);
      triggerToast('ট্র্যাশের সমস্ত আইটেম সফলভাবে রিস্টোর করা হয়েছে!');
    } catch (err) {
      console.error('Error restoring all:', err);
    }
  };

  // 7. Quick Add Customer Handler
  const handleQuickAddCustomer = async (newCust: Customer) => {
    setCustomers((prev) => [newCust, ...prev]);
    await saveDocumentToFirestore('customers', newCust.id, newCust);

    // Also create UserAccount so the shop appears under "নিবন্ধিত দোকান" in User Management
    const phoneVal = newCust.phone?.trim() || '';
    const phoneClean = phoneVal.replace(/\D/g, '');
    const existingUser = userAccounts.find(
      (u) =>
        (phoneClean && (
          (u.phone && (u.phone || "").replace(/\D/g, '') === phoneClean) ||
          (u.loginId || "").replace(/\D/g, '') === phoneClean
        )) ||
        (u.shopName && (u.shopName || "").trim().toLowerCase() === (newCust.shopName || "").trim().toLowerCase())
    );

    if (!existingUser) {
      const isOffline = !phoneVal;
      const newUserAcc: UserAccount = {
        id: `usr_${Date.now()}`,
        name: newCust.name,
        shopName: newCust.shopName,
        loginId: isOffline ? '' : phoneVal,
        password: isOffline ? '—' : '123456',
        role: 'customer',
        phone: phoneVal,
        area: newCust.address,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
        isOffline: isOffline,
      };
      setUserAccounts((prev) => [newUserAcc, ...prev]);
      await saveDocumentToFirestore('userAccounts', newUserAcc.id, newUserAcc);
    }

    triggerToast(t('toast_customer_added').replace('{{shopName}}', newCust.shopName));
  };

  const [posPreSelectedCustomerId, setPosPreSelectedCustomerId] = useState<string>('');

  const handleAddShop = async (newCust: Customer, newAcc: UserAccount) => {
    setCustomers((prev) => [newCust, ...prev]);
    await saveDocumentToFirestore('customers', newCust.id, newCust);

    setUserAccounts((prev) => [newAcc, ...prev]);
    await saveDocumentToFirestore('userAccounts', newAcc.id, newAcc);

    triggerToast(`নতুন দোকান "${newCust.shopName}" সফলভাবে নিবন্ধিত হয়েছে!`);
  };

  const handleUpdateShop = async (updatedCust: Customer, updatedAcc?: UserAccount) => {
    await handleUpdateCustomer(updatedCust);
    if (updatedAcc) {
      setUserAccounts((prev) => prev.map((u) => (u.id === updatedAcc.id ? updatedAcc : u)));
      await saveDocumentToFirestore('userAccounts', updatedAcc.id, updatedAcc);
    }
  };

  const activeTheme = UI_THEMES[0];

  // Helper functions to filter visible data based on current user role and permissions
  const getVisibleOrders = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'customer') {
      const userPhoneDigits = (currentUser.phone || currentUser.loginId || '').replace(/\D/g, '');
      const userShopLower = (currentUser.shopName || currentUser.name || '').toLowerCase().trim();

      return orders.filter((o) => {
        const oPhoneDigits = (o.phone || o.customerPhone || '').replace(/\D/g, '');
        const oShopLower = (o.shopName || '').toLowerCase().trim();

        const phoneMatch = Boolean(
          userPhoneDigits &&
          oPhoneDigits &&
          userPhoneDigits.length >= 6 &&
          oPhoneDigits.length >= 6 &&
          (userPhoneDigits.endsWith(oPhoneDigits) || oPhoneDigits.endsWith(userPhoneDigits))
        );

        const shopMatch = Boolean(
          userShopLower &&
          oShopLower &&
          (userShopLower === oShopLower || userShopLower.includes(oShopLower) || oShopLower.includes(userShopLower))
        );

        return phoneMatch || shopMatch;
      });
    }
    if (currentUser.role === 'seller' && systemConfig && !systemConfig.allowSellerToSeeOtherSellersSales) {
      return orders.filter(o => o.sellerId === currentUser.sellerId || !o.isClaimed || !o.sellerId || o.sellerName.includes('উন্মুক্ত'));
    }
    return orders;
  };

  const getVisibleCustomers = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'seller' && systemConfig && !systemConfig.allowSellerToSeeOtherSellersDue) {
      const sId = currentUser.sellerId || currentUser.id;
      return customers.filter(
        (c) =>
          c.assignedSellerId === sId ||
          c.assignedSellerId === currentUser.id ||
          c.assignedSellerId === currentUser.sellerId ||
          !c.assignedSellerId ||
          c.assignedSellerName === currentUser.name
      );
    }
    return customers;
  };

  const getVisiblePaymentLogs = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'seller' && systemConfig && !systemConfig.allowSellerToSeeOtherSellersDue) {
      return paymentLogs.filter(
        log =>
          log.sellerId === currentUser.sellerId ||
          log.sellerId === currentUser.id ||
          log.receivedBy === currentUser.name
      );
    }
    return paymentLogs;
  };

  // Combine dedicated sales reps + Admin & Sellers from userAccounts, excluding developer/super_admin
  const allSellers = useMemo(() => {
    const list: SalesRep[] = [...sellers].filter(
      (s) =>
        s.role !== 'super_admin' &&
        !s.name.includes('সুপার এডমিন') &&
        !s.area?.includes('সুপার এডমিন')
    );

    // Include all admin and seller staff accounts from userAccounts
    const staffAccounts = userAccounts.filter((u) => u.role === 'admin' || u.role === 'seller');

    staffAccounts.forEach((staffUser) => {
      const staffPhone = staffUser.phone || staffUser.loginId || '';
      const staffName = (staffUser.name || '').trim().toLowerCase();

      const existingIndex = list.findIndex(
        (s) =>
          (staffUser.sellerId && s.id === staffUser.sellerId) ||
          s.id === staffUser.id ||
          (staffPhone && s.phone && s.phone === staffPhone) ||
          (s.name && s.name.trim().toLowerCase() === staffName)
      );

      if (existingIndex === -1) {
        list.push({
          id: staffUser.sellerId || staffUser.id,
          name: staffUser.name,
          phone: staffPhone,
          area: staffUser.area || (staffUser.role === 'admin' ? 'প্রধান শাখা (এডমিন ও সেলার)' : 'ফিল্ড সেলস'),
          monthlyTargetPairs: 1000,
          monthlyTargetAmount: 0,
          commissionRatePercent: 0,
          role: staffUser.role,
          isAdmin: staffUser.role === 'admin',
        });
      } else {
        // Sync role and admin flag if needed
        list[existingIndex] = {
          ...list[existingIndex],
          role: staffUser.role,
          isAdmin: staffUser.role === 'admin' || list[existingIndex].isAdmin,
          phone: list[existingIndex].phone || staffPhone,
          area: list[existingIndex].area || staffUser.area || '',
        };
      }
    });

    return list;
  }, [sellers, userAccounts]);

  const dueAlertCount = getVisibleCustomers().filter((c) => c.currentDue > 0).length;
  const lowStockCount = products.filter((p) => p.stockPairs <= p.minStockAlert).length;
  const pendingOrdersCount = getVisibleOrders().filter((o) => o.deliveryStatus === 'booked').length;

  const handleClaimOrder = async (orderId: string) => {
    if (!currentUser) return;
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const sellerId = currentUser.sellerId || currentUser.id;
    const sellerName = currentUser.name;

    const updatedOrder: Order = {
      ...targetOrder,
      sellerId,
      sellerName,
      isClaimed: true,
    };

    const updatedOrders = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    setOrders(updatedOrders);
    await saveDocumentToFirestore('orders', orderId, updatedOrder);

    if (targetOrder.customerId) {
      const cust = customers.find((c) => c.id === targetOrder.customerId);
      if (cust && (!cust.assignedSellerId || cust.assignedSellerId === '' || cust.assignedSellerId === 'UNASSIGNED')) {
        const updatedCust: Customer = {
          ...cust,
          assignedSellerId: sellerId,
          assignedSellerName: sellerName,
        };
        setCustomers((prev) => prev.map((c) => (c.id === cust.id ? updatedCust : c)));
        await saveDocumentToFirestore('customers', cust.id, updatedCust);
      }
    }

    triggerToast(`বুকিং মেমো #${targetOrder.memoNo} আপনার আন্ডারে গ্রহণ (ক্লেইম) করা হয়েছে`);
  };

  const handleRegisterShopkeeper = async (data: {
    shopName: string;
    name: string;
    phone: string;
    address: string;
    password?: string;
  }): Promise<UserAccount> => {
    const cleanPhone = data.phone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');

    // 1. Check if Customer record exists in customers state
    let targetCustomer = customers.find(
      (c) =>
        (c.phone && (c.phone || "").replace(/\D/g, '') === phoneDigits) ||
        (c.shopName && (c.shopName || "").trim().toLowerCase() === (data.shopName || "").trim().toLowerCase())
    );

    if (targetCustomer) {
      // Auto sync existing customer record
      const updatedCust: Customer = {
        ...targetCustomer,
        shopName: data.shopName.trim() || targetCustomer.shopName,
        name: data.name.trim() || targetCustomer.name,
        address: data.address.trim() || targetCustomer.address,
        phone: cleanPhone || targetCustomer.phone,
      };
      targetCustomer = updatedCust;
      setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
      await saveDocumentToFirestore('customers', updatedCust.id, updatedCust);
    } else {
      // Create new customer record so it lists under "নিবন্ধিত দোকান" (Registered Shops)
      targetCustomer = {
        id: `CUST-${Date.now().toString().slice(-6)}`,
        name: data.name.trim(),
        shopName: data.shopName.trim(),
        address: data.address.trim() || 'ঢাকা',
        phone: cleanPhone,
        assignedSellerId: '',
        assignedSellerName: 'অনলাইন রেজিস্ট্রেশন',
        currentDue: 0,
        creditLimit: 50000,
      };
      setCustomers((prev) => [targetCustomer!, ...prev]);
      await saveDocumentToFirestore('customers', targetCustomer.id, targetCustomer);
    }

    // 2. Check if UserAccount exists in userAccounts state
    let existingUser = userAccounts.find(
      (u) =>
        (u.phone && (u.phone || "").replace(/\D/g, '') === phoneDigits) ||
        (u.loginId || "").replace(/\D/g, '') === phoneDigits ||
        (u.shopName && (u.shopName || "").trim().toLowerCase() === (data.shopName || "").trim().toLowerCase())
    );

    let targetUser: UserAccount;
    if (existingUser) {
      // Auto sync existing user account with password & details
      targetUser = {
        ...existingUser,
        name: data.name.trim() || existingUser.name,
        shopName: data.shopName.trim() || existingUser.shopName,
        phone: cleanPhone || existingUser.phone,
        area: data.address.trim() || existingUser.area,
        password: data.password ? data.password.trim() : existingUser.password,
        role: 'customer',
        isActive: true,
      };
      setUserAccounts((prev) => prev.map((u) => (u.id === targetUser.id ? targetUser : u)));
      await saveDocumentToFirestore('userAccounts', targetUser.id, targetUser);
    } else {
      // Create new UserAccount for the shopkeeper
      targetUser = {
        id: `USER-${Date.now().toString().slice(-6)}`,
        name: data.name.trim(),
        shopName: data.shopName.trim(),
        loginId: cleanPhone,
        password: data.password ? data.password.trim() : '123456',
        role: 'customer',
        phone: cleanPhone,
        area: data.address.trim() || 'ঢাকা',
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUserAccounts((prev) => [targetUser, ...prev]);
      await saveDocumentToFirestore('userAccounts', targetUser.id, targetUser);
    }

    triggerToast(`${targetUser.shopName || targetUser.name} - দোকান রেজিস্ট্রেশন ও সিংক সম্পূর্ণ!`);
    return targetUser;
  };

  return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-12 selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200">
        
        {/* Login Screen Modal Overlay if requested or not logged in */}
        {(!currentUser && isLoginModalOpen) && (
          <Suspense fallback={null}>
            <LoginModal
              userAccounts={userAccounts}
              onLoginSuccess={(user) => {
                handleLoginSuccess(user);
                setIsLoginModalOpen(false);
              }}
              onRegisterShopkeeper={handleRegisterShopkeeper}
              onClose={() => setIsLoginModalOpen(false)}
            />
          </Suspense>
        )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-white dark:bg-slate-900 border border-amber-500 text-slate-900 dark:text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {selectedInvoiceOrder && (
        <Suspense fallback={null}>
          <InvoiceModal
            order={selectedInvoiceOrder}
            onClose={() => setSelectedInvoiceOrder(null)}
          />
        </Suspense>
      )}

      {/* Desktop Sidebar & Main Content Layout */}
      <div className="flex flex-col md:flex-row min-h-screen w-full">
        {/* Desktop Left Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (!currentUser) {
              setIsLoginModalOpen(true);
              return;
            }
            if (tab === 'pos') {
              setPosPreSelectedCustomerId('');
            }
            setActiveTab(tab);
          }}
          currentUser={currentUser}
          currentUserRole={currentUser?.role || 'customer'}
          onLogout={handleLogout}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          dueAlertCount={dueAlertCount}
          lowStockCount={lowStockCount}
          pendingOrdersCount={pendingOrdersCount}
          trashCount={trashItems.length}
          systemConfig={systemConfig}
          onInstallPWA={handleInstallPWA}
          canInstallPWA={canInstallPWA}
        />

        {/* Main Content Area (Header + Content) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Header Bar */}
          <Header
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onManualSeed={handleManualSeed}
            isLoadingCloud={isLoadingCloud}
            activeTab={activeTab}
            onSelectTab={(tab) => {
              if (tab === 'pos') {
                setPosPreSelectedCustomerId('');
              }
              setActiveTab(tab);
            }}
            dueAlertCount={dueAlertCount}
            lowStockCount={lowStockCount}
            pendingOrdersCount={pendingOrdersCount}
            trashCount={trashItems.length}
            currentUserRole={currentUser?.role || 'customer'}
            systemConfig={systemConfig}
            onInstallPWA={handleInstallPWA}
            canInstallPWA={canInstallPWA}
          />

          {/* Navigation Bar (Mobile only, hidden on desktop) */}
          <Navigation
            activeTab={activeTab}
            onSelectTab={(tab) => {
              if (!currentUser) {
                setIsLoginModalOpen(true);
                return;
              }
              if (tab === 'pos') {
                setPosPreSelectedCustomerId('');
              }
              setActiveTab(tab);
            }}
            activeTheme={activeTheme}
            dueAlertCount={dueAlertCount}
            lowStockCount={lowStockCount}
            pendingOrdersCount={pendingOrdersCount}
            currentUserRole={currentUser?.role || 'customer'}
          />

          {/* Main Content View */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 md:pb-12">
            <Suspense fallback={<TabLoadingFallback />}>
        
        {activeTab === 'dashboard' && (
          <Dashboard
            orders={getVisibleOrders()}
            products={products}
            customers={getVisibleCustomers()}
            paymentLogs={getVisiblePaymentLogs()}
            currentUser={currentUser}
            systemConfig={systemConfig}
            onNavigate={setActiveTab}
            onSelectOrderForInvoice={setSelectedInvoiceOrder}
          />
        )}

        {activeTab === 'shops' && currentUser && (
          <ShopManagement
            currentUser={currentUser}
            customers={customers}
            userAccounts={userAccounts}
            sellers={allSellers}
            orders={orders}
            activeTheme={activeTheme}
            systemConfig={systemConfig}
            onAddShop={handleAddShop}
            onUpdateShop={handleUpdateShop}
            onDeleteShop={handleDeleteUserAccount}
            onNavigateToPos={(customerId) => {
              setPosPreSelectedCustomerId(customerId);
              setActiveTab('pos');
            }}
          />
        )}

        {activeTab === 'pos' && (
          <PosOrderBuilder
            products={products}
            customers={getVisibleCustomers()}
            sellers={allSellers}
            currentUser={currentUser}
            activeTheme={activeTheme}
            systemConfig={systemConfig}
            preSelectedCustomerId={posPreSelectedCustomerId}
            onCreateOrder={handleCreateOrder}
            onQuickAddCustomer={handleQuickAddCustomer}
          />
        )}

        {activeTab === 'pending' && (
          <PendingOrders
            orders={getVisibleOrders()}
            products={products}
            activeTheme={activeTheme}
            onSelectOrderForInvoice={setSelectedInvoiceOrder}
            onConfirmDelivery={handleConfirmDelivery}
            onUpdateOrder={handleUpdateOrder}
            onClaimOrder={handleClaimOrder}
            onDeleteOrder={handleDeleteOrder}
            currentUserRole={currentUser?.role || 'customer'}
          />
        )}

        {activeTab === 'stock' && (
          <StockManagement
            products={products}
            orders={getVisibleOrders()}
            activeTheme={activeTheme}
            currentUser={currentUser}
            systemConfig={systemConfig}
            onAddProduct={handleAddProduct}
            onRestockProduct={handleRestockProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'due' && (
          <DueManagement
            customers={getVisibleCustomers()}
            sellers={allSellers}
            paymentLogs={getVisiblePaymentLogs()}
            activeTheme={activeTheme}
            currentUser={currentUser}
            onRecordPayment={handleRecordPayment}
            onUpdateCustomer={handleUpdateCustomer}
            onTriggerSMS={async (type, phone, name, shopName, data, customerId) => {
              // Automatically send SMS directly and get success status
              const success = await triggerAutomaticSMS(type, phone, data);

              // If the reminder is successfully sent, update customer's last reminder date in state and Cloud Firestore
              if (success && type === 'due_reminder' && customerId) {
                const todayStr = new Date().toISOString().split('T')[0];
                const updatedCustomers = customers.map((c) => {
                  if (c.id === customerId) {
                    const updatedC = { ...c, lastDueReminderDate: todayStr };
                    saveDocumentToFirestore('customers', c.id, updatedC);
                    return updatedC;
                  }
                  return c;
                });
                setCustomers(updatedCustomers);
              }

              return success;
            }}
          />
        )}

        {activeTab === 'sales' && (
          <SalesHistory
            orders={getVisibleOrders()}
            products={products}
            activeTheme={activeTheme}
            onSelectOrderForInvoice={setSelectedInvoiceOrder}
            onConfirmDelivery={handleConfirmDelivery}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            currentUserRole={currentUser?.role || 'customer'}
            onNavigate={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'reports' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
          <Reports
            orders={getVisibleOrders()}
            products={products}
            sellers={allSellers}
            customers={getVisibleCustomers()}
            activeTheme={activeTheme}
          />
        )}

        {activeTab === 'users' && currentUser && (
          <div className="space-y-8">
            <UserManagement
              currentUser={currentUser}
              userAccounts={userAccounts}
              sellers={allSellers}
              customers={getVisibleCustomers()}
              activeTheme={activeTheme}
              systemConfig={systemConfig}
              onUpdateSystemConfig={handleUpdateSystemConfig}
              onAddUserAccount={handleAddUserAccount}
              onToggleUserStatus={handleToggleUserStatus}
              onResetPassword={handleResetPassword}
              onUpdateSeller={handleUpdateSeller}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteUserAccount={handleDeleteUserAccount}
            />
          </div>
        )}

        {activeTab === 'seller-tracking' && currentUser && (
          <SellerTracking
            sellers={allSellers}
            orders={orders}
            customers={customers}
            paymentLogs={paymentLogs}
            currentUser={currentUser}
            onUpdateSeller={handleUpdateSeller}
          />
        )}

        {activeTab === 'features' && currentUser && (
          <FeatureManagement
            currentUser={currentUser}
            systemConfig={systemConfig}
            activeTheme={activeTheme}
            onUpdateSystemConfig={handleUpdateSystemConfig}
            onNavigateToReports={() => setActiveTab('reports')}
          />
        )}

        {activeTab === 'sms' && currentUser && (
          systemConfig?.enableSMS === false ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3 max-w-lg mx-auto my-8">
              <h3 className="text-base font-bold text-white">SMS ফিচারটি বন্ধ রয়েছে</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                সুপার এডমিন ফিচার ম্যানেজমেন্ট থেকে অটোমেটিক SMS ও SMS প্যানেল সার্ভিস নিষ্ক্রিয় করে রেখেছেন। প্রয়োজন অনুযায়ী ফিচার ম্যানেজমেন্ট (Features) থেকে এটি পুনরায় চালু করা যাবে।
              </p>
            </div>
          ) : (
            <SMSPanel
              activeTheme={activeTheme}
              currentUser={currentUser}
              systemConfig={systemConfig}
              onUpdateSystemConfig={handleUpdateSystemConfig}
            />
          )
        )}

        {activeTab === 'trash' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin' || systemConfig?.allowSellerToManageUsers) && (
          <TrashManagement
            trashItems={trashItems}
            currentUser={currentUser}
            onRestoreItem={handleRestoreItem}
            onPermanentDeleteItem={handlePermanentDeleteItem}
            onRestoreAll={handleRestoreAll}
            onEmptyTrash={handleEmptyTrash}
          />
        )}

        </Suspense>
      </main>
        </div>
      </div>

    </div>
  );
}

