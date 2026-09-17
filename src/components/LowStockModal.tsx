import React, { useState, useMemo } from 'react';
import { ShoeProduct } from '../types';
import { toBnDigit } from '../utils/formatters';
import { X, AlertTriangle, Search, ExternalLink, Package } from 'lucide-react';

interface LowStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ShoeProduct[];
  onNavigateToStock: () => void;
}

export const LowStockModal: React.FC<LowStockModalProps> = ({
  isOpen,
  onClose,
  products,
  onNavigateToStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase().trim();
    return products.filter(
      (p) =>
        (p.articleCode && p.articleCode.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100">স্টক এলার্ট তালিকা</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {toBnDigit(products.length)} টি আইটেম
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="আর্টিকল কোড দিয়ে খুঁজুন..."
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-rose-500 font-medium"
            />
          </div>
        </div>

        {/* Product Items List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-xs sm:text-sm">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const cleanSize = p.sizeRange ? p.sizeRange.replace(/\(.*?\)/g, '').trim() : '৩৯-৪৪';
              return (
                <div
                  key={p.id}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-100 text-sm">{p.articleCode}</span>
                      {p.category && (
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {p.category}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      সাইজ: {cleanSize}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-rose-400 text-sm">
                      {toBnDigit(p.stockPairs)} <span className="text-xs font-normal text-slate-400">জোড়া</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ন্যূনতম: {toBnDigit(p.minStockAlert)} জোড়া
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">
            মোট: <strong className="text-rose-400">{toBnDigit(products.length)}</strong> টি প্রোডাক্ট
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToStock();
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>স্টক পেজে যান</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
            >
              বন্ধ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LowStockModal;
