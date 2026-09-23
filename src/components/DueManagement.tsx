import React, { useState, useMemo } from 'react';
import { Customer, SalesRep, DuePaymentLog, UITheme, UserAccount } from '../types';
import { formatTaka, toBnDigit, formatBnDate, getLocalDateStr } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Receipt,
  Search,
  DollarSign,
  User,
  Store,
  MessageSquare,
  History,
  CheckCircle,
  PlusCircle,
  Share2,
  List,
  LayoutGrid,
  Edit,
  Sliders,
  Wallet,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';

interface DueManagementProps {
  customers: Customer[];
  sellers: SalesRep[];
  paymentLogs: DuePaymentLog[];
  activeTheme: UITheme;
  currentUser?: UserAccount | null;
  onRecordPayment: (newLog: DuePaymentLog) => void;
  onUpdateCustomer?: (updatedCust: Customer, note?: string) => void;
  onTriggerSMS?: (
    type: 'order_delivery' | 'payment_received' | 'due_reminder',
    customerPhone: string,
    customerName: string,
    shopName: string,
    data: any,
    customerId?: string
  ) => Promise<boolean>;
}

export const DueManagement: React.FC<DueManagementProps> = ({
  customers,
  sellers,
  paymentLogs,
  activeTheme,
  currentUser,
  onRecordPayment,
  onUpdateCustomer,
  onTriggerSMS,
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('সব');
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'customer_wise' | 'seller_wise' | 'logs'>('customer_wise');
  const [customerViewMode, setCustomerViewMode] = useState<'table' | 'card'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'card' : 'table'
  );
  const [activeDueFilter, setActiveDueFilter] = useState<'all' | 'due' | 'advance'>('all');

  // State to track manual sending status per customer
  const [sendingStatuses, setSendingStatuses] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'failed'>>({});

  // Adjust / Opening Due Modal State
  const [showAdjustDueModal, setShowAdjustDueModal] = useState<boolean>(false);
  const [adjustCustomerId, setAdjustCustomerId] = useState<string>('');
  const [adjustAmount, setAdjustAmount] = useState<number | string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'set'>('add');
  const [adjustNote, setAdjustNote] = useState<string>('পূর্বের খাতার বাকী');
  const [adjustCustomerSearch, setAdjustCustomerSearch] = useState<string>('');
  const [isAdjustCustDropdownOpen, setIsAdjustCustDropdownOpen] = useState<boolean>(false);

  const openAdjustDueModal = (targetCust?: Customer) => {
    if (targetCust) {
      setAdjustCustomerId(targetCust.id);
    } else {
      setAdjustCustomerId(customers[0]?.id || '');
    }
    setAdjustAmount('');
    setAdjustType('add');
    setAdjustNote('পূর্বের খাতার বাকী');
    setAdjustCustomerSearch('');
    setShowAdjustDueModal(true);
  };

  const handleSaveAdjustDue = (e: React.FormEvent) => {
    e.preventDefault();
    const target = customers.find((c) => c.id === adjustCustomerId);
    if (!target) {
      alert('অনুগ্রহ করে একজন কাস্টমার বা দোকান নির্বাচন করুন!');
      return;
    }

    const val = Number(adjustAmount);
    if (isNaN(val) || val < 0) {
      alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন!');
      return;
    }

    let newDue = target.currentDue;
    if (adjustType === 'add') {
      newDue = target.currentDue + val;
    } else {
      newDue = val;
    }

    const updatedCust: Customer = {
      ...target,
      currentDue: newDue,
    };

    if (onUpdateCustomer) {
      const defaultNote =
        adjustType === 'add'
          ? `পূর্বের বকেয়া ৳${val.toLocaleString('bn-BD')} যুক্ত করা হয়েছে`
          : `বকেয়া সমন্বয় করে ৳${val.toLocaleString('bn-BD')} নির্ধারণ করা হয়েছে`;
      onUpdateCustomer(updatedCust, adjustNote || defaultNote);
    }

    setShowAdjustDueModal(false);
    setAdjustCustomerId('');
    setAdjustAmount('');
    setAdjustNote('পূর্বের খাতার বাকী');
  };

  // Payment Entry Modal
  const [selectedCustForPayment, setSelectedCustForPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('নগদ ক্যাশ');
  const [collectorName, setCollectorName] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('ক্যাশ বাকী পরিশোধ');

  const openPaymentModal = (cust: Customer) => {
    setSelectedCustForPayment(cust);
    setPaymentAmount('');
    setDiscountAmount(0);
    setPaymentNotes('');
    setCollectorName(currentUser?.name || cust.assignedSellerName || 'ক্যাশিয়ার');
  };

  // WhatsApp / SMS Reminder Copy State
  const [reminderCopiedId, setReminderCopiedId] = useState<string | null>(null);

  // Helper to match customer to seller or admin
  const isCustomerOfSeller = (c: Customer, seller: SalesRep) => {
    if (c.assignedSellerId && c.assignedSellerId === seller.id) return true;
    if (seller.phone && c.assignedSellerId === seller.phone) return true;
    if (seller.phone && c.assignedSellerId) {
      const cleanSPhone = seller.phone.replace(/\D/g, '');
      const cleanCPhone = c.assignedSellerId.replace(/\D/g, '');
      if (cleanSPhone && cleanCPhone && cleanSPhone.length >= 6 && (cleanSPhone.endsWith(cleanCPhone) || cleanCPhone.endsWith(cleanSPhone))) {
        return true;
      }
    }
    if (c.assignedSellerName && seller.name) {
      const cn = c.assignedSellerName.trim().toLowerCase();
      const sn = seller.name.trim().toLowerCase();
      if (cn === sn || sn.includes(cn) || cn.includes(sn)) return true;
    }
    return false;
  };

  // Filter customers with active balance (due > 0 OR advance < 0)
  const dueCustomers = customers
    .filter((c) => {
      // Must have either Due (> 0) or Advance Credit (< 0)
      if (c.currentDue === 0) return false;

      // Filter by activeDueFilter: 'all' | 'due' | 'advance'
      if (activeDueFilter === 'due' && c.currentDue <= 0) return false;
      if (activeDueFilter === 'advance' && c.currentDue >= 0) return false;

      const matchesSearch =
        (c.shopName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.assignedSellerName && (c.assignedSellerName || "").toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesSeller = true;
      if (selectedSellerFilter !== 'সব') {
        const selectedSellerObj = sellers.find((s) => s.id === selectedSellerFilter);
        if (selectedSellerObj) {
          matchesSeller = isCustomerOfSeller(c, selectedSellerObj);
        } else {
          matchesSeller = c.assignedSellerId === selectedSellerFilter;
        }
      }

      return matchesSearch && matchesSeller;
    })
    .sort((a, b) => b.id.localeCompare(a.id));

  // Financial aggregates
  const totalMarketDue = customers.reduce((sum, c) => sum + (c.currentDue > 0 ? c.currentDue : 0), 0);
  const totalAdvanceCredit = customers.reduce((sum, c) => sum + (c.currentDue < 0 ? Math.abs(c.currentDue) : 0), 0);
  const dueCustomersCount = customers.filter((c) => c.currentDue > 0).length;
  const advanceCustomersCount = customers.filter((c) => c.currentDue < 0).length;
  const totalCollectionAmount = paymentLogs.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  // Calculate Due Grouped by Seller / Admin (active due and advance balance)
  const sellerWiseDue = useMemo(() => {
    const list = sellers.map((seller) => {
      const sellerCusts = customers.filter((c) => isCustomerOfSeller(c, seller) && c.currentDue !== 0);
      const sellerTotalDue = sellerCusts.reduce((sum, c) => sum + (c.currentDue > 0 ? c.currentDue : 0), 0);
      const sellerTotalAdvance = sellerCusts.reduce((sum, c) => sum + (c.currentDue < 0 ? Math.abs(c.currentDue) : 0), 0);
      return {
        seller,
        customerCount: sellerCusts.length,
        totalDue: sellerTotalDue,
        totalAdvance: sellerTotalAdvance,
        customers: sellerCusts,
      };
    });

    // Check if there are unassigned / open customers with due not matched to any seller/admin
    const unassignedCusts = customers.filter(
      (c) =>
        c.currentDue !== 0 &&
        !sellers.some((seller) => isCustomerOfSeller(c, seller))
    );
    if (unassignedCusts.length > 0) {
      list.push({
        seller: {
          id: 'unassigned',
          name: 'অন্যান্য / উন্মুক্ত কাস্টমার',
          phone: '',
          area: 'প্রধান সেলস শাখা',
          monthlyTargetPairs: 0,
          commissionRatePercent: 0,
        },
        customerCount: unassignedCusts.length,
        totalDue: unassignedCusts.reduce((sum, c) => sum + (c.currentDue > 0 ? c.currentDue : 0), 0),
        totalAdvance: unassignedCusts.reduce((sum, c) => sum + (c.currentDue < 0 ? Math.abs(c.currentDue) : 0), 0),
        customers: unassignedCusts,
      });
    }

    return list.sort((a, b) => b.totalDue - a.totalDue);
  }, [sellers, customers]);

  // Handle Payment Form Submission
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForPayment) return;

    const paidVal = Number(paymentAmount) || 0;

    if (paidVal <= 0) {
      alert('অনুগ্রহ করে সঠিক আদায়কৃত ক্যাশের পরিমাণ লিখুন!');
      return;
    }

    const prevDue = selectedCustForPayment.currentDue;
    const remDue = prevDue - paidVal; // allows negative value representing advance credit
    const todayStr = getLocalDateStr(new Date());
    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newLog: DuePaymentLog = {
      id: `pay-${Date.now()}`,
      date: todayStr,
      customerId: selectedCustForPayment.id,
      customerName: selectedCustForPayment.name,
      shopName: selectedCustForPayment.shopName,
      sellerId: selectedCustForPayment.assignedSellerId,
      sellerName: selectedCustForPayment.assignedSellerName,
      amountPaid: paidVal,
      discountAmount: 0,
      previousDue: prevDue,
      remainingDue: remDue,
      paymentMethod,
      receivedBy: collectorName.trim() || currentUser?.name || 'ক্যাশিয়ার',
      receiptNo,
      notes: paymentNotes,
    };

    onRecordPayment(newLog);
    setSelectedCustForPayment(null);
    setPaymentAmount('');
    setDiscountAmount(0);
    setPaymentNotes('');
  };

  // Generate WhatsApp Reminder Text
  const getReminderText = (cust: Customer) => {
    return `${t('reminder_prefix')} ${cust.shopName} (${cust.name}), ${t('reminder_msg_part1')} ${formatTaka(cust.currentDue)}। ${t('reminder_msg_part2')}`;
  };

  const handleCopyReminder = (cust: Customer) => {
    const text = getReminderText(cust);
    navigator.clipboard.writeText(text);
    setReminderCopiedId(cust.id);
    setTimeout(() => setReminderCopiedId(null), 3000);
  };

  const handleMessageClick = async (cust: Customer) => {
    if (!cust.phone || !cust.phone.trim()) {
      alert('এই কাস্টমারের কোনো মোবাইল নম্বর সংরক্ষিত নেই। মেসেজ পাঠানো সম্ভব নয়।');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (cust.lastDueReminderDate === todayStr) {
      const confirmed = window.confirm('আজ এই কাস্টমারকে ইতিমধ্যে তাগদা মেসেজ পাঠানো হয়েছে! আপনি কি আবার পাঠাতে চান?');
      if (!confirmed) return;
    }

    if (onTriggerSMS) {
      setSendingStatuses((prev) => ({ ...prev, [cust.id]: 'sending' }));
      try {
        const success = await onTriggerSMS(
          'due_reminder',
          cust.phone,
          cust.name,
          cust.shopName,
          { currentDue: cust.currentDue },
          cust.id
        );
        if (success) {
          setSendingStatuses((prev) => ({ ...prev, [cust.id]: 'sent' }));
        } else {
          setSendingStatuses((prev) => ({ ...prev, [cust.id]: 'failed' }));
          setTimeout(() => {
            setSendingStatuses((prev) => ({ ...prev, [cust.id]: 'idle' }));
          }, 4000);
        }
      } catch (err) {
        console.error(err);
        setSendingStatuses((prev) => ({ ...prev, [cust.id]: 'failed' }));
        setTimeout(() => {
          setSendingStatuses((prev) => ({ ...prev, [cust.id]: 'idle' }));
        }, 4000);
      }
    } else {
      handleCopyReminder(cust);
    }
  };

  const renderMessageButtonContent = (cust: Customer) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isSentToday = cust.lastDueReminderDate === todayStr;
    const localStatus = sendingStatuses[cust.id];

    if (localStatus === 'sending') {
      return (
        <>
          <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
          <span>পাঠানো হচ্ছে...</span>
        </>
      );
    }

    if (localStatus === 'sent' || isSentToday) {
      return (
        <>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-bold">{localStatus === 'sent' ? 'Sent (টিক)' : 'আবার পাঠান'}</span>
        </>
      );
    }

    if (localStatus === 'failed') {
      return (
        <>
          <span className="text-rose-400">X</span>
          <span className="text-rose-400">ব্যর্থ!</span>
        </>
      );
    }

    return (
      <>
        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
        <span>মেসেজ</span>
      </>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-7" onClick={() => setIsSellerDropdownOpen(false)}>
      
      {/* Top Bar - Clean Dashboard-Style Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 p-2 sm:p-2.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 rounded-xl shadow-inner">
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">বাকী খাতা</span>
          </div>

          {/* View Mode Tabs styled like Dashboard */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 p-1 rounded-xl shadow-inner gap-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('customer_wise')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'customer_wise'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/60'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{t('customer')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('seller_wise')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'seller_wise'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t('seller')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'logs'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{t('history')}</span>
            </button>
          </div>
        </div>

        {/* Right side: Add Initial Due */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || !currentUser?.role) && (
          <button
            type="button"
            onClick={() => openAdjustDueModal()}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>পূর্বের বাকী যুক্ত</span>
          </button>
        )}
      </div>

      {/* 3D Key Metrics Cards in 2 Rows (2 Columns) */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
        
        {/* Card 1: মোট বকেয়া (Total Due) */}
        <div 
          onClick={() => {
            setViewMode('customer_wise');
            setActiveDueFilter('due');
          }}
          className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-rose-500/50 dark:hover:border-rose-500/50 p-4 sm:p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">মোট বকেয়া</p>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono truncate">
              {formatTaka(totalMarketDue)}
            </h3>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {toBnDigit(dueCustomersCount)} জন বকেয়া কাস্টমার
            </div>
          </div>
        </div>

        {/* Card 2: মোট আদায় (Total Collection) */}
        <div
          onClick={() => setViewMode('logs')}
          className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 p-4 sm:p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">মোট আদায়</p>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono truncate">
              {formatTaka(totalCollectionAmount)}
            </h3>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {toBnDigit(paymentLogs.length)} টি রসিদ এন্ট্রি
            </div>
          </div>
        </div>

        {/* Card 3: অগ্রিম জমা (Advance Credit) */}
        <div
          onClick={() => {
            setViewMode('customer_wise');
            setActiveDueFilter('advance');
          }}
          className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 p-4 sm:p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">অগ্রিম জমা</p>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-300 font-mono truncate">
              {formatTaka(totalAdvanceCredit)}
            </h3>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {toBnDigit(advanceCustomersCount)} জন অগ্রিম পার্টি
            </div>
          </div>
        </div>

        {/* Card 4: কাস্টমার হিসাব (Total Accounts) */}
        <div
          onClick={() => {
            setViewMode('customer_wise');
            setActiveDueFilter('all');
          }}
          className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 p-4 sm:p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">মোট পার্টি</p>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-300 font-mono truncate">
              {toBnDigit(dueCustomersCount + advanceCustomersCount)}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">জন</span>
            </h3>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              মোট রেজিস্টার্ড: {toBnDigit(customers.length)} জন
            </div>
          </div>
        </div>

      </div>

      {/* VIEW MODE 1: CUSTOMER-WISE DUE LIST */}
      {viewMode === 'customer_wise' && (
        <div className="space-y-4">
          
          {/* Filters & View Switcher - Sleek Minimal Strip */}
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 p-2.5 sm:p-3 rounded-2xl shadow-sm space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              {/* Search */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 w-full sm:w-72 shadow-inner">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="দোকান, নাম বা ফোন..."
                  className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-full focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* Custom Seller Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSellerDropdownOpen((prev) => !prev);
                    }}
                    className={`bg-slate-50 dark:bg-slate-950 border text-xs rounded-xl px-3 py-2 font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-inner ${
                      selectedSellerFilter !== 'সব'
                        ? 'border-amber-500/80 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-none">
                      {selectedSellerFilter === 'সব'
                        ? 'সব সেলার'
                        : sellers.find((s) => s.id === selectedSellerFilter)?.name || 'সেলার'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isSellerDropdownOpen ? 'rotate-180 text-amber-500' : ''
                      }`}
                    />
                  </button>

                  {/* Custom Seller Menu */}
                  {isSellerDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-60 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>সেলার ফিল্টার</span>
                        {selectedSellerFilter !== 'সব' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSellerFilter('সব');
                              setIsSellerDropdownOpen(false);
                            }}
                            className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer text-[10px]"
                          >
                            রিসেট
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSellerFilter('সব');
                          setIsSellerDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          selectedSellerFilter === 'সব'
                            ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>সব সেলার ও এডমিন</span>
                        {selectedSellerFilter === 'সব' && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      </button>
                      {sellers.map((s) => {
                        const isSelected = selectedSellerFilter === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedSellerFilter(s.id);
                              setIsSellerDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800/40 ${
                              isSelected
                                ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-medium text-slate-800 dark:text-slate-100">{s.name}</span>
                              {(s.isAdmin || s.role === 'admin') && (
                                <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(এডমিন)</span>
                              )}
                              {s.area && (
                                <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400">({s.area})</span>
                              )}
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setCustomerViewMode('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      customerViewMode === 'table'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>টেবিল</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerViewMode('card')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      customerViewMode === 'card'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>কার্ড</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Filter: All vs Due vs Advance */}
            <div className="flex items-center gap-1.5 border-t border-slate-200 dark:border-slate-800/80 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveDueFilter('all')}
                className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 text-xs ${
                  activeDueFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>সব</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-mono ${
                  activeDueFilter === 'all' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400'
                }`}>
                  {toBnDigit(dueCustomersCount + advanceCustomersCount)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDueFilter('due')}
                className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 text-xs ${
                  activeDueFilter === 'due'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>বকেয়া</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-mono ${
                  activeDueFilter === 'due' ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-900 text-rose-600 dark:text-rose-400'
                }`}>
                  {toBnDigit(dueCustomersCount)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDueFilter('advance')}
                className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 text-xs ${
                  activeDueFilter === 'advance'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>অগ্রিম</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-mono ${
                  activeDueFilter === 'advance' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-900 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {toBnDigit(advanceCustomersCount)}
                </span>
              </button>
            </div>
          </div>

          {/* Customer Container - Minimal & Clean */}
          {customerViewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
              {dueCustomers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                  কোনো কাস্টমার বা হিসাব পাওয়া যায়নি।
                </div>
              ) : (
                dueCustomers.map((cust) => {
                  const isAdvance = cust.currentDue < 0;
                  return (
                    <div
                      key={cust.id}
                      className={`bg-white dark:bg-slate-900/90 border rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm ${
                        isAdvance
                          ? 'border-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-800/90'
                      }`}
                    >
                      <div>
                        {/* Header: Shop & Due Amount */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{cust.shopName}</h4>
                              {isAdvance && (
                                <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded text-[9px] font-bold shrink-0">
                                  অগ্রিম
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {cust.name} {cust.assignedSellerName ? `• ${cust.assignedSellerName}` : ''}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className={`font-black text-base sm:text-lg font-mono tracking-tight ${
                                isAdvance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isAdvance ? `+${formatTaka(Math.abs(cust.currentDue))}` : formatTaka(cust.currentDue)}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {isAdvance ? 'জমা' : 'বকেয়া'}
                            </div>
                          </div>
                        </div>

                        {/* Phone & Address in single clean strip */}
                        {(cust.phone || cust.address) && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 truncate">
                            {cust.phone && (
                              <span className="font-mono text-slate-700 dark:text-slate-300 shrink-0">{cust.phone}</span>
                            )}
                            {cust.phone && cust.address && <span className="text-slate-400 dark:text-slate-600">•</span>}
                            {cust.address && (
                              <span className="truncate">{cust.address}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAdjustDueModal(cust)}
                          className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                          title="সমন্বয় করুন"
                        >
                          <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>সমন্বয়</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openPaymentModal(cust)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1 transition cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{isAdvance ? 'জমা' : 'আদায়'}</span>
                        </button>

                        {cust.phone && !isAdvance ? (
                          <button
                            type="button"
                            onClick={() => handleMessageClick(cust)}
                            disabled={sendingStatuses[cust.id] === 'sending'}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                              sendingStatuses[cust.id] === 'sent' || cust.lastDueReminderDate === new Date().toISOString().split('T')[0]
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : sendingStatuses[cust.id] === 'sending'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                                : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-800 hover:border-amber-500/30'
                            }`}
                          >
                            {renderMessageButtonContent(cust)}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto no-scrollbar">
                <table className="min-w-[560px] w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800/90 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-3.5">দোকান ও পার্টি</th>
                      <th className="py-2.5 px-3">মোবাইল / ঠিকানা</th>
                      <th className="py-2.5 px-3">সেলার</th>
                      <th className="py-2.5 px-3 text-right">বকেয়া / স্থিতি</th>
                      <th className="py-2.5 px-3.5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {dueCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          কোনো কাস্টমার বা হিসাব পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      dueCustomers.map((cust) => {
                        const isAdvance = cust.currentDue < 0;
                        return (
                          <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100">{cust.shopName}</span>
                                {isAdvance && (
                                  <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded text-[9px] font-bold">
                                    অগ্রিম
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">{cust.name}</div>
                            </td>

                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                              <div className="font-mono text-xs">{cust.phone || '—'}</div>
                              {cust.address && <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{cust.address}</div>}
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px]">
                                {cust.assignedSellerName || 'সেলার'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div
                                className={`font-black text-sm font-mono ${
                                  isAdvance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isAdvance ? `+${formatTaka(Math.abs(cust.currentDue))}` : formatTaka(cust.currentDue)}
                              </div>
                            </td>

                            <td className="py-2.5 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(cust)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                                >
                                  {isAdvance ? 'জমা' : 'আদায়'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAdjustDueModal(cust)}
                                  className="px-2 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs transition cursor-pointer"
                                  title="সমন্বয়"
                                >
                                  <Sliders className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                </button>
                                {cust.phone && !isAdvance ? (
                                  <button
                                    type="button"
                                    onClick={() => handleMessageClick(cust)}
                                    disabled={sendingStatuses[cust.id] === 'sending'}
                                    className={`px-2 py-1 rounded-lg text-xs transition cursor-pointer ${
                                      sendingStatuses[cust.id] === 'sent' || cust.lastDueReminderDate === new Date().toISOString().split('T')[0]
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                        : 'bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-800'
                                    }`}
                                    title="তাগদা মেসেজ"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW MODE 2: SELLER-WISE DUE BREAKDOWN */}
      {viewMode === 'seller_wise' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {sellerWiseDue.map(({ seller, customerCount, totalDue, totalAdvance, customers: sCusts }) => (
            <div key={seller.id} className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">{seller.name}</h3>
                    {seller.isAdmin || seller.role === 'admin' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                        এডমিন
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                        সেলার
                      </span>
                    )}
                  </div>
                  {seller.area && seller.area !== 'প্রধান শাখা (এডমিন ও সেলার)' && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-0.5">{seller.area}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">মোট বাকী</div>
                  <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono">{formatTaka(totalDue)}</div>
                  {totalAdvance > 0 && (
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                      এডভান্স: +{formatTaka(totalAdvance)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>কাস্টমার তালিকা:</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">{toBnDigit(customerCount)} জন</span>
                </div>
                {sCusts.length > 0 ? (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {sCusts.map((c) => {
                      const isAdv = c.currentDue < 0;
                      return (
                        <div
                          key={c.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{c.shopName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.address}</div>
                          </div>
                          <div className="text-right font-mono">
                            <div className={`font-bold ${isAdv ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isAdv ? `+${formatTaka(Math.abs(c.currentDue))}` : formatTaka(c.currentDue)}
                            </div>
                            <div className="text-[9px] text-slate-500 dark:text-slate-400">
                              {isAdv ? 'এডভান্স' : 'বাকী'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 py-3">
                    বর্তমানে কোনো বকেয়া হিসাব নেই
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODE 3: PAYMENT COLLECTION LOGS */}
      {viewMode === 'logs' && (
        <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm space-y-0">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/90 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>বাকী আদায়ের ইতিহাস</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">মোট {toBnDigit(paymentLogs.length)} টি</span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="min-w-[700px] w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-4">রিসিট নম্বর</th>
                  <th className="py-3 px-3">তারিখ</th>
                  <th className="py-3 px-3">দোকানের নাম</th>
                  <th className="py-3 px-3">সেলার / রুট</th>
                  <th className="py-3 px-3">আদায়কারী</th>
                  <th className="py-3 px-3 text-right">আদায়ের পরিমাণ (৳)</th>
                  <th className="py-3 px-3 text-right">অবশিষ্ট বাকী (৳)</th>
                  <th className="py-3 px-3 sm:px-4">পেমেন্ট মাধ্যম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[...paymentLogs]
                  .sort((a, b) => {
                    if (a.date !== b.date) {
                      return b.date.localeCompare(a.date);
                    }
                    return b.id.localeCompare(a.id);
                  })
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 sm:px-4 font-mono font-bold text-amber-600 dark:text-amber-300">{log.receiptNo}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-mono">{formatBnDate(log.date)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{log.shopName}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{log.sellerName}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        <User className="w-3 h-3" />
                        {log.receivedBy || 'ক্যাশিয়ার'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      <div>+{formatTaka(log.amountPaid)}</div>
                      {log.discountAmount && log.discountAmount > 0 ? (
                        <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                          (এডজাস্ট: {formatTaka(log.discountAmount)})
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono">
                      <span className={log.remainingDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {log.remainingDue < 0 ? `+${formatTaka(Math.abs(log.remainingDue))}` : formatTaka(log.remainingDue)}
                      </span>
                      {log.remainingDue < 0 && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-500/80 font-normal">এডভান্স</div>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 dark:text-slate-300">{log.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Entry Dialog */}
      {selectedCustForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>টাকা আদায়ের রশিদ এন্ট্রি</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCustForPayment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3 text-xs">
              
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-amber-700 dark:text-amber-300 text-sm sm:text-base">{selectedCustForPayment.shopName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">প্রো: {selectedCustForPayment.name}</div>
                  </div>
                  {selectedCustForPayment.address && (
                    <div className="text-[11px] text-slate-500 max-w-[160px] truncate text-right">
                      {selectedCustForPayment.address}
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2.5 border-t border-slate-200 dark:border-slate-900 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    {selectedCustForPayment.currentDue < 0 ? 'বর্তমান এডভান্স ক্রেডিট:' : 'বর্তমান মোট বাকী:'}
                  </span>
                  <span className={`font-black text-xl sm:text-2xl font-mono ${
                    selectedCustForPayment.currentDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {selectedCustForPayment.currentDue < 0
                      ? `+${formatTaka(Math.abs(selectedCustForPayment.currentDue))}`
                      : formatTaka(selectedCustForPayment.currentDue)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                  {selectedCustForPayment.currentDue < 0 ? 'অতিরিক্ত জমা / ক্যাশ টাকা (৳) *' : 'আদায়কৃত ক্যাশ (৳) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 font-bold text-base">৳</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="টাকার পরিমাণ লিখুন"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-emerald-500/80 text-emerald-700 dark:text-emerald-300 font-black text-lg pl-8 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Calculated Summary Preview Card */}
              {(() => {
                const paidVal = Number(paymentAmount) || 0;
                const remDue = selectedCustForPayment.currentDue - paidVal;
                return (
                  <div className="bg-slate-50 dark:bg-slate-950/90 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{selectedCustForPayment.currentDue < 0 ? 'পূর্বের এডভান্স জমা:' : 'পূর্বের মোট বাকী:'}</span>
                      <span className={`font-bold ${selectedCustForPayment.currentDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {selectedCustForPayment.currentDue < 0
                          ? `+${formatTaka(Math.abs(selectedCustForPayment.currentDue))}`
                          : formatTaka(selectedCustForPayment.currentDue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>নগদ জমা / আদায়:</span>
                      <span className="font-bold">+{formatTaka(paidVal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">
                        {remDue < 0 ? 'হিসাবের পর নতুন এডভান্স জমা:' : 'হিসাবের পর অবশিষ্ট বাকী:'}
                      </span>
                      <span className={`text-sm font-black ${
                        remDue < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : remDue === 0
                          ? 'text-slate-600 dark:text-slate-300'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {remDue < 0 ? `+${formatTaka(Math.abs(remDue))}` : formatTaka(remDue)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">আদায়কারী (কে আদায় করলো) *</label>
                  <input
                    type="text"
                    required
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    placeholder="আদায়কারীর নাম"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">পেমেন্ট মাধ্যম</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['নগদ ক্যাশ', 'বিকাশ / নগদ', 'ব্যাংক ডিপোজিট', 'চেক পেমেন্ট'].map((method) => {
                      const isSelected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate">{method}</span>
                          {isSelected && <Check className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">নোট / বিবরণ</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedCustForPayment(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow"
                >
                  আদায় নিশ্চিত করুন
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Adjust / Opening Due Modal */}
      {showAdjustDueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>বকেয়া সমন্বয়</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAdjustDueModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustDue} className="space-y-3.5 text-xs">
              
              {/* Customer Selector */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  দোকান / কাস্টমার *
                </label>
                
                {/* Custom Searchable Customer Selector */}
                <div className="relative">
                  {(() => {
                    const chosenCust = customers.find((c) => c.id === adjustCustomerId);
                    return (
                      <button
                        type="button"
                        onClick={() => setIsAdjustCustDropdownOpen(!isAdjustCustDropdownOpen)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left p-2.5 rounded-xl flex items-center justify-between focus:outline-none focus:border-amber-500 cursor-pointer shadow-inner"
                      >
                        {chosenCust ? (
                          <div className="truncate pr-2">
                            <span className="font-bold text-amber-700 dark:text-amber-300 text-xs">{chosenCust.shopName}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1.5">(প্রো: {chosenCust.name})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">কাস্টমার নির্বাচন করুন...</span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isAdjustCustDropdownOpen ? 'rotate-180 text-amber-500' : ''}`} />
                      </button>
                    );
                  })()}

                  {isAdjustCustDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="দোকান বা মালিকের নাম..."
                          value={adjustCustomerSearch}
                          onChange={(e) => setAdjustCustomerSearch(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-0.5 divide-y divide-slate-100 dark:divide-slate-800/40">
                        {customers
                          .filter((c) => {
                            if (!adjustCustomerSearch.trim()) return true;
                            const q = adjustCustomerSearch.toLowerCase();
                            return (
                              c.shopName.toLowerCase().includes(q) ||
                              c.name.toLowerCase().includes(q) ||
                              c.phone.includes(q)
                            );
                          })
                          .map((c) => {
                            const isSelected = c.id === adjustCustomerId;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setAdjustCustomerId(c.id);
                                  setIsAdjustCustDropdownOpen(false);
                                }}
                                className={`w-full p-2 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">{c.shopName}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.name} {c.address ? `• ${c.address}` : ''}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className={`text-[11px] font-mono font-bold ${c.currentDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    ৳ {c.currentDue.toLocaleString('bn-BD')}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Customer Snapshot */}
              {(() => {
                const target = customers.find((c) => c.id === adjustCustomerId);
                if (!target) return null;

                const inputVal = Number(adjustAmount) || 0;
                const finalDue = adjustType === 'add' ? target.currentDue + inputVal : inputVal;

                return (
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span>দোকান:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm">{target.shopName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>মালিক:</span>
                      <span>{target.name} ({target.phone})</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-900 pt-1.5">
                      <span className="text-slate-600 dark:text-slate-400">বর্তমান বকেয়া:</span>
                      <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-sm">৳ {target.currentDue.toLocaleString('bn-BD')}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Adjustment Mode Selection */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  সমন্বয়ের ধরণ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      adjustType === 'add'
                        ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="font-bold text-xs block">বকেয়া যোগ (+)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('set')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      adjustType === 'set'
                        ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Edit className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="font-bold text-xs block">মোট বকেয়া নির্ধারণ (=)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {adjustType === 'add' ? 'যোগ করার পরিমাণ (টাকা ৳) *' : 'মোট বকেয়ার পরিমাণ (টাকা ৳) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400 font-black text-base">৳</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-300 font-black text-lg pl-8 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                  />
                </div>
              </div>

              {/* Real-time Calculation Summary */}
              {(() => {
                const target = customers.find((c) => c.id === adjustCustomerId);
                if (!target) return null;
                const inputVal = Number(adjustAmount) || 0;
                const finalDue = adjustType === 'add' ? target.currentDue + inputVal : inputVal;

                return (
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="text-amber-800 dark:text-amber-200 font-semibold">নতুন মোট বাকী হবে:</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">৳ {finalDue.toLocaleString('bn-BD')}</span>
                  </div>
                );
              })()}

              {/* Note / Reason */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  বিবরণ / কারণ
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="নোট বা কারণ..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustDueModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition cursor-pointer"
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
