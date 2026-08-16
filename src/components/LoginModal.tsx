import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { Phone, Lock, Eye, EyeOff, LogIn, AlertCircle, Footprints, X, ShoppingBag, Store, User, MapPin, UserPlus, CheckCircle2, Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register form state
  const [regShopName, setRegShopName] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regAddress, setRegAddress] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [regSubmitting, setRegSubmitting] = useState<boolean>(false);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  const { t } = useLanguage();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    const cleanPhone = loginIdentifier.replace(/\D/g, '');
    const password = loginPassword.trim();

    if (!identifier || !password) {
      setErrorMsg('মোবাইল নম্বর/ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।');
      return;
    }

    setLoginLoading(true);

    setTimeout(() => {
      // Find matching user by Phone, Email, or loginId
      const foundUser = userAccounts.find((u) => {
        const uPhone = (u.phone || '').replace(/\D/g, '');
        const uLogin = (u.loginId || '').toLowerCase().trim();
        const uEmail = (u.email || '').toLowerCase().trim();

        const matchesIdentifier =
          (cleanPhone.length >= 10 && uPhone.includes(cleanPhone)) ||
          uLogin === identifier ||
          uEmail === identifier ||
          (u.phone && u.phone.trim() === loginIdentifier.trim());

        return matchesIdentifier;
      });

      if (!foundUser) {
        setErrorMsg('মোবাইল নম্বর/ইমেইল বা লগইন আইডি খুঁজে পাওয়া যায়নি!');
        setLoginLoading(false);
        return;
      }

      if (!foundUser.isActive) {
        setErrorMsg('আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে। কর্তৃপক্ষের সাথে যোগাযোগ করুন।');
        setLoginLoading(false);
        return;
      }

      // Check password (allow default demo pass if empty or match)
      if (foundUser.password && foundUser.password !== password) {
        setErrorMsg('ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড প্রদান করুন।');
        setLoginLoading(false);
        return;
      }

      onLoginSuccess(foundUser);
      setLoginLoading(false);
    }, 250);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRegSuccessMsg(null);

    if (!regShopName.trim() || !regName.trim() || !regPhone.trim() || !regPassword.trim()) {
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
        password: regPassword.trim(),
      });

      setRegSuccessMsg('আপনার দোকান সফলভাবে রেজিস্টার হয়েছে! স্বাগতম।');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border-b border-indigo-900/50 text-center relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-slate-950/60 text-slate-400 hover:text-white transition cursor-pointer"
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
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
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
            /* Standard Phone/Email/ID + Password Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone Number <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Phone Number"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loginLoading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}</span>
              </button>

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
            </form>
          ) : (
            /* Shopkeeper Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
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
                  মোবাইল নম্বর (Phone Number) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Phone Number"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  পাসওয়ার্ড (Password) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-10 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
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
                  <span>{regSubmitting ? 'প্রসেসিং হচ্ছে...' : 'দোকান রেজিস্টার করুন'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
          {t('store_name')} • ম্যানেজমেন্ট সিস্টেম
        </div>

      </div>
    </div>
  );
};
