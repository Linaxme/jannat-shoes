import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  Receipt,
  Store,
  User,
  Boxes,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Layers,
  X,
  Sparkles,
} from 'lucide-react';
import { TrashItem, TrashItemType, UserAccount } from '../types';
import { formatTaka, toBnDigit } from '../utils/formatters';

interface TrashManagementProps {
  trashItems: TrashItem[];
  currentUser?: UserAccount | null;
  onRestoreItem: (item: TrashItem) => Promise<void> | void;
  onPermanentDeleteItem: (itemId: string) => Promise<void> | void;
  onRestoreAll?: () => Promise<void> | void;
  onEmptyTrash?: () => Promise<void> | void;
}

export const TrashManagement: React.FC<TrashManagementProps> = ({
  trashItems = [],
  currentUser,
  onRestoreItem,
  onPermanentDeleteItem,
  onRestoreAll,
  onEmptyTrash,
}) => {
  const [selectedType, setSelectedType] = useState<TrashItemType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Confirmation state
  const [itemToPermanentDelete, setItemToPermanentDelete] = useState<TrashItem | null>(null);
  const [itemToRestore, setItemToRestore] = useState<TrashItem | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showRestoreAllConfirm, setShowRestoreAllConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: trashItems.length,
      order: trashItems.filter((i) => i.itemType === 'order').length,
      customer: trashItems.filter((i) => i.itemType === 'customer').length,
      user: trashItems.filter((i) => i.itemType === 'user').length,
      product: trashItems.filter((i) => i.itemType === 'product').length,
    };
  }, [trashItems]);

  // Filtered trash items
  const filteredItems = useMemo(() => {
    let result = trashItems;

    if (selectedType !== 'all') {
      result = result.filter((item) => item.itemType === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        return (
          item.title?.toLowerCase().includes(q) ||
          item.subtitle?.toLowerCase().includes(q) ||
          item.details?.toLowerCase().includes(q) ||
          item.trashedBy?.toLowerCase().includes(q)
        );
      });
    }

    // Sort newest trashed first
    return [...result].sort(
      (a, b) => new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime()
    );
  }, [trashItems, selectedType, searchQuery]);

  // Helpers for icons and styles
  const getItemTypeConfig = (type: TrashItemType) => {
    switch (type) {
      case 'order':
        return {
          label: 'মেমো / অর্ডার',
          icon: Receipt,
          colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          badgeText: 'মেমো',
        };
      case 'customer':
        return {
          label: 'দোকান / কাস্টমার',
          icon: Store,
          colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          badgeText: 'দোকান',
        };
      case 'user':
        return {
          label: 'ইউজার একাউন্ট',
          icon: User,
          colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          badgeText: 'ইউজার',
        };
      case 'product':
        return {
          label: 'জুতা / স্টক',
          icon: Boxes,
          colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          badgeText: 'পণ্য',
        };
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const handleConfirmRestore = async () => {
    if (!itemToRestore) return;
    setIsProcessing(true);
    try {
      await onRestoreItem(itemToRestore);
      setItemToRestore(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!itemToPermanentDelete) return;
    setIsProcessing(true);
    try {
      await onPermanentDeleteItem(itemToPermanentDelete.id);
      setItemToPermanentDelete(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRestoreAll = async () => {
    if (!onRestoreAll) return;
    setIsProcessing(true);
    try {
      await onRestoreAll();
      setShowRestoreAllConfirm(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEmptyTrash = async () => {
    if (!onEmptyTrash) return;
    setIsProcessing(true);
    try {
      await onEmptyTrash();
      setShowEmptyConfirm(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                <span>রিসাইকেল বিন (ট্র্যাশ)</span>
                <span className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono rounded-full border border-rose-500/30">
                  {toBnDigit(trashItems.length)} আইটেম
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ডিলেট করা মেমো, দোকান, ইউজার বা পণ্য সরাসরি নষ্ট না হয়ে এখানে জমা থাকে। যেকোনো সময় রিস্টোর করা যাবে।
              </p>
            </div>
          </div>
        </div>

        {/* Global actions */}
        {trashItems.length > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            {onRestoreAll && (
              <button
                type="button"
                onClick={() => setShowRestoreAllConfirm(true)}
                className="px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>সব রিস্টোর করুন</span>
              </button>
            )}
            {onEmptyTrash && (
              <button
                type="button"
                onClick={() => setShowEmptyConfirm(true)}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ট্র্যাশ খালি করুন</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <span>সকল</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedType === 'all' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {toBnDigit(counts.all)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('order')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'order'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>মেমো</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedType === 'order' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {toBnDigit(counts.order)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('customer')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'customer'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>দোকান</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedType === 'customer' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {toBnDigit(counts.customer)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('user')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'user'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ইউজার</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedType === 'user' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {toBnDigit(counts.user)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('product')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'product'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>জুতা/স্টক</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedType === 'product' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {toBnDigit(counts.product)}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="খুঁজুন (মেমো নং, দোকান, আর্টিকল)..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <Trash2 className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-300">
            {trashItems.length === 0 ? 'রিসাইকেল বিন একদম খালি!' : 'কোনো আইটেম পাওয়া যায়নি'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {trashItems.length === 0
              ? 'ভুলবশত কোনো মেমো, দোকান, ইউজার বা জুতা ডিলেট হলে তা এখানে আসবে এবং রিস্টোর করা যাবে।'
              : 'অন্য কোনো নাম বা ফিল্টার নির্বাচন করে আবার চেষ্টা করুন।'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredItems.map((item) => {
            const config = getItemTypeConfig(item.itemType);
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-200 shadow-md flex flex-col justify-between gap-3 relative group"
              >
                <div className="space-y-2">
                  {/* Top line: Badge & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 ${config.colorClass}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{config.label}</span>
                    </span>

                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatDateTime(item.trashedAt)}</span>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h4>
                    {item.subtitle && (
                      <p className="text-xs text-slate-300 mt-0.5 font-medium leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}
                    {item.details && (
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        {item.details}
                      </p>
                    )}
                  </div>

                  {/* Trashed by info */}
                  {item.trashedBy && (
                    <div className="text-[10px] text-slate-500 italic">
                      মুছেছেন: <span className="text-slate-400 not-italic font-semibold">{item.trashedBy}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setItemToPermanentDelete(item)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="স্থায়ীভাবে মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>স্থায়ীভাবে মুছুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemToRestore(item)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>রিস্টোর করুন</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal: Restore Single Item */}
      {itemToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">রিস্টোর নিশ্চিতকরণ</h4>
                <p className="text-xs text-slate-400">পুনরুদ্ধার করে মূল তালিকায় যুক্ত হবে</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
              <div className="text-xs font-bold text-amber-300">{itemToRestore.title}</div>
              {itemToRestore.subtitle && (
                <div className="text-[11px] text-slate-300">{itemToRestore.subtitle}</div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে এটি ট্র্যাশ থেকে রিস্টোর করে পুনরায় আগের সক্রিয় তালিকায় ফিরিয়ে নিতে চান?
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setItemToRestore(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isProcessing ? 'রিস্টোর হচ্ছে...' : 'হ্যাঁ, রিস্টোর করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Permanent Delete Single Item */}
      {itemToPermanentDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/50 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">স্থায়ীভাবে মুছে ফেলার সতর্কতা</h4>
                <p className="text-xs text-rose-400 font-semibold">সতর্কতা! এটি আর ফিরে পাওয়া যাবে না</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
              <div className="text-xs font-bold text-white">{itemToPermanentDelete.title}</div>
              {itemToPermanentDelete.subtitle && (
                <div className="text-[11px] text-slate-400">{itemToPermanentDelete.subtitle}</div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-xl text-rose-200">
              ⚠️ আপনি কি নিশ্চিতভাবে এই আইটেমটি ক্লাউড ডাটাবেজ থেকে চিরতরে মুছে ফেলতে চান?
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setItemToPermanentDelete(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isProcessing ? 'মুছে ফেলা হচ্ছে...' : 'স্থায়ীভাবে মুছুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Restore All Items */}
      {showRestoreAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">সব রিস্টোর নিশ্চিতকরণ</h4>
                <p className="text-xs text-slate-400">ট্র্যাশের সকল আইটেম সক্রিয় তালিকায় ফিরবে</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি ট্র্যাশে থাকা সকল <strong>({toBnDigit(trashItems.length)} টি)</strong> মেমো, দোকান, ইউজার ও প্রোডাক্ট রিস্টোর করতে চান?
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowRestoreAllConfirm(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmRestoreAll}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isProcessing ? 'রিস্টোর হচ্ছে...' : 'সব রিস্টোর করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Empty All Trash */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/50 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">ট্র্যাশ খালি করার চূড়ান্ত সতর্কতা</h4>
                <p className="text-xs text-rose-400 font-semibold">সকল আইটেম চিরতরে মুছে যাবে</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/30 border border-rose-500/20 p-3 rounded-xl text-rose-200">
              ⚠️ আপনি কি নিশ্চিতভাবে ট্র্যাশের সকল <strong>({toBnDigit(trashItems.length)} টি)</strong> আইটেম স্থায়ীভাবে মুছে ফেলতে চান? এটি করার পর কোনো ডাটা আর রিস্টোর করা সম্ভব হবে না।
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowEmptyConfirm(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmEmptyTrash}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isProcessing ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, ট্র্যাশ খালি করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
