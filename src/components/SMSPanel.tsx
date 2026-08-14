import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  History, 
  Check, 
  XCircle,
  AlertTriangle,
  HelpCircle,
  Info,
  Headphones,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { UITheme, UserAccount, SystemConfig } from '../types';
import { saveDocumentToFirestore } from '../lib/firestoreService';
import { collection, getDocs, db } from '../lib/firebase';

interface SMSPanelProps {
  activeTheme: UITheme;
  currentUser: UserAccount | null;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (newConfig: SystemConfig) => void;
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
  { id: 'pkg-100', smsCount: 100, amount: 100, label: '১০০ টি SMS', badge: 'স্টার্টার প্যাক', color: 'from-blue-600 to-indigo-600' },
  { id: 'pkg-500', smsCount: 500, amount: 500, label: '৫০০ টি SMS', badge: 'সেরা ভ্যালু', color: 'from-amber-600 to-orange-600', popular: true },
  { id: 'pkg-1000', smsCount: 1000, amount: 1000, label: '১,০০০ টি SMS', badge: 'জনপ্রিয়', color: 'from-emerald-600 to-teal-600' },
  { id: 'pkg-5000', smsCount: 5000, amount: 5000, label: '৫,০০০ টি SMS', badge: 'বিগ সেভার', color: 'from-pink-600 to-rose-600' },
];

export const SMSPanel: React.FC<SMSPanelProps> = ({ 
  currentUser,
  systemConfig,
  onUpdateSystemConfig
}) => {
  const [senderNumber, setSenderNumber] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [amount, setAmount] = useState<number>(500);
  const [manualBalance, setManualBalance] = useState<string>('');
  const paymentMethod = 'bKash';
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [requestsList, setRequestsList] = useState<TopUpRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Wizard States for Purchasing Flow (Admins / Sellers)
  const [checkoutStep, setCheckoutStep] = useState<'package' | 'gateway' | 'bkash_themed'>('package');
  const [selectedPackage, setSelectedPackage] = useState<typeof SMS_PACKAGES[0] | null>(null);
  const [selectedGatewayType, setSelectedGatewayType] = useState<'cashout' | 'sendmoney' | null>(null);

  const getPayAmount = () => {
    if (!selectedPackage) return 0;
    if (selectedGatewayType === 'sendmoney') {
      return Math.round(selectedPackage.amount * 1.015);
    }
    return selectedPackage.amount;
  };

  // Custom modal and status states
  const [confirmState, setConfirmState] = useState<{
    type: 'approve' | 'reject' | null;
    req: TopUpRequest | null;
  }>({ type: null, req: null });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Test SMS Sender States
  const [testPhone, setTestPhone] = useState<string>('01826990490');
  const [testMessage, setTestMessage] = useState<string>('মেসার্স জান্নাত সুজ থেকে টেস্ট মেসেজ।');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) {
      setTestResult({ success: false, message: 'মোবাইল নম্বর ও বার্তা লিখুন।' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      // Direct call to deployed Cloud Function with fallback
      const functionUrl = (import.meta as any).env?.VITE_FIREBASE_FUNCTION_SMS_URL || 
        'https://us-central1-stokm-fe3c1.cloudfunctions.net/sendSms';

      let response;
      try {
        response = await fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: testPhone.trim(), phone: testPhone.trim(), message: testMessage.trim() }),
        });
      } catch (fErr) {
        response = await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: testPhone.trim(), message: testMessage.trim() }),
        });
      }

      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.success || data.gatewayResponse)) {
        setTestResult({
          success: true,
          message: `সফলভাবে পাঠানো হয়েছে! ${data.message || 'SMS ডেলিভারি সম্পন্ন।'}`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || 'এসএমএস পাঠাতে সমস্যা হয়েছে।'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'নেটওয়ার্ক সংযোগ ত্রুটি।'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

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

  const selectPackageHandler = (pkg: typeof SMS_PACKAGES[0]) => {
    setSelectedPackage(pkg);
    setAmount(pkg.amount);
    setCheckoutStep('gateway');
    setSelectedGatewayType(null);
    setFormError(null);
    setSuccessMsg(null);
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

      setSuccessMsg(`৳${finalAmount} মূল্যের রিকোয়েস্টটি সফলভাবে পাঠানো হয়েছে! সুপার এডমিন ট্রানজেকশন আইডি: ${cleanTxId} যাচাই করে ব্যালেন্স যোগ করে দেবেন।`);
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

  const renderCheckoutOverlay = () => {
    if (checkoutStep === 'package' || !selectedPackage || currentUser?.role === 'super_admin') return null;
    const payAmount = getPayAmount();

    return (
      <div className="fixed inset-0 bg-[#f4f6fa] text-slate-800 z-50 overflow-y-auto flex flex-col justify-between items-center py-6 px-4 animate-fadeIn">
        {/* Navigation / Header Bar */}
        <div className="w-full max-w-md flex items-center justify-between pb-3 border-b border-slate-200">
          <button 
            onClick={() => {
              if (checkoutStep === 'bkash_themed') {
                setCheckoutStep('gateway');
              } else {
                setCheckoutStep('package');
                setSelectedPackage(null);
              }
              setFormError(null);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#e2125d]" />
            <span>{checkoutStep === 'bkash_themed' ? 'আগের ধাপ' : 'ফিরে যান'}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#e2125d] animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Secure Gateway</span>
          </div>
        </div>

        {/* Dynamic step rendering */}
        <div className="w-full flex-grow flex items-center justify-center py-4">
          {checkoutStep === 'gateway' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 w-full max-w-sm transition-all duration-300">
              <div className="text-center">
                <h3 className="text-sm font-black text-slate-800">পেমেন্ট মেথড</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">৳{selectedPackage.amount} • {selectedPackage.smsCount} SMS</p>
              </div>

              {/* Replica of the user's provided gateway mockup inside white bg */}
              <div className="bg-[#f5f7fa] text-slate-800 rounded-2xl p-4 shadow-inner space-y-5">
                
                {/* Top bar with icons (headset, question, info) */}
                <div className="flex justify-center gap-5 pt-1">
                  <div className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 shadow-sm">
                    <Headphones className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 shadow-sm">
                    <HelpCircle className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 shadow-sm">
                    <Info className="w-4 h-4 text-slate-600" />
                  </div>
                </div>

                {/* Mobile Banking / Net Banking Tabs */}
                <div className="flex rounded-lg overflow-hidden bg-slate-200 p-0.5">
                  <button className="w-1/2 text-center py-1.5 bg-[#0052cc] text-white font-bold text-[9px] rounded-md uppercase tracking-wider shadow-sm">
                    MOBILE BANKING
                  </button>
                  <button className="w-1/2 text-center py-1.5 text-slate-400 font-bold text-[9px] rounded-md uppercase tracking-wider cursor-not-allowed">
                    NET BANKING
                  </button>
                </div>

                {/* Gateway Options Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Cash Out */}
                  <div 
                    onClick={() => handleGatewaySelection('cashout')}
                    className="bg-white border border-slate-200 hover:border-[#e2125d] hover:shadow-md rounded-xl p-3 flex flex-col justify-between text-center cursor-pointer transition-all h-36"
                  >
                    <div className="flex justify-center py-1">
                      <span className="text-lg font-black text-[#e2125d] tracking-tight">bKash</span>
                    </div>
                    <div className="border-t border-slate-100 pt-2 flex flex-col justify-center flex-grow">
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">ক্যাশ আউট</span>
                      <p className="text-[8px] text-slate-500 mt-1 leading-snug">
                        এজেন্ট
                      </p>
                    </div>
                    <div className="mt-1 bg-slate-100 py-1 rounded text-[9px] font-bold text-slate-700">
                      ৳{selectedPackage.amount} BDT
                    </div>
                  </div>

                  {/* Option 2: Send Money */}
                  <div 
                    onClick={() => handleGatewaySelection('sendmoney')}
                    className="bg-white border border-slate-200 hover:border-[#e2125d] hover:shadow-md rounded-xl p-3 flex flex-col justify-between text-center cursor-pointer transition-all h-36"
                  >
                    <div className="flex justify-center py-1">
                      <span className="text-lg font-black text-[#e2125d] tracking-tight">bKash</span>
                    </div>
                    <div className="border-t border-slate-100 pt-2 flex flex-col justify-center flex-grow">
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">সেন্ড মানি</span>
                      <p className="text-[8px] text-slate-500 mt-1 leading-snug">
                        +১.৫% চার্জ
                      </p>
                    </div>
                    <div className="mt-1 bg-amber-500/10 py-1 rounded text-[9px] font-bold text-[#e2125d]">
                      ৳{Math.round(selectedPackage.amount * 1.015)} BDT
                    </div>
                  </div>
                </div>

                {/* Bottom Total Bar */}
                <div className="bg-[#deebff] text-[#0052cc] rounded-xl py-2.5 text-center font-bold text-xs tracking-wide border border-blue-100 shadow-sm font-mono">
                  Pay {selectedPackage.amount} BDT
                </div>
              </div>
            </div>
          )}

          {checkoutStep === 'bkash_themed' && (
            <div className="w-full max-w-xs transition-all duration-300">
              
              {/* Main bKash container */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 text-slate-800">
                
                {/* Header: iconic bKash Magenta Header */}
                <div className="bg-[#e2125d] text-white p-5 relative flex flex-col items-center text-center space-y-1.5">
                  <button 
                    onClick={() => {
                      setCheckoutStep('gateway');
                      setFormError(null);
                    }}
                    className="absolute left-4 top-5 text-white hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  
                  {/* bKash styled logo representation */}
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-black tracking-tight text-white">bKash</span>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  </div>

                  <span className="text-[10px] bg-black/20 px-2.5 py-0.5 rounded-full text-white/90 font-bold uppercase tracking-wider">
                    {selectedGatewayType === 'sendmoney' ? 'Send Money' : 'Cash Out'}
                  </span>

                  <div className="pt-1">
                    <span className="text-[10px] text-white/75 block">গ্রাহক: Linax Footwear</span>
                  </div>

                  <div className="pt-2">
                    <span className="text-2xl font-black font-mono">৳{payAmount}.00</span>
                    <span className="text-[9px] text-white/80 block mt-0.5 font-semibold">
                      {selectedGatewayType === 'sendmoney' 
                        ? `(৳${selectedPackage.amount} + ১.৫% চার্জ)` 
                        : `(ক্যাশ আউট)`}
                    </span>
                  </div>
                </div>

                {/* bKash Body content */}
                <div className="p-4 space-y-3 bg-[#fafafa]">
                  
                  {/* Step Banner / Guideline */}
                  <div className="bg-amber-500/10 border border-amber-500/20 text-slate-700 rounded-xl p-3 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1 text-[#b51248] text-[11px]">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>নির্দেশনা</span>
                    </p>
                    {selectedGatewayType === 'sendmoney' ? (
                      <p className="leading-relaxed text-slate-600 text-[10px]">
                        পার্সোনাল নম্বর: <strong className="text-[#e2125d] font-mono select-all">01826990490</strong> এ <strong className="text-[#e2125d] font-bold">৳{payAmount}</strong> সেন্ডমানি করুন।
                      </p>
                    ) : (
                      <p className="leading-relaxed text-slate-600 text-[10px]">
                        এজেন্ট নম্বর: <strong className="text-[#e2125d] font-mono select-all">01924260055</strong> এ <strong className="text-[#e2125d] font-bold">৳{payAmount}</strong> ক্যাশ আউট করুন।
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Input 1: sender phone number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-[#e2125d]" />
                        <span>বিকাশ নম্বর</span>
                      </label>
                      <input
                        type="text"
                        placeholder="যেমন: ০১৮২৬xxxxxx"
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-[#e2125d] text-slate-800 rounded-xl py-2 px-3 text-xs font-semibold tracking-wide font-mono focus:outline-none transition-all"
                        required
                      />
                    </div>

                    {/* Input 2: transaction ID */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#e2125d]" />
                        <span>TxID (ট্রানজেকশন আইডি)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="যেমন: AH76F92LK3"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-[#e2125d] text-slate-800 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-widest font-mono focus:outline-none transition-all"
                        required
                      />
                    </div>

                    {formError && (
                      <div className="p-2 bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 text-rose-600" />
                        <span className="font-semibold">{formError}</span>
                      </div>
                    )}

                    {/* bKash footer with buttons */}
                    <div className="flex gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutStep('gateway');
                          setFormError(null);
                        }}
                        className="w-1/3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-2/3 py-2 bg-[#e2125d] hover:bg-[#b51248] text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-lg shadow-pink-500/10"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'যাচাই হচ্ছে...' : 'নিশ্চিত করুন'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info to look extra professional */}
        <div className="w-full max-w-md text-center border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 gap-2">
          <p>© {new Date().getFullYear()} Linax Footwear.</p>
          <div className="flex items-center gap-2">
            <span>Secured SSL</span>
            <span>•</span>
            <span>bKash API</span>
          </div>
        </div>
      </div>
    );
  };

  const currentBalance = systemConfig.smsBalance ?? 50;
  const totalSent = systemConfig.totalSentSms ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {renderCheckoutOverlay()}
      {/* Mini Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">SMS প্যানেল</h2>
        </div>
        <button
          onClick={fetchTopupRequests}
          disabled={isLoadingRequests}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Basic Stat Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-xs font-semibold text-slate-400 block mb-1">ব্যালেন্স</span>
          <span className="text-2xl font-black text-amber-400 font-mono">{currentBalance} টি</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-xs font-semibold text-slate-400 block mb-1">মোট পাঠানো</span>
          <span className="text-2xl font-black text-blue-400 font-mono">{totalSent} টি</span>
        </div>
      </div>

      {/* Quick Test SMS Card */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>সরাসরি টেস্ট SMS পাঠান</span>
          </h3>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
            Gateway Live
          </span>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            testResult.success 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="font-semibold">{testResult.message}</span>
          </div>
        )}

        <form onSubmit={handleSendTestSMS} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">মোবাইল নম্বর:</label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="018XXXXXXXX"
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
              required
            />
          </div>
          <div className="md:col-span-6 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">টেস্ট বার্তা:</label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="বার্তা লিখুন..."
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 text-white rounded-lg px-3 py-2 text-xs focus:outline-none"
              required
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSendingTest}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
              <span>{isSendingTest ? 'যাচ্ছে...' : 'পাঠান'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 animate-bounce" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Top up Form / Super Admin settings */}
      {currentUser?.role === 'super_admin' ? (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              ব্যালেন্স আপডেট:
            </label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="number"
                placeholder="নতুন ব্যালেন্স"
                value={manualBalance}
                onChange={(e) => setManualBalance(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 w-44 font-mono text-center"
              />
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(manualBalance);
                  if (isNaN(val) || val < 0) {
                    setFormError('সঠিক সংখ্যা দিন');
                    return;
                  }
                  onUpdateSystemConfig({ ...systemConfig, smsBalance: val });
                  setSuccessMsg(`ব্যালেন্স ${val} টি সেট করা হয়েছে`);
                  setFormError(null);
                  setManualBalance('');
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex-shrink-0"
              >
                সেট
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* STEP 1: Package Selection Screen */}
          {checkoutStep === 'package' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
              <div className="text-center md:text-left">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 justify-center md:justify-start">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>প্যাকেজ</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SMS_PACKAGES.map((pkg) => (
                  <div 
                    key={pkg.id}
                    onClick={() => selectPackageHandler(pkg)}
                    className={`relative overflow-hidden bg-slate-900 hover:bg-slate-800 border ${pkg.popular ? 'border-amber-500/60' : 'border-slate-800'} hover:border-amber-500 rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 hover:shadow-lg group flex flex-col justify-between h-40`}
                  >
                    {pkg.badge && (
                      <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        {pkg.badge}
                      </span>
                    )}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-1">প্যাকেজ</span>
                      <span className="text-sm font-bold text-white block group-hover:text-amber-400 transition-colors">{pkg.label}</span>
                    </div>

                    <div className="mt-4 pb-2">
                      <div className="text-2xl font-black text-amber-400 font-mono">৳{pkg.amount}</div>
                      <span className="text-[9px] text-slate-500 block mt-1">১ টাকা = ১ SMS</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Log */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <span>ইতিহাস</span>
          </h3>
        </div>

        {actionSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}

        {isLoadingRequests ? (
          <div className="py-4 text-center text-slate-400 text-xs">ডাটা লোড হচ্ছে...</div>
        ) : requestsList.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-xs">কোনো রেকর্ড নেই।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2">তারিখ</th>
                  <th className="py-2 px-2">SMS</th>
                  <th className="py-2 px-2">মূল্য</th>
                  <th className="py-2 px-2">নম্বর</th>
                  <th className="py-2 px-2">TxID</th>
                  <th className="py-2 px-2 text-center">অবস্থা</th>
                  {currentUser?.role === 'super_admin' && (
                    <th className="py-2 px-2 text-right">অ্যাকশন</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {requestsList.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-900/10">
                    <td className="py-2.5 px-2 text-[10px] text-slate-400">{req.date}</td>
                    <td className="py-2.5 px-2 font-bold text-amber-400">{req.smsCount} টি</td>
                    <td className="py-2.5 px-2 font-mono">৳{req.amount}</td>
                    <td className="py-2.5 px-2">
                      <span className="font-bold text-[#e2125d] text-[10px]">bKash</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{req.senderNumber}</span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-amber-400 select-all">{req.transactionId}</td>
                    <td className="py-2.5 px-2 text-center">
                      {req.status === 'pending' ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-bold">পেন্ডিং</span>
                      ) : req.status === 'approved' ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">অনুমোদিত</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-bold">বাতিল</span>
                      )}
                    </td>
                    {currentUser?.role === 'super_admin' && (
                      <td className="py-2.5 px-2 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => triggerApprove(req)}
                              className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded flex items-center gap-0.5 cursor-pointer"
                              title="অনুমোদন করুন"
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => triggerReject(req)}
                              className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded flex items-center gap-0.5 cursor-pointer"
                              title="বাতিল করুন"
                            >
                              <XCircle className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-500 font-semibold uppercase">Done</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {confirmState.req && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${confirmState.type === 'approve' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {confirmState.type === 'approve' ? <Check className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {confirmState.type === 'approve' ? 'রিকোয়েস্ট অনুমোদন করুন' : 'রিকোয়েস্ট বাতিল করুন'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  আপনি কি ট্রানজেকশন আইডি <strong className="text-amber-400 font-mono">{confirmState.req.transactionId}</strong> থেকে আসা <strong className="text-white">৳{confirmState.req.amount}</strong> মূল্যের রিকোয়েস্টটি {confirmState.type === 'approve' ? 'অনুমোদন' : 'বাতিল'} করতে চান?
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
                onClick={confirmState.type === 'approve' ? handleApproveConfirm : handleRejectConfirm}
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
