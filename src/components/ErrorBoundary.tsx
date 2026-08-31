import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('lixa_active_user');
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-amber-500/30">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                সাময়িক ত্রুটি দেখা দিয়েছে
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                অ্যাপ্লিকেশনে একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। আপনার ডেটা ক্লাউড ডেটাবেজে সম্পূর্ণ সুরক্ষিত রয়েছে। নিচের বাটনে ক্লিক করে অ্যাপটি রিলোড করুন।
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-left overflow-auto max-h-32 text-[11px] font-mono text-rose-300/80">
                {this.state.error.toString()}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                অ্যাপ রিলোড করুন (Reload)
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Database className="w-3.5 h-3.5 text-slate-400" />
                ক্যাশ রিসেট করে ফ্রেশ স্টার্ট
              </button>
            </div>

            <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
              মেসার্স জান্নাত সুজ ম্যানেজমেন্ট সিস্টেম • প্রোডাকশন গার্ড
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
