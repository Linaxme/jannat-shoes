import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  RefreshCw, 
  Send, 
  History, 
  Check, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Zap,
  PhoneCall,
  Copy,
  X,
  Trash2,
  Eye,
  RotateCw,
  Search,
  Filter,
  Clock,
  User,
  FileText
} from 'lucide-react';
import { UITheme, UserAccount, SystemConfig, SMSLog } from '../types';
import { saveDocumentToFirestore, deleteDocumentFromFirestore } from '../lib/firestoreService';
import { collection, getDocs, db } from '../lib/firebase';

interface SMSPanelProps {
  activeTheme: UITheme;
  currentUser: UserAccount | null;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (newConfig: SystemConfig) => void;
  smsLogs?: SMSLog[];
  onTriggerTestSMS?: (phone: string, message?: string) => Promise<boolean>;
  onRetrySMS?: (log: SMSLog) => Promise<boolean>;
  onDeleteLog?: (logId: string) => Promise<void>;
  onClearAllLogs?: () => Promise<void>;
}

interface TopUpRequest {
  id: string;
  date: string;
  smsCount: number;
  amount: number;
  paymentMethod: string;
  senderNumber: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
}

const SMS_PACKAGES = [
  { id: 'pkg-100', smsCount: 100, amount: 100, label: '১০০ টি SMS', badge: 'বেসিক', rate: '৳১.০০ / SMS', color: 'from-blue-600 to-indigo-600' },
  { id: 'pkg-250', smsCount: 250, amount: 225, label: '২৫০ টি SMS', badge: '১০% ছাড়', rate: '৳০.৯০ / SMS', color: 'from-cyan-600 to-teal-600' },
  { id: 'pkg-1000', smsCount: 1000, amount: 850, label: '১,০০০ টি SMS', badge: '১৫% ছাড়', rate: '৳০.৮৫ / SMS', color: 'from-amber-600 to-orange-600', popular: true },
  { id: 'pkg-3000', smsCount: 3000, amount: 2400, label: '৩,০০০ টি SMS', badge: 'সর্বোচ্চ ২০% ছাড়', rate: '৳০.৮০ / SMS', color: 'from-pink-600 to-rose-600' },
];

export const SMSPanel: React.FC<SMSPanelProps> = ({ 
  currentUser,
  systemConfig,
  onUpdateSystemConfig,
  smsLogs = [],
  onTriggerTestSMS,
  onRetrySMS,
  onDeleteLog,
  onClearAllLogs,
}) => {
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Primary Tab state: Super Admin defaults to 'logs'; regular admins and others to 'recharge'
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'recharge'>(() => isSuperAdmin ? 'logs' : 'recharge');

  // Logs state
  const [logsList, setLogsList] = useState<SMSLog[]>(smsLogs || []);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [searchLogQuery, setSearchLogQuery] = useState<string>('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [selectedMessageLog, setSelectedMessageLog] = useState<SMSLog | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [copiedLogMsg, setCopiedLogMsg] = useState<boolean>(false);

  // Test SMS Modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>('01826990490');
  const [testMsgText, setTestMsgText] = useState<string>('মেসার্স জান্নাত সুজ: টেস্ট এসএমএস সফল হয়েছে।');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testStatusMsg, setTestStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clear all logs modal
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState<boolean>(false);
  const [isClearingLogs, setIsClearingLogs] = useState<boolean>(false);

  const [senderNumber, setSenderNumber] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [amount, setAmount] = useState<number>(500);
  const [manualBalance, setManualBalance] = useState<string>('');
  const [personalNumberInput, setPersonalNumberInput] = useState<string>(systemConfig?.bkashPersonalNumber || '01826990490');
  const [agentNumberInput, setAgentNumberInput] = useState<string>(systemConfig?.bkashAgentNumber || '01924260055');
  const [isSavingNumbers, setIsSavingNumbers] = useState<boolean>(false);
  const paymentMethod = 'bKash';
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [requestsList, setRequestsList] = useState<TopUpRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Wizard States for Purchasing Flow (Admins / Sellers)
  const [checkoutStep, setCheckoutStep] = useState<'package' | 'confirm_pack' | 'gateway' | 'bkash_themed'>('package');
  const [selectedPackage, setSelectedPackage] = useState<typeof SMS_PACKAGES[0] | null>(null);
  const [selectedGatewayType, setSelectedGatewayType] = useState<'cashout' | 'sendmoney'>('cashout');
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);

  const getPayAmount = () => {
    if (!selectedPackage) return 0;
    if (selectedGatewayType === 'sendmoney') {
      return Math.round(selectedPackage.amount * 1.015);
    }
    return selectedPackage.amount;
  };

  const handleCopyNumber = (num: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
    }
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // Custom modal and status states
  const [confirmState, setConfirmState] = useState<{
    type: 'approve' | 'reject' | 'delete' | null;
    req: TopUpRequest | null;
  }>({ type: null, req: null });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchSMSLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const snap = await getDocs(collection(db, 'smsLogs'));
      const list: SMSLog[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SMSLog));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogsList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (smsLogs && smsLogs.length > 0) {
      setLogsList(smsLogs);
    } else {
      fetchSMSLogs();
    }
  }, [smsLogs, isSuperAdmin]);

  const handleRetry = async (log: SMSLog) => {
    if (!onRetrySMS) return;
    setRetryingLogId(log.id);
    try {
      const success = await onRetrySMS(log);
      if (success) {
        setSuccessMsg(`মেমো #${log.memoNo || log.phone} এ SMS পুনরায় সফলভাবে পাঠানো হয়েছে`);
        await fetchSMSLogs();
      }
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhoneNumber.trim()) {
      setTestStatusMsg({ type: 'error', text: 'সঠিক মোবাইল নম্বর দিন!' });
      return;
    }
    setIsSendingTest(true);
    setTestStatusMsg(null);
    try {
      if (onTriggerTestSMS) {
        const success = await onTriggerTestSMS(testPhoneNumber.trim(), testMsgText.trim());
        if (success) {
          setTestStatusMsg({ type: 'success', text: 'টেস্ট SMS সফলভাবে পাঠানো হয়েছে!' });
          setTimeout(() => {
            setIsTestModalOpen(false);
            setTestStatusMsg(null);
          }, 1200);
          await fetchSMSLogs();
        } else {
          setTestStatusMsg({ type: 'error', text: 'এসএমএস পাঠানো যায়নি। লগ দেখুন।' });
        }
      }
    } catch (err: any) {
      setTestStatusMsg({ type: 'error', text: err?.message || 'ত্রুটি হয়েছে' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDeleteIndividualLog = async (logId: string) => {
    if (onDeleteLog) {
      await onDeleteLog(logId);
      setLogsList(prev => prev.filter(l => l.id !== logId));
    } else {
      await deleteDocumentFromFirestore('smsLogs', logId);
      setLogsList(prev => prev.filter(l => l.id !== logId));
    }
  };

  const handleClearAllLogsConfirm = async () => {
    setIsClearingLogs(true);
    try {
      if (onClearAllLogs) {
        await onClearAllLogs();
      } else {
        for (const l of logsList) {
          await deleteDocumentFromFirestore('smsLogs', l.id);
        }
      }
      setLogsList([]);
      setIsClearLogsModalOpen(false);
      setSuccessMsg('সবগুলো SMS লগ সফলভাবে মুছে ফেলা হয়েছে');
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearingLogs(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logsList.filter(log => {
      if (logStatusFilter !== 'all' && log.status !== logStatusFilter) return false;
      if (logTypeFilter !== 'all' && log.type !== logTypeFilter) return false;
      if (searchLogQuery.trim()) {
        const q = searchLogQuery.toLowerCase().trim();
        const matchesPhone = log.phone?.toLowerCase().includes(q);
        const matchesName = log.recipientName?.toLowerCase().includes(q);
        const matchesMemo = log.memoNo?.toLowerCase().includes(q);
        const matchesMsg = log.message?.toLowerCase().includes(q);
        return matchesPhone || matchesName || matchesMemo || matchesMsg;
      }
      return true;
    });
  }, [logsList, logStatusFilter, logTypeFilter, searchLogQuery]);

  const fetchTopupRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const snap = await getDocs(collection(db, 'smsTopupRequests'));
      const list: TopUpRequest[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopUpRequest));
      list.sort((a, b) => b.date.localeCompare(a.date));
      setRequestsList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchTopupRequests();
  }, []);

  useEffect(() => {
    if (systemConfig?.bkashPersonalNumber) {
      setPersonalNumberInput(systemConfig.bkashPersonalNumber);
    }
    if (systemConfig?.bkashAgentNumber) {
      setAgentNumberInput(systemConfig.bkashAgentNumber);
    }
  }, [systemConfig?.bkashPersonalNumber, systemConfig?.bkashAgentNumber]);

  const handleSaveBkashNumbers = async () => {
    const pNum = personalNumberInput.trim();
    const aNum = agentNumberInput.trim();

    if (!pNum) {
      setFormError('পার্সোনাল বিকাশ নম্বর প্রয়োজন');
      return;
    }

    setIsSavingNumbers(true);
    try {
      const updatedConfig: SystemConfig = {
        ...systemConfig,
        bkashPersonalNumber: pNum,
        bkashAgentNumber: aNum || '01924260055',
      };
      onUpdateSystemConfig(updatedConfig);
      await saveDocumentToFirestore('systemConfig', systemConfig.id, updatedConfig);
      setSuccessMsg('বিকাশ নম্বর সফলভাবে আপডেট হয়েছে');
      setFormError(null);
    } catch (err) {
      console.error(err);
      setFormError('নম্বর সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSavingNumbers(false);
    }
  };

  const selectPackageHandler = (pkg: typeof SMS_PACKAGES[0]) => {
    setSelectedPackage(pkg);
    setAmount(pkg.amount);
    setSelectedGatewayType('cashout');
    setCheckoutStep('confirm_pack');
    setFormError(null);
    setSuccessMsg(null);
    setSenderNumber('');
    setTransactionId('');
  };

  const handleGatewaySelection = (type: 'cashout' | 'sendmoney') => {
    setSelectedGatewayType(type);
    setCheckoutStep('bkash_themed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!senderNumber || !transactionId) {
      setFormError('আপনার বিকাশ নম্বর ও ট্রানজেকশন আইডি দিন!');
      return;
    }

    if (senderNumber.length < 11) {
      setFormError('সঠিক বিকাশ নম্বর প্রদান করুন (কমপক্ষে ১১ ডিজিট)');
      return;
    }

    if (transactionId.length < 6) {
      setFormError('সঠিক ট্রানজেকশন আইডি প্রদান করুন');
      return;
    }

    setIsSubmitting(true);

    const cleanTxId = transactionId.trim().toUpperCase();
    const finalAmount = getPayAmount();
    const finalSmsCount = selectedPackage ? selectedPackage.smsCount : amount;

    // Create request with strict 'pending' status
    const newRequest: TopUpRequest = {
      id: 'REQ-' + Date.now().toString().slice(-6),
      date: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      smsCount: finalSmsCount,
      amount: finalAmount,
      paymentMethod: selectedGatewayType === 'sendmoney' ? 'bKash Send Money' : 'bKash Cash Out',
      senderNumber,
      transactionId: cleanTxId,
      status: 'pending'
    };

    try {
      await saveDocumentToFirestore('smsTopupRequests', newRequest.id, newRequest);

      setSuccessMsg('পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে। যাচাই শেষে ব্যালেন্স যুক্ত হবে।');
      setSenderNumber('');
      setTransactionId('');
      setCheckoutStep('package');
      setSelectedPackage(null);
      await fetchTopupRequests();
    } catch (err) {
      console.error(err);
      setFormError('সিস্টেম এরর হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerApprove = (req: TopUpRequest) => {
    setActionError(null);
    setActionSuccess(null);
    if (currentUser?.role !== 'super_admin') {
      setActionError('অনুমোদন করার অনুমতি শুধুমাত্র সুপার এডমিনের রয়েছে!');
      return;
    }
    setConfirmState({ type: 'approve', req });
  };

  const triggerReject = (req: TopUpRequest) => {
    setActionError(null);
    setActionSuccess(null);
    if (currentUser?.role !== 'super_admin') {
      setActionError('বাতিল করার অনুমতি শুধুমাত্র সুপার এডমিনের রয়েছে!');
      return;
    }
    setConfirmState({ type: 'reject', req });
  };

  const triggerDelete = (req: TopUpRequest) => {
    setActionError(null);
    setActionSuccess(null);
    if (currentUser?.role !== 'super_admin') {
      setActionError('মুছে ফেলার অনুমতি শুধুমাত্র সুপার এডমিনের রয়েছে!');
      return;
    }
    setConfirmState({ type: 'delete', req });
  };

  const handleApproveConfirm = async () => {
    const req = confirmState.req;
    if (!req) return;

    try {
      const updatedReq = { ...req, status: 'approved' as const };
      await saveDocumentToFirestore('smsTopupRequests', req.id, updatedReq);

      // Increase local SMS balance on systemConfig
      const currentBalance = systemConfig.smsBalance ?? 50;
      const newBalance = currentBalance + req.smsCount;
      const updatedConfig = { ...systemConfig, smsBalance: newBalance };
      
      onUpdateSystemConfig(updatedConfig);
      await saveDocumentToFirestore('systemConfig', systemConfig.id, updatedConfig);
      
      setActionSuccess(`রিকোয়েস্ট ${req.id} সফলভাবে অনুমোদিত হয়েছে এবং ${req.smsCount} এসএমএস ব্যালেন্স যুক্ত হয়েছে!`);
      setConfirmState({ type: null, req: null });
      await fetchTopupRequests();
    } catch (err) {
      console.error(err);
      setActionError('অনুমোদন করতে সমস্যা হয়েছে।');
    }
  };

  const handleRejectConfirm = async () => {
    const req = confirmState.req;
    if (!req) return;

    try {
      const updatedReq = { ...req, status: 'rejected' as const };
      await saveDocumentToFirestore('smsTopupRequests', req.id, updatedReq);
      
      setActionSuccess(`রিকোয়েস্ট ${req.id} বাতিল করা হয়েছে।`);
      setConfirmState({ type: null, req: null });
      await fetchTopupRequests();
    } catch (err) {
      console.error(err);
      setActionError('বাতিল করতে সমস্যা হয়েছে।');
    }
  };

  const handleDeleteConfirm = async () => {
    const req = confirmState.req;
    if (!req) return;

    try {
      await deleteDocumentFromFirestore('smsTopupRequests', req.id);
      setActionSuccess(`রিকোয়েস্ট ${req.id} সফলভাবে মুছে ফেলা হয়েছে।`);
      setConfirmState({ type: null, req: null });
      await fetchTopupRequests();
    } catch (err) {
      console.error(err);
      setActionError('মুছে ফেলতে সমস্যা হয়েছে।');
    }
  };

  const renderCheckoutOverlay = () => {
    if (checkoutStep === 'package' || !selectedPackage || currentUser?.role === 'super_admin') return null;
    const payAmount = getPayAmount();
    const currentPersonal = systemConfig?.bkashPersonalNumber || '01826990490';
    const currentAgent = systemConfig?.bkashAgentNumber || '01924260055';
    const activeNumber = selectedGatewayType === 'sendmoney' ? currentPersonal : currentAgent;
    const activeLabel = selectedGatewayType === 'sendmoney' ? 'পার্সোনাল নম্বর' : 'এজেন্ট নম্বর';

    const closeCheckout = () => {
      setCheckoutStep('package');
      setSelectedPackage(null);
      setFormError(null);
    };

    if (checkoutStep === 'confirm_pack') {
      return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm text-slate-800 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[360px] overflow-hidden my-auto p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">প্যাক নিশ্চিতকরণ</h3>
              </div>
              <button 
                type="button"
                onClick={closeCheckout}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pack summary card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">প্যাকেজ</span>
                <span className="font-bold text-slate-800">{selectedPackage.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">মূল্য</span>
                <span className="font-black text-[#e2136e] font-mono text-base">৳{selectedPackage.amount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">রেট</span>
                <span className="font-medium text-slate-600 font-mono">{selectedPackage.rate}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={closeCheckout}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => setCheckoutStep('bkash_themed')}
                className="w-full py-2.5 bg-[#e2136e] hover:bg-[#c2145e] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-md shadow-[#e2136e]/20"
              >
                কনফার্ম করুন
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm text-slate-800 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[390px] overflow-hidden my-auto">
          
          {/* Official bKash Magenta Header */}
          <div className="bg-[#e2136e] text-white px-5 pt-4 pb-5 relative">
            {/* Top Brand & Close Bar */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                {/* Official bKash Origami Bird */}
                <svg className="w-7 h-7" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M48 8 L10 52 L50 43 Z" fill="#ffffff" />
                  <path d="M48 8 L90 28 L54 47 Z" fill="#ffffff" opacity="0.88" />
                  <path d="M50 43 L54 47 L47 92 Z" fill="#ffffff" opacity="0.94" />
                  <path d="M54 47 L90 28 L74 66 Z" fill="#ffffff" opacity="0.78" />
                </svg>
                <span className="text-2xl font-black tracking-tight text-white font-sans">bKash</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white/95">
                  <PhoneCall className="w-2.5 h-2.5" />
                  <span>16247</span>
                </div>
                <button 
                  onClick={closeCheckout}
                  className="w-7 h-7 rounded-full bg-black/15 hover:bg-black/30 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="বন্ধ করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Merchant & Order Info */}
            <div className="border-t border-white/20 pt-3 flex items-center justify-between text-xs text-white/90">
              <div>
                <span className="text-[10px] text-white/70 block uppercase tracking-wider">Merchant</span>
                <span className="font-bold">Linax Footwear</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-white/70 block uppercase tracking-wider">Invoice</span>
                <span className="font-mono font-semibold">SMS-{selectedPackage.smsCount}</span>
              </div>
            </div>

            {/* Big Amount Banner */}
            <div className="mt-3 bg-white/10 rounded-xl p-3 text-center border border-white/15">
              <span className="text-[10px] text-white/80 block uppercase tracking-widest font-semibold">Amount to Pay</span>
              <div className="text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                ৳ {payAmount}.00
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 bg-[#fafafa]">
            
            {/* Payment Channel Tabs */}
            <div className="bg-slate-200/80 p-1 rounded-xl flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedGatewayType('cashout')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  selectedGatewayType === 'cashout'
                    ? 'bg-white text-[#e2136e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ক্যাশ আউট
                <span className="text-[10px] block font-normal text-slate-500">৳{selectedPackage.amount}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGatewayType('sendmoney')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  selectedGatewayType === 'sendmoney'
                    ? 'bg-white text-[#e2136e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                সেন্ড মানি
                <span className="text-[10px] block font-normal text-slate-500">৳{Math.round(selectedPackage.amount * 1.015)} (+১.৫%)</span>
              </button>
            </div>

            {/* Target Account Info Card with One-Tap Copy */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-semibold text-slate-500 block">
                    {activeLabel}
                  </span>
                  <span className="text-base font-bold font-mono text-[#e2136e] tracking-wider select-all">
                    {activeNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyNumber(activeNumber)}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    copiedNumber 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="নম্বর কপি করুন"
                >
                  {copiedNumber ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>কপি</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Inputs styled exactly like Official bKash Gateway */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  বিকাশ একাউন্ট নাম্বার
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="০১XXXXXXXXX"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-[#e2136e] focus:ring-2 focus:ring-[#e2136e]/20 text-slate-900 rounded-xl py-2.5 px-3 text-xs font-mono font-semibold focus:outline-none transition-all placeholder:text-slate-400 shadow-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  ট্রানজেকশন আইডি (TrxID)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: BL92KA87"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-[#e2136e] focus:ring-2 focus:ring-[#e2136e]/20 text-slate-900 rounded-xl py-2.5 px-3 text-xs font-bold uppercase font-mono tracking-widest focus:outline-none transition-all placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-normal shadow-xs"
                  required
                />
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Official bKash Dual Button Bar */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeCheckout}
                  className="w-full py-2.5 bg-[#e5e7eb] hover:bg-[#d1d5db] text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  CLOSE
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#e2136e] hover:bg-[#c2145e] text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-[#e2136e]/25 disabled:opacity-50"
                >
                  {isSubmitting ? 'VERIFYING...' : 'CONFIRM'}
                </button>
              </div>
            </form>

            {/* Official bKash Footer */}
            <div className="border-t border-slate-200 pt-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <PhoneCall className="w-3 h-3 text-[#e2136e]" />
                <span>24/7 হেল্পলাইন:</span>
                <span className="font-mono font-bold text-[#e2136e]">16247</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const currentBalance = systemConfig.smsBalance ?? 50;
  const totalSent = systemConfig.totalSentSms ?? 0;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {renderCheckoutOverlay()}
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">SMS প্যানেল</h2>
          </div>
        </div>
        <button
          onClick={fetchTopupRequests}
          disabled={isLoadingRequests}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
          title="রিফ্রেশ"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Compact Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl px-4 py-3 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">বর্তমান ব্যালেন্স</span>
            <div className="text-xl font-black text-amber-400 font-mono">{currentBalance} <span className="text-xs font-medium text-slate-400">টি</span></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>
        
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl px-4 py-3 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">মোট পাঠানো</span>
            <div className="text-xl font-black text-blue-400 font-mono">{totalSent} <span className="text-xs font-medium text-slate-400">টি</span></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Send className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="py-2.5 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Sub Tabs: Super Admin can toggle between SMS Delivery Logs & Packages/Recharge */}
      {isSuperAdmin && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>এসএমএস সেন্ডিং ও ডেলিভারি লগ</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              activeSubTab === 'logs' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {logsList.length}
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveSubTab('recharge')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'recharge'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>প্যাকেজ ও রিচার্জ</span>
            {requestsList.filter(r => r.status === 'pending').length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold">
                {requestsList.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* SMS Logs Section - Super Admin Only */}
      {isSuperAdmin && activeSubTab === 'logs' && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/60">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                placeholder="নম্বর / মেমো / নাম..."
                className="w-full bg-slate-950 border border-slate-700/80 text-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500 font-medium"
              />
              {searchLogQuery && (
                <button
                  type="button"
                  onClick={() => setSearchLogQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Buttons & Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Status Filters */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setLogStatusFilter('all')}
                  className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                    logStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  সব ({logsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogStatusFilter('success')}
                  className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                    logStatusFilter === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  সফল ({logsList.filter(l => l.status === 'success').length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogStatusFilter('failed')}
                  className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                    logStatusFilter === 'failed' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ব্যর্থ ({logsList.filter(l => l.status === 'failed').length})
                </button>
              </div>

              {/* Category Filter */}
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1.5 text-[11px] font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">সকল ধরন</option>
                <option value="order_placed">বুকিং অর্ডার</option>
                <option value="order_delivery">ডেলিভারি মেমো</option>
                <option value="payment_received">বকেয়া জমা</option>
                <option value="due_reminder">বকেয়া তাগদা</option>
                <option value="manual_test">টেস্ট মেসেজ</option>
              </select>

              {/* Test SMS Button */}
              <button
                type="button"
                onClick={() => {
                  setTestStatusMsg(null);
                  setIsTestModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-3 h-3" />
                <span>টেস্ট SMS</span>
              </button>

              {/* Refresh Logs Button */}
              <button
                type="button"
                onClick={fetchSMSLogs}
                disabled={isLoadingLogs}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                title="রিফ্রেশ"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>

              {/* Clear All Logs (Super Admin only) */}
              {isSuperAdmin && logsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearLogsModalOpen(true)}
                  className="p-1.5 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                  title="লগ মুছুন"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Logs List Table */}
          {isLoadingLogs ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-500" />
              <span>লগ লোড হচ্ছে...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              <span>কোনো SMS লগ রেকর্ড পাওয়া যায়নি</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[10.5px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-2">তারিখ ও সময়</th>
                    <th className="py-2.5 px-2">ধরন</th>
                    <th className="py-2.5 px-2">প্রাপক ও নম্বর</th>
                    <th className="py-2.5 px-2">মেমো/রশিদ</th>
                    <th className="py-2.5 px-2 text-center">স্ট্যাটাস</th>
                    <th className="py-2.5 px-2 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredLogs.map((log) => {
                    const isRetrying = retryingLogId === log.id;
                    const typeColor = 
                      log.type === 'order_delivery' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      log.type === 'order_placed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      log.type === 'payment_received' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      log.type === 'due_reminder' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-slate-700/30 text-slate-300 border-slate-700/50';

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                        {/* তারিখ ও সময় */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-slate-300">{log.date}</div>
                          <div className="text-[9.5px] text-slate-500">{log.time}</div>
                        </td>

                        {/* ধরন */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${typeColor}`}>
                            {log.typeLabel || log.type}
                          </span>
                        </td>

                        {/* প্রাপক ও মোবাইল */}
                        <td className="py-2 px-2">
                          <div className="font-bold text-slate-200 text-xs truncate max-w-[120px]">
                            {log.recipientName || 'অজানা প্রাপক'}
                          </div>
                          <div className="font-mono text-[10.5px] text-slate-400 select-all">
                            {log.phone || 'নম্বর নেই'}
                          </div>
                        </td>

                        {/* মেমো / রশিদ নং */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          {log.memoNo ? (
                            <span className="font-mono text-[10.5px] text-amber-400 font-bold select-all">
                              {log.memoNo}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">—</span>
                          )}
                        </td>

                        {/* স্ট্যাটাস */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {log.status === 'success' ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] font-bold">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>সফল ({log.cost || 1} SMS)</span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9.5px] font-bold">
                                <XCircle className="w-2.5 h-2.5" />
                                <span>ব্যর্থ</span>
                              </span>
                              {log.errorMessage && (
                                <span className="text-[8.5px] text-rose-400/90 font-medium max-w-[110px] truncate block mt-0.5" title={log.errorMessage}>
                                  {log.errorMessage}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* অ্যাকশন বাটন */}
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* বার্তা দেখুন */}
                            <button
                              type="button"
                              onClick={() => {
                                setCopiedLogMsg(false);
                                setSelectedMessageLog(log);
                              }}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                              title="সম্পূর্ণ বার্তা দেখুন"
                            >
                              <Eye className="w-3 h-3" />
                            </button>

                            {/* পুনরায় পাঠান (Retry) */}
                            {onRetrySMS && (
                              <button
                                type="button"
                                disabled={isRetrying}
                                onClick={() => handleRetry(log)}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  log.status === 'failed' 
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                                }`}
                                title="পুনরায় পাঠান"
                              >
                                <RotateCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                              </button>
                            )}

                            {/* ডিলিট (Super Admin) */}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteIndividualLog(log.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Package & Recharge Section */}
      {(!isSuperAdmin || activeSubTab === 'recharge') && (
        <div className="space-y-4">
          {/* Super Admin settings */}
          {currentUser?.role === 'super_admin' ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">সুপার এডমিন নিয়ন্ত্রণ</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
            {/* বিকাশ নম্বর পরিবর্তন */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">বিকাশ পেমেন্ট নম্বর:</span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] text-slate-400 w-16">পার্সোনাল:</span>
                  <input
                    type="text"
                    value={personalNumberInput}
                    onChange={(e) => setPersonalNumberInput(e.target.value)}
                    placeholder="পার্সোনাল নম্বর"
                    className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] text-slate-400 w-16">এজেন্ট:</span>
                  <input
                    type="text"
                    value={agentNumberInput}
                    onChange={(e) => setAgentNumberInput(e.target.value)}
                    placeholder="এজেন্ট নম্বর"
                    className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    disabled={isSavingNumbers}
                    onClick={handleSaveBkashNumbers}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingNumbers ? 'সংরক্ষণ হচ্ছে...' : 'নম্বর সংরক্ষণ'}
                  </button>
                </div>
              </div>
            </div>

            {/* ব্যালেন্স আপডেট */}
            <div className="space-y-2 md:border-l md:border-slate-800/60 md:pl-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5">এসএমএস ব্যালেন্স আপডেট:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="নতুন ব্যালেন্স"
                    value={manualBalance}
                    onChange={(e) => setManualBalance(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 flex-1 font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const val = parseInt(manualBalance);
                      if (isNaN(val) || val < 0) {
                        setFormError('সঠিক সংখ্যা দিন');
                        return;
                      }
                      const updatedConfig = { ...systemConfig, smsBalance: val };
                      onUpdateSystemConfig(updatedConfig);
                      await saveDocumentToFirestore('systemConfig', systemConfig.id, updatedConfig);
                      setSuccessMsg(`ব্যালেন্স ${val} টি সেট করা হয়েছে`);
                      setFormError(null);
                      setManualBalance('');
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    সেট
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Package Selection Section */
        checkoutStep === 'package' && (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">রিচার্জ প্যাকেজ</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SMS_PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id}
                  onClick={() => selectPackageHandler(pkg)}
                  className={`relative bg-slate-950/80 hover:bg-slate-900 border ${pkg.popular ? 'border-amber-500/60 ring-1 ring-amber-500/20' : 'border-slate-800'} hover:border-amber-400 rounded-xl p-3 cursor-pointer transition-all duration-150 group flex flex-col justify-between`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                      {pkg.label}
                    </span>
                    {pkg.badge && (
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${pkg.popular ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                        {pkg.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                    <span className="text-lg font-black text-amber-400 font-mono">৳{pkg.amount}</span>
                    <span className="text-[9.5px] text-slate-400 font-medium">{pkg.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* History Log */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>ইতিহাস</span>
          </span>
        </div>

        {actionSuccess && (
          <div className="py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="py-2 px-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}

        {isLoadingRequests ? (
          <div className="py-4 text-center text-slate-400 text-xs">ডাটা লোড হচ্ছে...</div>
        ) : requestsList.length === 0 ? (
          <div className="py-4 text-center text-slate-500 text-xs">কোনো রেকর্ড নেই</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="py-1.5 px-2">তারিখ</th>
                  <th className="py-1.5 px-2">SMS</th>
                  <th className="py-1.5 px-2">মূল্য</th>
                  <th className="py-1.5 px-2">নম্বর</th>
                  <th className="py-1.5 px-2">TxID</th>
                  <th className="py-1.5 px-2 text-center">অবস্থা</th>
                  {currentUser?.role === 'super_admin' && (
                    <th className="py-1.5 px-2 text-right">অ্যাকশন</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {requestsList.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/20">
                    <td className="py-2 px-2 text-[10px] text-slate-400 font-mono">{req.date}</td>
                    <td className="py-2 px-2 font-bold text-amber-400">{req.smsCount} টি</td>
                    <td className="py-2 px-2 font-mono">৳{req.amount}</td>
                    <td className="py-2 px-2">
                      <span className="font-mono text-slate-300 text-[10px]">{req.senderNumber}</span>
                    </td>
                    <td className="py-2 px-2 font-mono text-amber-400 select-all text-[11px]">{req.transactionId}</td>
                    <td className="py-2 px-2 text-center">
                      {req.status === 'pending' ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-bold">পেন্ডিং</span>
                      ) : req.status === 'approved' ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">অনুমোদিত</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-bold">বাতিল</span>
                      )}
                    </td>
                    {currentUser?.role === 'super_admin' && (
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => triggerApprove(req)}
                                className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded flex items-center gap-0.5 cursor-pointer"
                                title="অনুমোদন করুন"
                              >
                                <Check className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => triggerReject(req)}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold rounded flex items-center gap-0.5 cursor-pointer"
                                title="বাতিল করুন"
                              >
                                <XCircle className="w-2.5 h-2.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => triggerDelete(req)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

      {/* View Full SMS Message Modal */}
      {selectedMessageLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">এসএমএস বিবরণ</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedMessageLog.date} {selectedMessageLog.time}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMessageLog(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                <span className="text-slate-400">প্রাপক:</span>
                <span className="font-bold text-white">{selectedMessageLog.recipientName || 'অজানা'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                <span className="text-slate-400">মোবাইল:</span>
                <span className="font-mono font-bold text-amber-400 select-all">{selectedMessageLog.phone}</span>
              </div>
              {selectedMessageLog.memoNo && (
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                  <span className="text-slate-400">মেমো / ভাউচার:</span>
                  <span className="font-mono text-white select-all">{selectedMessageLog.memoNo}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                <span className="text-slate-400">স্ট্যাটাস:</span>
                <span className={selectedMessageLog.status === 'success' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {selectedMessageLog.status === 'success' ? `সফল (${selectedMessageLog.cost || 1} SMS)` : `ব্যর্থ: ${selectedMessageLog.errorMessage || 'ত্রুটি'}`}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-bold text-slate-300 block">বার্তার বিষয়বস্তু:</span>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed select-all">
                {selectedMessageLog.message}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>অক্ষর: {selectedMessageLog.message.length} টি</span>
                <span>প্রেরক: {selectedMessageLog.senderName || 'এডমিন'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(selectedMessageLog.message);
                  setCopiedLogMsg(true);
                  setTimeout(() => setCopiedLogMsg(false), 2000);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copiedLogMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLogMsg ? 'কপি হয়েছে' : 'বার্তা কপি'}</span>
              </button>
              {onRetrySMS && (
                <button
                  type="button"
                  disabled={retryingLogId === selectedMessageLog.id}
                  onClick={() => handleRetry(selectedMessageLog)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${retryingLogId === selectedMessageLog.id ? 'animate-spin' : ''}`} />
                  <span>পুনরায় পাঠান</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test SMS Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-bold text-white">টেস্ট SMS পাঠান</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">প্রাপকের মোবাইল নম্বর:</label>
                <input
                  type="text"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="018XXXXXXXX"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">টেস্ট বার্তা:</label>
                <textarea
                  rows={3}
                  value={testMsgText}
                  onChange={(e) => setTestMsgText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
                  required
                />
              </div>

              {testStatusMsg && (
                <div className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                  testStatusMsg.type === 'success' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  {testStatusMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{testStatusMsg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>পাঠানো হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>এসএমএস পাঠান</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Logs Modal */}
      {isClearLogsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">সবগুলো SMS লগ মুছুন</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  আপনি কি নিশ্চিত যে আপনি সকল SMS সেন্ডিং হিস্ট্রি ও ডেলিভারি লগ মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearLogsModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                ফিরে যান
              </button>
              <button
                type="button"
                disabled={isClearingLogs}
                onClick={handleClearAllLogsConfirm}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isClearingLogs ? 'মুছে ফেলা হচ্ছে...' : 'সব মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmState.req && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${
                confirmState.type === 'approve' 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'bg-rose-500/10 text-rose-400'
              }`}>
                {confirmState.type === 'approve' ? (
                  <Check className="w-6 h-6" />
                ) : confirmState.type === 'delete' ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {confirmState.type === 'approve' 
                    ? 'রিকোয়েস্ট অনুমোদন করুন' 
                    : confirmState.type === 'delete'
                    ? 'হিস্টোরি রেকর্ড মুছে ফেলুন'
                    : 'রিকোয়েস্ট বাতিল করুন'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {confirmState.type === 'delete' ? (
                    <>আপনি কি ট্রানজেকশন আইডি <strong className="text-amber-400 font-mono">{confirmState.req.transactionId}</strong> এর হিস্টোরি রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?</>
                  ) : (
                    <>আপনি কি ট্রানজেকশন আইডি <strong className="text-amber-400 font-mono">{confirmState.req.transactionId}</strong> থেকে আসা <strong className="text-white">৳{confirmState.req.amount}</strong> মূল্যের রিকোয়েস্টটি {confirmState.type === 'approve' ? 'অনুমোদন' : 'বাতিল'} করতে চান?</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmState({ type: null, req: null })}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                ফিরে যান
              </button>
              <button
                onClick={
                  confirmState.type === 'approve' 
                    ? handleApproveConfirm 
                    : confirmState.type === 'delete'
                    ? handleDeleteConfirm
                    : handleRejectConfirm
                }
                className={`px-4 py-1.5 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors ${
                  confirmState.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
