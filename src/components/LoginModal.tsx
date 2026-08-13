import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../types';
import { Lock, Phone, ShieldCheck, KeyRound, LogIn, AlertCircle, Eye, EyeOff, Footprints, UserCheck, X, ShoppingBag, Store, User, MapPin, UserPlus, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../lib/firebase';

interface LoginModalProps {
  userAccounts: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onRegisterShopkeeper?: (data: {
    shopName: string;
    name: string;
    phone: string;
    address: string;
    password?: string;
  }) => Promise<UserAccount>;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  userAccounts,
  onLoginSuccess,
  onRegisterShopkeeper,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Firebase Auth states
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register form state
  const [regShopName, setRegShopName] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regAddress, setRegAddress] = useState<string>('');
  const [regSubmitting, setRegSubmitting] = useState<boolean>(false);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  const { t } = useLanguage();

  useEffect(() => {
    // Initialize reCAPTCHA on component mount
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          // reCAPTCHA solved
        }
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanPhone = loginPhone.replace(/\D/g, '');
    
    if (cleanPhone.length < 11) {
      setErrorMsg('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }

    // Convert to +880 format for Firebase
    const formattedPhone = cleanPhone.startsWith('0') ? `+88${cleanPhone}` : `+880${cleanPhone}`;

    setAuthLoading(true);
    try {
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (error: any) {
      console.error('SMS Error:', error);
      setErrorMsg('এসএমএস পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      // Reset recaptcha if error
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          (window as any).recaptchaVerifier.reset(widgetId);
        });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setErrorMsg('সঠিক ৬ ডিজিটের ওটিপি প্রবেশ করান');
      return;
    }

    setAuthLoading(true);
    setErrorMsg(null);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      // Match with Firestore User Accounts
      const userPhone = user.phoneNumber?.replace('+88', '') || '';
      const foundUser = userAccounts.find((u) => u.phone.replace(/\D/g, '') === userPhone);

      if (foundUser) {
        if (!foundUser.isActive) {
          setErrorMsg('আপনার একাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে।');
          auth.signOut();
        } else {
          onLoginSuccess(foundUser);
        }
      } else {
        // User is authenticated but not registered in Stokm db
        setRegPhone(userPhone);
        setActiveTab('register');
        setErrorMsg('আপনার নাম্বারটি রেজিস্টার করা নেই। দয়া করে নিচের ফর্মটি পূরণ করুন।');
      }
    } catch (error: any) {
      console.error('OTP Error:', error);
      setErrorMsg('ওটিপি সঠিক নয়, অথবা মেয়াদ শেষ হয়েছে।');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRegSuccessMsg(null);

    if (!regShopName.trim() || !regName.trim() || !regPhone.trim()) {
      setErrorMsg('দয়া করে সকল বাধ্যতামূলক (*) তথ্য সঠিকভাবে পূরণ করুন।');
      return;
    }

    const cleanPhone = regPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 11) {
      setErrorMsg('১১ ডিজিটের সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    if (!onRegisterShopkeeper) {
      setErrorMsg('রেজিস্ট্রেশন করতে সমস্যা হচ্ছে। পরে আবার চেষ্টা করুন।');
      return;
    }

    setRegSubmitting(true);
    try {
      const registeredUser = await onRegisterShopkeeper({
        shopName: regShopName.trim(),
        name: regName.trim(),
        phone: regPhone.trim(),
        address: regAddress.trim() || 'ঢাকা',
        password: 'phone_auth', // Dummy password for legacy compatibility
      });

      setRegSuccessMsg('আপনার দোকান সফলভাবে রেজিস্টার ও নিবন্ধিত দোকানে সিংক হয়েছে!');
      setTimeout(() => {
        onLoginSuccess(registeredUser);
      }, 1000);
    } catch (err) {
      console.error('Registration failed:', err);
      setErrorMsg('রেজিস্ট্রেশন সম্পন্ন করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
    } finally {
      setRegSubmitting(false);
    }
  };

  const quickLogin = (acc: UserAccount) => {
    setErrorMsg(null);
    onLoginSuccess(acc);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">{t('super_admin')}</span>;
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">{t('admin')}</span>;
      case 'seller':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">{t('seller')}</span>;
    }
  };

  const demoSuperAdmin = userAccounts.find((u) => u.role === 'super_admin');
  const demoAdmin = userAccounts.find((u) => u.role === 'admin');
  const demoSellers = userAccounts.filter((u) => u.role === 'seller');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border-b border-indigo-900/50 text-center relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-slate-950/60 text-slate-400 hover:text-white transition"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="mx-auto w-14 h-14 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
            <Footprints className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">{t('store_name')}</h2>
          <p className="text-xs text-amber-400 font-semibold mt-1">{t('login_subtitle_text')}</p>
          
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('secure_auth_text')}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setStep('phone');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>লগইন করুন</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>নতুন দোকান রেজিস্ট্রেশন</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2.5 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {regSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 mb-4">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{regSuccessMsg}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            /* Login Form */
            <div className="space-y-4">
              {step === 'phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      মোবাইল নম্বর <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="tel"
                        required
                        placeholder="যেমন: 01712345678"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{authLoading ? 'এসএমএস পাঠানো হচ্ছে...' : 'OTP পাঠান'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-xs text-slate-400">
                      <span className="font-mono text-slate-200">{loginPhone}</span> নাম্বারে একটি ৬-ডিজিটের কোড পাঠানো হয়েছে।
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ওটিপি কোড (OTP) <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-lg text-center tracking-widest focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{authLoading ? 'যাচাই করা হচ্ছে...' : 'ভেরিফাই ও লগইন করুন'}</span>
                  </button>
                  
                  <div className="text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => { setStep('phone'); setOtp(''); }}
                      className="text-xs text-amber-500 hover:text-amber-400 underline underline-offset-4"
                    >
                      নাম্বার পরিবর্তন করুন
                    </button>
                  </div>
                </form>
              )}

              {/* Guest Browse Button */}
              {onClose && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>বিনা লগইনে প্রোডাক্ট ব্রাউজ করুন</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Shopkeeper Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  দোকানের নাম <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মা জুয়েলার্স / জান্নাত শু স্টোর"
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  প্রোপ্রাইটর / মালিকের নাম <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  মোবাইল নম্বর <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="১১ ডিজিটের মোবাইল নম্বর (যেমন: 01712345678)"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  দোকানের ঠিকানা / বাজার <span className="text-slate-500">(ঐচ্ছিক)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="যেমন: চকবাজার, ঢাকা"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{regSubmitting ? 'প্রসেসিং হচ্ছে...' : 'দোকান রেজিস্টার ও সিংক করুন'}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                * রেজিস্ট্রেশন সফল হলে ফোন নাম্বার দিয়ে লগইন করতে পারবেন।
              </p>
            </form>
          )}

          {/* Quick Demo Credentials Panel (Only in login mode) */}
          {activeTab === 'login' && (
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" /> {t('quick_demo_login_text')} (বিকল্প লগইন)
                </span>
              </div>

              <div className="space-y-2">
                {demoSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => quickLogin(demoSuperAdmin)}
                    className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-purple-500/30 rounded-xl text-left flex items-center justify-between transition group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition">
                          {demoSuperAdmin.name}
                        </span>
                        {getRoleBadge('super_admin')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t('login_id')} <span className="text-purple-400 font-mono">{demoSuperAdmin.loginId}</span> | {t('password')} <span className="font-mono text-slate-300">{demoSuperAdmin.password}</span>
                      </div>
                    </div>
                    <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  </button>
                )}

                {demoAdmin && (
                  <button
                    type="button"
                    onClick={() => quickLogin(demoAdmin)}
                    className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-amber-500/30 rounded-xl text-left flex items-center justify-between transition group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition">
                          {demoAdmin.name}
                        </span>
                        {getRoleBadge('admin')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t('login_id')} <span className="text-amber-400 font-mono">{demoAdmin.loginId}</span> | {t('password')} <span className="font-mono text-slate-300">{demoAdmin.password}</span>
                      </div>
                    </div>
                    <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
          {t('store_name')} • {t('app_version')}
        </div>

      </div>
    </div>
  );
};
