import React, { useState } from 'react';
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
} from 'lucide-react';

interface DueManagementProps {
  customers: Customer[];
  sellers: SalesRep[];
  paymentLogs: DuePaymentLog[];
  activeTheme: UITheme;
  currentUser?: UserAccount | null;
  onRecordPayment: (newLog: DuePaymentLog) => void;
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
  onTriggerSMS,
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('সব');
  const [viewMode, setViewMode] = useState<'customer_wise' | 'seller_wise' | 'logs'>('customer_wise');
  const [customerViewMode, setCustomerViewMode] = useState<'table' | 'card'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'card' : 'table'
  );

  // State to track manual sending status per customer
  const [sendingStatuses, setSendingStatuses] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'failed'>>({});

  // Payment Entry Modal
  const [selectedCustForPayment, setSelectedCustForPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('নগদ ক্যাশ');
  const [collectorName, setCollectorName] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('ক্যাশ বাকী পরিশোধ');

  const openPaymentModal = (cust: Customer) => {
    setSelectedCustForPayment(cust);
    setPaymentAmount(cust.currentDue);
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

  // Filter customers with due > 0 (newest / highest due first)
  const dueCustomers = customers
    .filter((c) => {
      if (c.currentDue <= 0) return false;

      const matchesSearch =
        (c.shopName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const totalMarketDue = customers.reduce((sum, c) => sum + c.currentDue, 0);

  // Calculate Due Grouped by Seller / Admin (only active due customers)
  const sellerWiseDue = React.useMemo(() => {
    const list = sellers.map((seller) => {
      const sellerCusts = customers.filter((c) => isCustomerOfSeller(c, seller) && c.currentDue > 0);
      const sellerTotalDue = sellerCusts.reduce((sum, c) => sum + c.currentDue, 0);
      return {
        seller,
        customerCount: sellerCusts.length,
        totalDue: sellerTotalDue,
        customers: sellerCusts,
      };
    });

    // Check if there are unassigned / open customers with due not matched to any seller/admin
    const unassignedCusts = customers.filter(
      (c) =>
        c.currentDue > 0 &&
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
        totalDue: unassignedCusts.reduce((sum, c) => sum + c.currentDue, 0),
        customers: unassignedCusts,
      });
    }

    return list.sort((a, b) => b.totalDue - a.totalDue);
  }, [sellers, customers]);

  // Handle Payment Form Submission
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForPayment) return;

    if (paymentAmount < 0 || discountAmount < 0) {
      alert('টাকা বা এডজাস্টের পরিমাণ ঋণাত্মক হতে পারবে না!');
      return;
    }

    if (paymentAmount === 0 && discountAmount === 0) {
      alert('সঠিক টাকা বা এডজাস্টের পরিমাণ প্রদান করুন!');
      return;
    }

    const totalDeduction = paymentAmount + discountAmount;
    const todayStr = getLocalDateStr(new Date());
    const prevDue = selectedCustForPayment.currentDue;
    const remDue = Math.max(0, prevDue - totalDeduction);
    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newLog: DuePaymentLog = {
      id: `pay-${Date.now()}`,
      date: todayStr,
      customerId: selectedCustForPayment.id,
      customerName: selectedCustForPayment.name,
      shopName: selectedCustForPayment.shopName,
      sellerId: selectedCustForPayment.assignedSellerId,
      sellerName: selectedCustForPayment.assignedSellerName,
      amountPaid: paymentAmount,
      discountAmount: discountAmount > 0 ? discountAmount : 0,
      previousDue: prevDue,
      remainingDue: remDue,
      paymentMethod,
      receivedBy: collectorName.trim() || currentUser?.name || 'ক্যাশিয়ার',
      receiptNo,
      notes: paymentNotes,
    };

    onRecordPayment(newLog);
    setSelectedCustForPayment(null);
    setPaymentAmount(0);
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
    <div className="space-y-6">
      
      {/* Minimal Due Management Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-black text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            বাকী খাতা
          </span>
          <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-slate-800 to-transparent flex-1" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('customer_wise')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                viewMode === 'customer_wise'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('customer')}
            </button>
            <button
              onClick={() => setViewMode('seller_wise')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                viewMode === 'seller_wise'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('seller')}
            </button>
            <button
              onClick={() => setViewMode('logs')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                viewMode === 'logs'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('history')}
            </button>
          </div>
        </div>
      </div>

      {/* Metric summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${activeTheme.cardClass} p-4 rounded-2xl flex items-center justify-between`}>
          <div>
            <p className="text-xs text-slate-400 font-medium">{t('total_due')}</p>
            <h3 className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
              {formatTaka(totalMarketDue)}
            </h3>
          </div>
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className={`${activeTheme.cardClass} p-4 rounded-2xl flex items-center justify-between`}>
          <div>
            <p className="text-xs text-slate-400 font-medium">{t('shopkeeper')}</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
              {toBnDigit(customers.filter((c) => c.currentDue > 0).length)} <span className="text-sm font-normal text-slate-400">{t('customers')}</span>
            </h3>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Store className="w-6 h-6" />
          </div>
        </div>

        <div className={`${activeTheme.cardClass} p-4 rounded-2xl flex items-center justify-between`}>
          <div>
            <p className="text-xs text-slate-400 font-medium">{t('total_collection')}</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {toBnDigit(paymentLogs.length)} <span className="text-sm font-normal text-slate-400">{t('receipts')}</span>
            </h3>
          </div>
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: CUSTOMER-WISE DUE LIST */}
      {viewMode === 'customer_wise' && (
        <div className="space-y-4">
          
          {/* Filters & View Switcher */}
          <div className={`${activeTheme.cardClass} p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between`}>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="খুঁজুন..."
                className="bg-transparent text-xs text-slate-100 placeholder-slate-500 w-full focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto justify-between sm:justify-end flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">সেলার:</span>
                <select
                  value={selectedSellerFilter}
                  onChange={(e) => setSelectedSellerFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="সব">সব সেলার ও এডমিন</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isAdmin || s.role === 'admin' ? '(এডমিন ও সেলার)' : ''} {s.area ? `(${s.area})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCustomerViewMode('table')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    customerViewMode === 'table'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  টেবিল
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerViewMode('card')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    customerViewMode === 'card'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  কার্ড
                </button>
              </div>
            </div>
          </div>

          {/* Customer Container */}
          <div className={`${activeTheme.cardClass} p-4 rounded-2xl`}>
            {customerViewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueCustomers.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500">
                    কোনো কাস্টমার বা বাকী হিসাব পাওয়া যায়নি।
                  </div>
                ) : (
                  dueCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 relative flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-md"
                    >
                      <div>
                        {/* Shop Header */}
                        <div className="flex items-start justify-between pb-2.5 border-b border-slate-800">
                          <div>
                            <h4 className="font-bold text-white text-sm">{cust.shopName}</h4>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-amber-400" />
                              প্রো: {cust.name}
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold">
                            {cust.assignedSellerName}
                          </span>
                        </div>

                        {/* Contact & Due */}
                        <div className="py-2.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">মোবাইল:</span>
                            <span className="font-mono text-slate-200">{cust.phone}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">ঠিকানা:</span>
                            <span className="text-slate-300 truncate max-w-[180px]">{cust.address}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                            <span className="text-slate-400 font-bold">বর্তমান বাকী:</span>
                            <span className="font-black text-rose-400 text-sm">{formatTaka(cust.currentDue)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPaymentModal(cust)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          টাকা আদায়
                        </button>
                        <button
                          onClick={() => handleMessageClick(cust)}
                          disabled={sendingStatuses[cust.id] === 'sending'}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            sendingStatuses[cust.id] === 'sent' || cust.lastDueReminderDate === new Date().toISOString().split('T')[0]
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 opacity-90'
                              : sendingStatuses[cust.id] === 'sending'
                              ? 'bg-slate-850 text-slate-400 border border-slate-700'
                              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                          }`}
                          title={cust.lastDueReminderDate === new Date().toISOString().split('T')[0] ? "আজকে ইতিমধ্যে তাগদা মেসেজ পাঠানো হয়েছে (আবারও পাঠাতে পারেন)" : "এসএমএস তাগদা পাঠান"}
                        >
                          {renderMessageButtonContent(cust)}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="min-w-[580px] w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 font-medium pb-2">
                      <th className="pb-3 pr-3">দোকানের নাম ও মালিক</th>
                      <th className="pb-3 px-3">মোবাইল ও ঠিকানা</th>
                      <th className="pb-3 px-3">দায়িত্বপ্রাপ্ত সেলার</th>
                      <th className="pb-3 px-3 text-right">বর্তমান বাকী (৳)</th>
                      <th className="pb-3 pl-3 text-right">অ্যাকশন / আদায়</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dueCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 pr-3">
                          <div className="font-bold text-slate-100 text-sm">{cust.shopName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-400" />
                            প্রো: {cust.name}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-300">
                          <div>{cust.phone}</div>
                          <div className="text-[10px] text-slate-400">{cust.address}</div>
                        </td>

                        <td className="py-3 px-3 text-indigo-300 font-medium">
                          {cust.assignedSellerName}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-black text-sm text-rose-400">{formatTaka(cust.currentDue)}</div>
                        </td>

                        <td className="py-3 pl-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openPaymentModal(cust)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow flex items-center gap-1 transition-all"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              টাকা আদায়
                            </button>

                            <button
                              onClick={() => handleMessageClick(cust)}
                              disabled={sendingStatuses[cust.id] === 'sending'}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                sendingStatuses[cust.id] === 'sent' || cust.lastDueReminderDate === new Date().toISOString().split('T')[0]
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 opacity-90'
                                  : sendingStatuses[cust.id] === 'sending'
                                  ? 'bg-slate-850 text-slate-400 border border-slate-700'
                                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                              }`}
                              title={cust.lastDueReminderDate === new Date().toISOString().split('T')[0] ? "আজকে ইতিমধ্যে তাগদা মেসেজ পাঠানো হয়েছে (আবারও পাঠাতে পারেন)" : "এসএমএস তাগদা পাঠান"}
                            >
                              {renderMessageButtonContent(cust)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW MODE 2: SELLER-WISE DUE BREAKDOWN */}
      {viewMode === 'seller_wise' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sellerWiseDue.map(({ seller, customerCount, totalDue, customers: sCusts }) => (
            <div key={seller.id} className={`${activeTheme.cardClass} p-5 rounded-2xl space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-base text-white">{seller.name}</h3>
                    {seller.isAdmin || seller.role === 'admin' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        এডমিন ও সেলার
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300">
                        ফিল্ড সেলার
                      </span>
                    )}
                  </div>
                  {seller.area && seller.area !== 'প্রধান শাখা (এডমিন ও সেলার)' && (
                    <p className="text-xs text-indigo-300 mt-0.5">{seller.area}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">আন্ডারে মোট বাকী</div>
                  <div className="text-lg font-black text-rose-400">{formatTaka(totalDue)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">
                  কাস্টমার তালিকা ({toBnDigit(customerCount)} জন):
                </div>
                {sCusts.length > 0 ? (
                  sCusts.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-200">{c.shopName}</div>
                        <div className="text-[10px] text-slate-400">{c.address}</div>
                      </div>
                      <div className="text-right font-bold text-rose-400">
                        {formatTaka(c.currentDue)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80 text-center text-xs text-slate-500 py-3">
                    এই সেলারের আন্ডারে বর্তমানে কোনো কাস্টমারের বাকী নেই (০ ৳ বাকী)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODE 3: PAYMENT COLLECTION LOGS */}
      {viewMode === 'logs' && (
        <div className={`${activeTheme.cardClass} p-5 rounded-2xl space-y-4`}>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            সাম্প্রতিক বাকী আদায়ের ইতিহাস
          </h3>

          <div className="overflow-x-auto no-scrollbar">
            <table className="min-w-[700px] w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-medium pb-2">
                  <th className="pb-3 pr-3">রিসিট নম্বর</th>
                  <th className="pb-3 px-3">তারিখ</th>
                  <th className="pb-3 px-3">দোকানের নাম</th>
                  <th className="pb-3 px-3">সেলার / রুট</th>
                  <th className="pb-3 px-3">আদায়কারী (কে আদায় করলো)</th>
                  <th className="pb-3 px-3 text-right">আদায়ের পরিমাণ (৳)</th>
                  <th className="pb-3 px-3 text-right">অবশিষ্ট বাকী (৳)</th>
                  <th className="pb-3 pl-3">পেমেন্ট মাধ্যম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[...paymentLogs]
                  .sort((a, b) => {
                    if (a.date !== b.date) {
                      return b.date.localeCompare(a.date);
                    }
                    return b.id.localeCompare(a.id);
                  })
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 pr-3 font-mono font-bold text-amber-300">{log.receiptNo}</td>
                    <td className="py-3 px-3 text-slate-300">{formatBnDate(log.date)}</td>
                    <td className="py-3 px-3 font-bold text-slate-100">{log.shopName}</td>
                    <td className="py-3 px-3 text-slate-300">{log.sellerName}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <User className="w-3 h-3" />
                        {log.receivedBy || 'ক্যাশিয়ার'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-400">
                      <div>+{formatTaka(log.amountPaid)}</div>
                      {log.discountAmount && log.discountAmount > 0 ? (
                        <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
                          (এডজাস্ট: {formatTaka(log.discountAmount)})
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-400">
                      {formatTaka(log.remainingDue)}
                    </td>
                    <td className="py-3 pl-3 text-slate-300">{log.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Entry Dialog */}
      {selectedCustForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              ক্যাশ/বাকী টাকা আদায়ের রশিদ এন্ট্রি
            </h3>

            <form onSubmit={handleSavePayment} className="space-y-3 text-xs">
              
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-amber-300 text-sm">{selectedCustForPayment.shopName}</div>
                <div className="text-slate-400">প্রো: {selectedCustForPayment.name}</div>
                <div className="text-rose-400 font-bold">বর্তমান মোট বাকী: {formatTaka(selectedCustForPayment.currentDue)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">আদায়কৃত ক্যাশ (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    placeholder=""
                    className="w-full bg-slate-950 border border-emerald-500 text-emerald-400 font-black text-base text-center rounded-xl py-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-semibold mb-1">এডজাস্ট (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder=""
                    className="w-full bg-slate-950 border border-amber-500/80 text-amber-300 font-black text-base text-center rounded-xl py-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Calculated Summary Preview Card */}
              <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>পূর্বের মোট বাকী:</span>
                  <span className="font-bold text-slate-200">{formatTaka(selectedCustForPayment.currentDue)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>নগদ আদায়:</span>
                  <span className="font-bold">+{formatTaka(paymentAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-amber-400 font-medium">
                    <span>এডজাস্টমেন্ট:</span>
                    <span className="font-bold">+{formatTaka(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-xs font-bold">
                  <span className="text-slate-300">হিসাবের পর অবশিষ্ট বাকী:</span>
                  <span className={`text-sm font-black ${
                    Math.max(0, selectedCustForPayment.currentDue - (paymentAmount + discountAmount)) === 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {formatTaka(Math.max(0, selectedCustForPayment.currentDue - (paymentAmount + discountAmount)))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">আদায়কারী (কে আদায় করলো) *</label>
                  <input
                    type="text"
                    required
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    placeholder="আদায়কারীর নাম"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="নগদ ক্যাশ">নগদ ক্যাশ</option>
                    <option value="বিকাশ / নগদ">বিকাশ / নগদ</option>
                    <option value="ব্যাংক ডিপোজিট">ব্যাংক ডিপোজিট</option>
                    <option value="চেক পেমেন্ট">চেক পেমেন্ট</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">নোট / বিবরণ</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedCustForPayment(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
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

    </div>
  );
};
