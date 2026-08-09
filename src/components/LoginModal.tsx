import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { Lock, Phone, ShieldCheck, KeyRound, LogIn, AlertCircle, Eye, EyeOff, Footprints, CheckCircle, UserCheck, X, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginModalProps {
  userAccounts: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ userAccounts, onLoginSuccess, onClose }) => {
  const [loginId, setLoginId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedId = loginId.trim();
    if (!trimmedId || !password) {
      setErrorMsg('মোবাইল নম্বর এবং পাসওয়ার্ড প্রবেশ করান');
      return;
    }

    // Find account by phone, email or loginId
    const foundUser = userAccounts.find(
      (u) =>
        (u.loginId.toLowerCase() === trimmedId.toLowerCase() ||
          u.phone.replace(/[^0-9]/g, '') === trimmedId.replace(/[^0-9]/g, '') ||
          (u.email && u.email.toLowerCase() === trimmedId.toLowerCase())) &&
        u.password === password
    );

    if (!foundUser) {
      setErrorMsg('মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়!');
      return;
    }

    if (!foundUser.isActive) {
      setErrorMsg('আপনার একাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে। মেইন এডমিনের সাথে যোগাযোগ করুন।');
      return;
    }

    onLoginSuccess(foundUser);
  };

  const quickLogin = (acc: UserAccount) => {
    setLoginId(acc.loginId);
    setPassword(acc.password);
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

        {/* Login Form */}
        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Identifier Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('phone_email_label')} <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder={t('phone_email_placeholder')}
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('password_label')} <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={t('password_label')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('login_btn')}</span>
            </button>

            {/* Guest Browse Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>বিনা লগইনে প্রোডাক্ট ব্রাউজ করুন</span>
              </button>
            )}
          </form>

          {/* Quick Demo Credentials Panel */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" /> {t('quick_demo_login_text')}
              </span>
            </div>

            <div className="space-y-2">
              {demoSuperAdmin && (
                <button
                  type="button"
                  onClick={() => quickLogin(demoSuperAdmin)}
                  className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-purple-500/30 rounded-xl text-left flex items-center justify-between transition group"
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
                  className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-amber-500/30 rounded-xl text-left flex items-center justify-between transition group"
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

              {demoSellers.map((sellerAcc) => (
                <button
                  key={sellerAcc.id}
                  type="button"
                  onClick={() => quickLogin(sellerAcc)}
                  className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-blue-500/30 rounded-xl text-left flex items-center justify-between transition group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition">
                        {sellerAcc.name}
                      </span>
                      {getRoleBadge('seller')}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {t('login_id')} <span className="text-blue-400 font-mono">{sellerAcc.loginId}</span> | {t('password')} <span className="font-mono text-slate-300">{sellerAcc.password}</span>
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
          {t('store_name')} • {t('app_version')}
        </div>

      </div>
    </div>
  );
};
