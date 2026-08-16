import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoeProduct,
  Customer,
  SalesRep,
  Order,
  DuePaymentLog,
  UserAccount,
  SystemConfig,
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
import { Dashboard } from './components/Dashboard';
import { PosOrderBuilder } from './components/PosOrderBuilder';
import { InvoiceModal } from './components/InvoiceModal';
import { StockManagement } from './components/StockManagement';
import { DueManagement } from './components/DueManagement';
import { SalesHistory } from './components/SalesHistory';
import { PendingOrders } from './components/PendingOrders';
import { LoginModal } from './components/LoginModal';
import { CustomerStorefront } from './components/CustomerStorefront';
import { UserManagement } from './components/UserManagement';
import { FeatureManagement } from './components/FeatureManagement';
import { SellerTracking } from './components/SellerTracking';
import { SMSPanel } from './components/SMSPanel';
import { Reports } from './components/Reports';
import { fetchFirestoreData, seedFirestoreData, saveDocumentToFirestore, deleteDocumentFromFirestore, clearAllDatabaseData } from './lib/firestoreService';
import { generateSMSMessage, sendAutoSMS, SMSType } from './utils/smsService';
import { OrderItem, AppNotification } from './types';

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
    if (!currentUser || currentUser.role === 'customer') return 'catalog';
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

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('jannat_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'notif-welcome',
        title: 'জান্নাত সুজ সিস্টেমে স্বাগতম',
        message: 'অনলাইন অর্ডার বুকিং, কাস্টম রিপোর্ট ও নোটিফিকেশন সিস্টেম সক্রিয় আছে।',
        createdAt: new Date().toISOString(),
        read: false,
        type: 'broadcast',
      },
    ];
  });

  const saveNotifications = (newNotifs: AppNotification[]) => {
    setNotifications(newNotifs);
    try {
      localStorage.setItem('jannat_notifications', JSON.stringify(newNotifs));
    } catch (e) {
      console.error(e);
    }
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const item: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    saveNotifications([item, ...notifications]);
  };

  const handleMarkNotificationAsRead = (id: string) => {
    saveNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllNotificationsAsRead = () => {
    saveNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    saveNotifications([]);
  };

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
    return [...ordersList].sort((a, b) => {
      const keyA = `${a.date || ''} ${a.time || ''} ${a.memoNo || a.id}`;
      const keyB = `${b.date || ''} ${b.time || ''} ${b.memoNo || b.id}`;
      return keyB.localeCompare(keyA);
    });
  };

  const handleClearDatabase = async () => {
    await clearAllDatabaseData();
    setProducts([]);
    setCustomers([]);
    setSellers([]);
    setOrders([]);
    setPaymentLogs([]);
    triggerToast('ডাটাবেজের সকল ডেমো ডাটা সফলভাবে ক্লিয়ার করা হয়েছে!');
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

        // Bi-directional sync between customers and userAccounts
        const syncAccs = [...accounts];
        const syncCusts = [...(res.customers || [])];
        let accsUpdated = false;
        let custsUpdated = false;

        syncCusts.forEach((c) => {
          const cPhone = (c.phone || '').replace(/\D/g, '');
          const exists = syncAccs.some(
            (u) =>
              (u.phone && (u.phone || "").replace(/\D/g, '') === cPhone) ||
              (u.loginId || "").replace(/\D/g, '') === cPhone ||
              (u.shopName && (u.shopName || "").trim().toLowerCase() === (c.shopName || "").trim().toLowerCase())
          );
          if (!exists) {
            const newU: UserAccount = {
              id: `usr_sync_${c.id}`,
              name: c.name,
              shopName: c.shopName,
              loginId: c.phone || `017${Math.floor(10000000 + Math.random() * 90000000)}`,
              password: '123456',
              role: 'customer',
              phone: c.phone,
              area: c.address,
              isActive: true,
              createdAt: new Date().toISOString().split('T')[0],
            };
            syncAccs.push(newU);
            saveDocumentToFirestore('userAccounts', newU.id, newU);
            accsUpdated = true;
          }
        });

        syncAccs.forEach((u) => {
          if (u.role === 'customer') {
            const uPhone = (u.phone || u.loginId || '').replace(/\D/g, '');
            const exists = syncCusts.some(
              (c) =>
                (c.phone && (c.phone || "").replace(/\D/g, '') === uPhone) ||
                (u.shopName && (c.shopName || "").trim().toLowerCase() === (u.shopName || "").trim().toLowerCase())
            );
            if (!exists) {
              const newC: Customer = {
                id: `c_sync_${u.id}`,
                name: u.name,
                shopName: u.shopName || u.name,
                address: u.area || 'ঢাকা',
                phone: u.phone || u.loginId,
                assignedSellerId: u.sellerId || '',
                assignedSellerName: 'প্রধান শাখা',
                currentDue: 0,
                creditLimit: 50000,
              };
              syncCusts.push(newC);
              saveDocumentToFirestore('customers', newC.id, newC);
              custsUpdated = true;
            }
          }
        });

        if (custsUpdated) setCustomers(syncCusts);
        setUserAccounts(syncAccs);
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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

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
      setActiveTab('catalog');
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
    setActiveTab('catalog');
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
      const newCust: Customer = {
        id: `c_${Date.now()}`,
        name: newAcc.name,
        shopName: newAcc.shopName || newAcc.name,
        address: newAcc.area || 'ঢাকা',
        phone: newAcc.phone || newAcc.loginId,
        assignedSellerId: currentUser?.sellerId || currentUser?.id || '',
        assignedSellerName: currentUser?.name || 'প্রধান শাখা',
        currentDue: 0,
        creditLimit: 50000,
      };
      setCustomers((prev) => [newCust, ...prev]);
      await saveDocumentToFirestore('customers', newCust.id, newCust);
    }

    triggerToast(t('toast_user_added').replace('{{name}}', newAcc.name).replace('{{role}}', newAcc.role));
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

  const handleDeleteUserAccount = async (userId: string) => {
    const target = userAccounts.find((u) => u.id === userId);
    if (!target) return;
    setUserAccounts((prev) => prev.filter((u) => u.id !== userId));
    await deleteDocumentFromFirestore('userAccounts', userId);
    triggerToast(`${target.name} একাউন্টটি সফলভাবে রিমুভ করা হয়েছে`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    await deleteDocumentFromFirestore('orders', orderId);
    triggerToast(`মেমো #${target.memoNo} অর্ডারটি সফলভাবে রিমুভ করা হয়েছে`);
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

    // Update customer due
    const updatedCustomers = customers.map((c) => {
      if (c.id === newOrder.customerId) {
        const updatedC = { ...c, currentDue: newOrder.totalNetDue };
        saveDocumentToFirestore('customers', c.id, updatedC);
        return updatedC;
      }
      return c;
    });
    setCustomers(updatedCustomers);

    if (newOrder.deliveryStatus === 'booked') {
      triggerToast(t('toast_order_booked').replace('{{memoNo}}', newOrder.memoNo));
      // Automatically send SMS for booked order
      triggerAutomaticSMS('order_placed', newOrder.customerPhone || '', newOrder);
      addNotification({
        title: 'নতুন বুকিং অর্ডার',
        message: `মেমো #${newOrder.memoNo} - ${newOrder.shopName || newOrder.customerName} (${newOrder.totalPairs} জোড়া, মোট: ৳${newOrder.grandTotal.toLocaleString('bn-BD')})`,
        type: 'order_booking',
      });
      // Switch tab to pending list
      setActiveTab('pending');
    } else {
      setSelectedInvoiceOrder(newOrder);
      triggerToast(t('toast_memo_created').replace('{{memoNo}}', newOrder.memoNo));
      // Automatically send SMS for direct delivery/sales memo
      triggerAutomaticSMS('order_delivery', newOrder.customerPhone || '', newOrder);
      addNotification({
        title: 'নতুন বিক্রয় মেমো তৈরি',
        message: `মেমো #${newOrder.memoNo} - ${newOrder.shopName || newOrder.customerName} (পরিশোধ: ৳${newOrder.paidAmount.toLocaleString('bn-BD')}, বকেয়া: ৳${newOrder.totalNetDue.toLocaleString('bn-BD')})`,
        type: 'order_booking',
      });
    }
  };

  // 1.1 Confirm Delivery & Issue Cash Memo for Booked Sample Orders
  const handleConfirmDelivery = async (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const updatedOrder: Order = {
      ...targetOrder,
      deliveryStatus: 'delivered',
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setOrders((prev) => [updatedOrder, ...prev.filter((o) => o.id !== orderId)]);
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

    setSelectedInvoiceOrder(updatedOrder);
    triggerToast(t('toast_delivery_confirmed').replace('{{memoNo}}', updatedOrder.memoNo));

    // Automatically send SMS
    triggerAutomaticSMS('order_delivery', targetOrder.customerPhone || '', updatedOrder);
  };

  // 1.2 Update Pending Order (e.g. remove items or adjust quantities due to stock issues)
  const handleUpdateOrder = async (updatedOrder: Order) => {
    setOrders((prev) => [updatedOrder, ...prev.filter((o) => o.id !== updatedOrder.id)]);
    await saveDocumentToFirestore('orders', updatedOrder.id, updatedOrder);

    // Update customer due
    const updatedCustomers = customers.map((c) => {
      if (c.id === updatedOrder.customerId) {
        const updatedC = { ...c, currentDue: updatedOrder.totalNetDue };
        saveDocumentToFirestore('customers', c.id, updatedC);
        return updatedC;
      }
      return c;
    });
    setCustomers(updatedCustomers);

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
      addNotification({
        title: 'বকেয়া পেমেন্ট জমা',
        message: `${targetCust.shopName || targetCust.name} থেকে ৳${newLog.amountPaid.toLocaleString('bn-BD')} পেমেন্ট রিসিভ করা হয়েছে (অবশিষ্ট বকেয়া: ৳${newLog.remainingDue.toLocaleString('bn-BD')})`,
        type: 'payment_received',
      });
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

  // 6. Delete Product Handler
  const handleDeleteProduct = async (productId: string) => {
    const target = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    await deleteDocumentFromFirestore('products', productId);
    triggerToast(t('toast_product_deleted').replace('{{articleCode}}', target?.articleCode || ''));
  };

  // 7. Quick Add Customer Handler
  const handleQuickAddCustomer = async (newCust: Customer) => {
    setCustomers((prev) => [newCust, ...prev]);
    await saveDocumentToFirestore('customers', newCust.id, newCust);

    // Also create UserAccount so the shop appears under "নিবন্ধিত দোকান" in User Management
    const phoneVal = newCust.phone?.trim() || `017${Math.floor(10000000 + Math.random() * 90000000)}`;
    const phoneClean = phoneVal.replace(/\D/g, '');
    const existingUser = userAccounts.find(
      (u) =>
        (u.phone && (u.phone || "").replace(/\D/g, '') === phoneClean) ||
        (u.loginId || "").replace(/\D/g, '') === phoneClean ||
        (u.shopName && (u.shopName || "").trim().toLowerCase() === (newCust.shopName || "").trim().toLowerCase())
    );

    if (!existingUser) {
      const newUserAcc: UserAccount = {
        id: `usr_${Date.now()}`,
        name: newCust.name,
        shopName: newCust.shopName,
        loginId: phoneVal,
        password: '123456',
        role: 'customer',
        phone: phoneVal,
        area: newCust.address,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUserAccounts((prev) => [newUserAcc, ...prev]);
      await saveDocumentToFirestore('userAccounts', newUserAcc.id, newUserAcc);
    }

    triggerToast(t('toast_customer_added').replace('{{shopName}}', newCust.shopName));
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

  const handleOnlineStorefrontOrder = async (
    shopkeeperData: {
      shopName: string;
      customerName: string;
      phone: string;
      address: string;
      password?: string;
    },
    items: OrderItem[],
    grandTotal: number,
    totalPairs: number
  ): Promise<Order | null> => {
    const cleanPhone = shopkeeperData.phone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    
    // Check if customer already exists in database with this phone number or shop name
    let targetCustomer = customers.find(
      (c) =>
        (c.phone && (c.phone || "").replace(/\D/g, '') === phoneDigits) ||
        (c.shopName && (c.shopName || "").trim().toLowerCase() === (shopkeeperData.shopName || "").trim().toLowerCase())
    );

    let updatedCustomersList = [...customers];

    if (!targetCustomer) {
      const newCust: Customer = {
        id: `CUST-${Date.now().toString().slice(-6)}`,
        name: shopkeeperData.customerName,
        shopName: shopkeeperData.shopName,
        address: shopkeeperData.address,
        phone: cleanPhone,
        assignedSellerId: '',
        assignedSellerName: 'উন্মুক্ত কাস্টমার',
        currentDue: 0,
        creditLimit: 50000,
      };
      targetCustomer = newCust;
      updatedCustomersList = [newCust, ...customers];
      setCustomers(updatedCustomersList);
      saveDocumentToFirestore('customers', newCust.id, newCust);
    } else {
      const updatedCust = {
        ...targetCustomer,
        shopName: shopkeeperData.shopName || targetCustomer.shopName,
        name: shopkeeperData.customerName || targetCustomer.name,
        address: shopkeeperData.address || targetCustomer.address,
        phone: cleanPhone || targetCustomer.phone,
      };
      targetCustomer = updatedCust;
      updatedCustomersList = customers.map((c) => (c.id === updatedCust.id ? updatedCust : c));
      setCustomers(updatedCustomersList);
      saveDocumentToFirestore('customers', updatedCust.id, updatedCust);
    }

    // Check/Create/Sync UserAccount
    let existingUser = userAccounts.find(
      (u) =>
        (u.phone && (u.phone || "").replace(/\D/g, '') === phoneDigits) ||
        (u.loginId || "").replace(/\D/g, '') === phoneDigits ||
        (u.shopName && (u.shopName || "").trim().toLowerCase() === (shopkeeperData.shopName || "").trim().toLowerCase())
    );

    if (!existingUser) {
      const newUserAcc: UserAccount = {
        id: `USER-${Date.now().toString().slice(-6)}`,
        name: shopkeeperData.customerName,
        shopName: shopkeeperData.shopName,
        loginId: cleanPhone,
        password: shopkeeperData.password || '123456',
        role: 'customer',
        phone: cleanPhone,
        area: shopkeeperData.address,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      const updatedUserAccs = [newUserAcc, ...userAccounts];
      setUserAccounts(updatedUserAccs);
      saveDocumentToFirestore('userAccounts', newUserAcc.id, newUserAcc);
    } else {
      const updatedUserAcc: UserAccount = {
        ...existingUser,
        name: shopkeeperData.customerName || existingUser.name,
        shopName: shopkeeperData.shopName || existingUser.shopName,
        phone: cleanPhone || existingUser.phone,
        area: shopkeeperData.address || existingUser.area,
        password: shopkeeperData.password || existingUser.password,
      };
      const updatedUserAccs = userAccounts.map((u) => (u.id === existingUser.id ? updatedUserAcc : u));
      setUserAccounts(updatedUserAccs);
      saveDocumentToFirestore('userAccounts', existingUser.id, updatedUserAcc);
    }

    const newMemoNo = `MEMO-WEB-${Date.now().toString().slice(-5)}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const totalCartons = Math.ceil(totalPairs / 12);
    const hasAssignedSeller = targetCustomer.assignedSellerId && targetCustomer.assignedSellerId !== 'UNASSIGNED' && targetCustomer.assignedSellerId !== '';

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      memoNo: newMemoNo,
      date: dateStr,
      time: timeStr,
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      shopName: targetCustomer.shopName,
      customerPhone: cleanPhone,
      customerAddress: targetCustomer.address,
      sellerId: hasAssignedSeller ? targetCustomer.assignedSellerId : '',
      sellerName: hasAssignedSeller ? targetCustomer.assignedSellerName : 'উন্মুক্ত বুকিং (ক্লেইম করুন)',
      isOnlineOrder: true,
      isClaimed: !!hasAssignedSeller,
      items,
      totalPairs,
      totalCartons,
      subTotal: grandTotal,
      discount: 0,
      adjustmentAmount: 0,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      previousDue: targetCustomer.currentDue,
      totalNetDue: targetCustomer.currentDue + grandTotal,
      paymentMethod: 'বাকী (ডিউ)',
      status: 'সম্পূর্ণ বাকী',
      orderType: 'sample_booking',
      deliveryStatus: 'booked',
      notes: `অনলাইন ক্যাটালগ বুকিং রিকোয়েস্ট (ফোন: ${cleanPhone})`,
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveDocumentToFirestore('orders', newOrder.id, newOrder);

    // Send SMS notification
    await triggerAutomaticSMS('order_placed', cleanPhone, {
      customerName: targetCustomer.name,
      shopName: targetCustomer.shopName,
      memoNo: newMemoNo,
      totalPairs,
      grandTotal,
      paidAmount: 0,
      currentDue: targetCustomer.currentDue + grandTotal,
    });

    triggerToast(`অনলাইন অর্ডার রিকোয়েস্ট তৈরি হয়েছে! মেমো নং: ${newMemoNo}`);
    return newOrder;
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
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 font-sans antialiased pb-12 selection:bg-amber-500 selection:text-slate-950">
        
        {/* Login Screen Modal Overlay if requested or not logged in */}
        {(!currentUser && isLoginModalOpen) && (
          <LoginModal
            userAccounts={userAccounts}
            onLoginSuccess={(user) => {
              handleLoginSuccess(user);
              setIsLoginModalOpen(false);
            }}
            onRegisterShopkeeper={handleRegisterShopkeeper}
            onClose={() => setIsLoginModalOpen(false)}
          />
        )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-amber-400/80 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-semibold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Printable Invoice Modal */}
      <InvoiceModal
        order={selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
      />

      {/* Header Bar */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onManualSeed={handleManualSeed}
        isLoadingCloud={isLoadingCloud}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dueAlertCount={dueAlertCount}
        lowStockCount={lowStockCount}
        pendingOrdersCount={pendingOrdersCount}
        currentUserRole={currentUser?.role || 'customer'}
        systemConfig={systemConfig}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        onClearNotifications={handleClearNotifications}
        onInstallPWA={handleInstallPWA}
        canInstallPWA={canInstallPWA}
      />

      {/* Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (!currentUser && tab !== 'catalog') {
            setIsLoginModalOpen(true);
            return;
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
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 pb-6 sm:pb-12">
        
        {activeTab === 'catalog' && (
          <CustomerStorefront
            products={products}
            customers={customers}
            orders={getVisibleOrders()}
            userAccounts={userAccounts}
            systemConfig={systemConfig}
            onSubmitOrder={handleOnlineStorefrontOrder}
            currentUser={currentUser}
            onLoginClick={() => setIsLoginModalOpen(true)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        
        {activeTab === 'dashboard' && (
          <Dashboard
            orders={getVisibleOrders()}
            products={products}
            customers={getVisibleCustomers()}
            currentUser={currentUser}
            systemConfig={systemConfig}
            onNavigate={setActiveTab}
            onSelectOrderForInvoice={setSelectedInvoiceOrder}
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
            onCreateOrder={handleCreateOrder}
            onQuickAddCustomer={handleQuickAddCustomer}
          />
        )}

        {activeTab === 'pending' && (
          <PendingOrders
            orders={getVisibleOrders()}
            activeTheme={activeTheme}
            onSelectOrderForInvoice={setSelectedInvoiceOrder}
            onConfirmDelivery={handleConfirmDelivery}
            onUpdateOrder={handleUpdateOrder}
            onClaimOrder={handleClaimOrder}
            onDeleteOrder={handleDeleteOrder}
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
            activeTheme={activeTheme}
            onSelectOrderForInvoice={setSelectedInvoiceOrder}
            onConfirmDelivery={handleConfirmDelivery}
            onDeleteOrder={handleDeleteOrder}
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
              activeTheme={activeTheme}
              systemConfig={systemConfig}
              onUpdateSystemConfig={handleUpdateSystemConfig}
              onAddUserAccount={handleAddUserAccount}
              onToggleUserStatus={handleToggleUserStatus}
              onResetPassword={handleResetPassword}
              onUpdateSeller={handleUpdateSeller}
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
          />
        )}

        {activeTab === 'features' && currentUser && (
          <FeatureManagement
            currentUser={currentUser}
            systemConfig={systemConfig}
            activeTheme={activeTheme}
            onUpdateSystemConfig={handleUpdateSystemConfig}
            onClearDatabase={handleClearDatabase}
            onNavigateToReports={() => setActiveTab('reports')}
            onSendNotification={(title, message) =>
              addNotification({
                title,
                message,
                type: 'system_broadcast',
              })
            }
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

      </main>

    </div>
  );
}

