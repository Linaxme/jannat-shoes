import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  Receipt,
  Store,
  User,
  Boxes,
  Clock,
  X,
} from 'lucide-react';
import { TrashItem, TrashItemType, UserAccount } from '../types';
import { toBnDigit } from '../utils/formatters';

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
  onRestoreItem,
  onPermanentDeleteItem,
  onRestoreAll,
  onEmptyTrash,
}) => {
  const [selectedType, setSelectedType] = useState<TrashItemType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation modals
  const [itemToPermanentDelete, setItemToPermanentDelete] = useState<TrashItem | null>(null);
  const [itemToRestore, setItemToRestore] = useState<TrashItem | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showRestoreAllConfirm, setShowRestoreAllConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const counts = useMemo(() => ({
    all: trashItems.length,
    order: trashItems.filter((i) => i.itemType === 'order').length,
    customer: trashItems.filter((i) => i.itemType === 'customer').length,
    user: trashItems.filter((i) => i.itemType === 'user').length,
    product: trashItems.filter((i) => i.itemType === 'product').length,
  }), [trashItems]);

  const filteredItems = useMemo(() => {
    let result = trashItems;

    if (selectedType !== 'all') {
      result = result.filter((item) => item.itemType === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => (
        item.title?.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.details?.toLowerCase().includes(q)
      ));
    }

    return [...result].sort(
      (a, b) => new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime()
    );
  }, [trashItems, selectedType, searchQuery]);

  const getItemTypeConfig = (type: TrashItemType) => {
    switch (type) {
      case 'order':
        return {
          label: 'মেমো',
          icon: Receipt,
          colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        };
      case 'customer':
        return {
          label: 'দোকান',
          icon: Store,
          colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'user':
        return {
          label: 'ইউজার',
          icon: User,
          colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      case 'product':
        return {
          label: 'পণ্য',
          icon: Boxes,
          colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('bn-BD', {
        day: 'numeric',
        month: 'short',
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
    <div className="space-y-4">
      {/* Minimal Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-black text-rose-400 tracking-wide whitespace-nowrap flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            রিসাইকেল বিন
          </span>
          <span className="text-xs px-2 py-0.5 bg-rose-500/10 text-rose-300 font-mono rounded-full border border-rose-500/20 font-bold">
            {toBnDigit(trashItems.length)} টি
          </span>
          <div className="h-0.5 bg-gradient-to-r from-rose-500/30 via-slate-800 to-transparent flex-1" />
        </div>

        {trashItems.length > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onRestoreAll && (
              <button
                type="button"
                onClick={() => setShowRestoreAllConfirm(true)}
                className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>সব রিস্টোর</span>
              </button>
            )}
            {onEmptyTrash && (
              <button
                type="button"
                onClick={() => setShowEmptyConfirm(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>খালি করুন</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'all'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <span>সব</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedType === 'all' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {toBnDigit(counts.all)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('order')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'order'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>মেমো</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedType === 'order' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {toBnDigit(counts.order)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('customer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'customer'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>দোকান</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedType === 'customer' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {toBnDigit(counts.customer)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('user')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'user'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ইউজার</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedType === 'user' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {toBnDigit(counts.user)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('product')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedType === 'product'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>পণ্য</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedType === 'product' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {toBnDigit(counts.product)}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="খুঁজুন..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
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

      {/* Item List */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl py-12 text-center">
          <Trash2 className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-slate-400">
            {trashItems.length === 0 ? 'রিসাইকেল বিন খালি' : 'কোনো আইটেম পাওয়া যায়নি'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const config = getItemTypeConfig(item.itemType);
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition flex flex-col justify-between gap-2.5 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${config.colorClass}`}>
                      <Icon className="w-3 h-3" />
                      <span>{config.label}</span>
                    </span>

                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(item.trashedAt)}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      {item.title}
                    </h4>
                    {item.subtitle && (
                      <p className="text-xs text-slate-300 mt-0.5 font-medium">
                        {item.subtitle}
                      </p>
                    )}
                    {item.details && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setItemToPermanentDelete(item)}
                    className="px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>স্থায়ী মুছুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemToRestore(item)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>রিস্টোর</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal: Restore Single Item */}
      {itemToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
            <h4 className="text-xs font-bold text-white">রিস্টোর নিশ্চিতকরণ</h4>

            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200">
              <span className="font-bold text-amber-300">{itemToRestore.title}</span>
              {itemToRestore.subtitle && <p className="text-slate-400 text-[11px] mt-0.5">{itemToRestore.subtitle}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setItemToRestore(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmRestore}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isProcessing ? '...' : 'রিস্টোর'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Permanent Delete Single Item */}
      {itemToPermanentDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/40 p-4 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
            <h4 className="text-xs font-bold text-rose-400">স্থায়ীভাবে মুছে ফেলা</h4>

            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200">
              <span className="font-bold text-white">{itemToPermanentDelete.title}</span>
              {itemToPermanentDelete.subtitle && <p className="text-slate-400 text-[11px] mt-0.5">{itemToPermanentDelete.subtitle}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setItemToPermanentDelete(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmPermanentDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isProcessing ? '...' : 'স্থায়ী মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Restore All Items */}
      {showRestoreAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
            <h4 className="text-xs font-bold text-white">সব রিস্টোর ({toBnDigit(trashItems.length)} টি) করবেন?</h4>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowRestoreAllConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmRestoreAll}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isProcessing ? '...' : 'সব রিস্টোর'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Empty All Trash */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/40 p-4 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
            <h4 className="text-xs font-bold text-rose-400">ট্র্যাশ খালি ({toBnDigit(trashItems.length)} টি) করবেন?</h4>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowEmptyConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmEmptyTrash}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isProcessing ? '...' : 'খালি করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
