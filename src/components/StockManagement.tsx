import React, { useState } from 'react';
import { ShoeProduct, UITheme, Order, UserAccount, SystemConfig } from '../types';
import { formatTaka, toBnDigit, pairsToCartonText } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Boxes,
  Search,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
  ImageIcon,
  ZoomIn,
  LayoutGrid,
  Grid2X2,
  Rows3,
  List,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface StockManagementProps {
  products: ShoeProduct[];
  orders?: Order[];
  activeTheme?: UITheme;
  currentUser?: UserAccount | null;
  systemConfig?: SystemConfig;
  onAddProduct: (newProduct: ShoeProduct) => void;
  onRestockProduct: (productId: string, addedPairs: number, buyPrice?: number) => void;
  onUpdateProduct?: (updatedProduct: ShoeProduct) => void;
  onDeleteProduct?: (productId: string) => void;
}

export const StockManagement: React.FC<StockManagementProps> = ({
  products,
  orders = [],
  currentUser,
  systemConfig,
  onAddProduct,
  onRestockProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const { t } = useLanguage();
  const canEditStock = !(
    currentUser &&
    currentUser.role === 'seller' &&
    systemConfig &&
    !systemConfig.allowSellerToEditStock
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card' | 'grid'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table'
  );

  const getBookedPairs = (productId: string) => {
    if (!orders) return 0;
    return orders.reduce((sum, order) => {
      const item = order.items.find((i) => i.productId === productId);
      return sum + (item ? item.totalPairs : 0);
    }, 0);
  };

  // Menu State
  const [activeMenuProductId, setActiveMenuProductId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShoeProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ShoeProduct | null>(null);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const [addedPairsInput, setAddedPairsInput] = useState<number>(12);

  const defaultCategories = ['জেন্টস ফর্মাল', 'জেন্টস ক্যাজুয়াল', 'স্পোর্টস কেডস', 'লেডিস হিল/স্যান্ডেল', 'বাচ্চাদের জুতা'];
  const categoriesList = systemConfig?.categories && systemConfig.categories.length > 0
    ? systemConfig.categories
    : defaultCategories;

  // Toggle state to show/hide buy price
  const [showBuyPrice, setShowBuyPrice] = useState(false);

  // New Product Form State (Product Name field completely removed)
  const [articleCode, setArticleCode] = useState('');
  const [category, setCategory] = useState<string>(categoriesList[0] || 'জেন্টস ক্যাজুয়াল');
  const [sizeRange, setSizeRange] = useState('৩৯-৪৪');
  const [buyPrice, setBuyPrice] = useState<number>(450);
  const [sellPrice, setSellPrice] = useState<number>(550);
  const [initialStockPairs, setInitialStockPairs] = useState<number>(120);
  const [imageUrl, setImageUrl] = useState('');

  // Edit Product Form State
  const [editArticleCode, setEditArticleCode] = useState('');
  const [editCategory, setEditCategory] = useState<string>('জেন্টস ক্যাজুয়াল');
  const [editSizeRange, setEditSizeRange] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState<number>(0);
  const [editSellPrice, setEditSellPrice] = useState<number>(0);
  const [editStockPairs, setEditStockPairs] = useState<number>(0);
  const [editImageUrl, setEditImageUrl] = useState('');

  // Image Preview Lightbox State
  const [previewImage, setPreviewImage] = useState<{ url: string; articleCode?: string } | null>(null);

  // Image Upload State
  const [isUploading, setIsUploading] = useState(false);
  const cloudName = localStorage.getItem('cloudinary_cloud_name') || 'aeuf3r8e';
  const uploadPreset = localStorage.getItem('cloudinary_upload_preset') || 'stock_m';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const activeCloudName = localStorage.getItem('cloudinary_cloud_name') || cloudName || 'aeuf3r8e';
      const activePreset = localStorage.getItem('cloudinary_upload_preset') || uploadPreset || 'stock_m';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', activePreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${activeCloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        if (isEdit) {
          setEditImageUrl(data.secure_url);
        } else {
          setImageUrl(data.secure_url);
        }
      } else {
        const errorMsg = data.error?.message || 'Cloudinary আপলোড সফল হয়নি';
        alert(`ক্লাউডিনারিতে আপলোড ব্যর্থ হয়েছে!\nকারণ: ${errorMsg}`);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isEdit) {
            setEditImageUrl(reader.result as string);
          } else {
            setImageUrl(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('Upload catch error:', err);
      alert('আপলোড করার সময় সমস্যা হয়েছে।');
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditImageUrl(reader.result as string);
        } else {
          setImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    return (
      p.articleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const totalStockPairs = products.reduce((sum, p) => sum + p.stockPairs, 0);
  const totalStockValueBuy = products.reduce((sum, p) => sum + p.stockPairs * p.buyPrice, 0);

  const presetShoeImages = [
    'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
  ];

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleCode.trim()) {
      alert('আর্টিকল কোড দেওয়া আবশ্যক!');
      return;
    }

    const cleanArticle = articleCode.toUpperCase().trim();

    const newProd: ShoeProduct = {
      id: `p-${Date.now()}`,
      articleCode: cleanArticle,
      name: cleanArticle,
      category,
      brand: 'জান্নাত সুজ',
      sizeRange,
      buyPrice,
      sellPrice: sellPrice > 0 ? sellPrice : buyPrice,
      retailPrice: 0,
      pairsPerCarton: 12,
      stockPairs: initialStockPairs,
      minStockAlert: 24,
      imageUrl: imageUrl.trim() || presetShoeImages[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onAddProduct(newProd);
    setShowAddModal(false);
    setArticleCode('');
    setImageUrl('');
  };

  const handleStartEdit = (p: ShoeProduct) => {
    setEditingProduct(p);
    setEditArticleCode(p.articleCode);
    setEditCategory(p.category || 'জেন্টস ক্যাজুয়াল');
    setEditSizeRange(p.sizeRange || '৩৯-৪৪');
    setEditBuyPrice(p.buyPrice);
    setEditSellPrice(p.sellPrice || p.buyPrice || 0);
    setEditStockPairs(p.stockPairs);
    setEditImageUrl(p.imageUrl);
    setActiveMenuProductId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editArticleCode.trim()) return;

    const cleanArticle = editArticleCode.toUpperCase().trim();
    const updated: ShoeProduct = {
      ...editingProduct,
      articleCode: cleanArticle,
      name: cleanArticle,
      category: editCategory,
      sizeRange: editSizeRange,
      buyPrice: editBuyPrice,
      sellPrice: editSellPrice,
      stockPairs: editStockPairs,
      imageUrl: editImageUrl.trim() || presetShoeImages[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    if (onUpdateProduct) {
      onUpdateProduct(updated);
    }
    setEditingProduct(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    if (onDeleteProduct) {
      onDeleteProduct(deletingProduct.id);
    }
    setDeletingProduct(null);
    setActiveMenuProductId(null);
  };

  const handleConfirmRestock = () => {
    if (!restockProductId) return;
    onRestockProduct(restockProductId, addedPairsInput);
    setRestockProductId(null);
  };

  return (
    <div className="space-y-6" onClick={() => setActiveMenuProductId(null)}>
      
      {/* Minimal Stock Header */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-amber-400" />
            স্টক হিসাব
          </span>
          <div className="h-px bg-gradient-to-r from-amber-500/40 via-slate-800 to-transparent flex-1" />
        </div>

        {canEditStock && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition cursor-pointer shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>স্টক যোগ করুন</span>
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">স্টকে মোট মজুদ জুতা</p>
          <h3 className="text-xl sm:text-2xl font-bold text-amber-300 mt-1">
            {toBnDigit(totalStockPairs)} <span className="text-xs font-normal text-slate-400">জোড়া</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            ডজন: {pairsToCartonText(totalStockPairs, 12)}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">মোট ক্রয়ের হিসাব (Stock Cost)</p>
          <h3 className="text-xl sm:text-2xl font-bold text-rose-400 mt-1">
            {showBuyPrice ? formatTaka(totalStockValueBuy) : '•••• ৳'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {showBuyPrice ? 'মজুদ জুতার ক্রয়মূল্য' : 'ক্রয়মূল্য গোপন রয়েছে (বাটন চাপুন)'}
          </p>
        </div>
      </div>

      {/* Search Input & View Mode Switcher */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="আর্টিকল কোড দিয়ে খুঁজুন..."
            className="bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 w-full focus:outline-none"
          />
        </div>

        {/* Action Controls Row: Left = Eye Icon, Right = View Mode Switcher */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Standalone Eye Icon Toggle */}
          <button
            type="button"
            onClick={() => setShowBuyPrice(!showBuyPrice)}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 ${
              showBuyPrice
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
            title={showBuyPrice ? "ক্রয় মূল্য লুকান" : "ক্রয় মূল্য দেখুন"}
          >
            {showBuyPrice ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Right: View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
              <span>{t('table_view')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>গ্রিড</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t('card_view')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stock Items Container */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl min-h-[300px]">
        
        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
            {filteredProducts.map((p) => {
              const isLowStock = p.stockPairs <= p.minStockAlert;
              const cleanSize = p.sizeRange ? p.sizeRange.replace(/\(.*?\)/g, '').trim() : '৩৯-৪৪';
              const isMenuOpen = activeMenuProductId === p.id;
              const bookedPairs = getBookedPairs(p.id);

              return (
                <div 
                  key={p.id} 
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:border-slate-700 transition-colors relative group"
                >
                  {/* Thumbnail Image */}
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-900 mb-2">
                    <img
                      src={p.imageUrl}
                      alt={p.articleCode}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80';
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage({ url: p.imageUrl, articleCode: p.articleCode });
                      }}
                      className="absolute bottom-1 right-1 bg-slate-950/80 text-amber-300 p-1 rounded-md shadow backdrop-blur-xs cursor-pointer"
                      title="ছবি বড় করে দেখুন"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    {isLowStock && (
                      <span className="absolute top-1 left-1 text-[9px] text-rose-300 bg-rose-950/90 border border-rose-500/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> স্টক কম
                      </span>
                    )}

                    {canEditStock && (
                      <div className="absolute top-1 right-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuProductId(isMenuOpen ? null : p.id);
                          }}
                          className="p-1 text-slate-300 hover:text-white bg-slate-950/80 hover:bg-slate-900 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          title="অপশনসমূহ"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <div 
                            className="absolute right-0 mt-1 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-amber-400" />
                              এডিট
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingProduct(p);
                                setActiveMenuProductId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              ডিলেট
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[11px] truncate">
                        {p.articleCode}
                      </span>
                      <div className="text-right leading-tight">
                        <span className="text-[11px] font-black text-emerald-400 block">{formatTaka(p.sellPrice || p.buyPrice)}</span>
                        <span className="text-[9px] font-bold text-rose-300/80 block">{showBuyPrice ? formatTaka(p.buyPrice) : '•••• ৳'}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                      <span>সাইজ: <strong className="text-slate-200">{cleanSize}</strong></span>
                    </div>

                    {/* Stock Details Box */}
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 space-y-0.5 text-[10px] mt-1">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>মজুদ:</span>
                        <strong className={`font-bold ${isLowStock ? 'text-rose-400' : 'text-slate-200'}`}>
                          {toBnDigit(p.stockPairs)} জোড়া
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>বুকড:</span>
                        <strong className="text-amber-300 font-bold">{toBnDigit(bookedPairs)} জোড়া</strong>
                      </div>
                      <div className="flex justify-between items-center text-emerald-400 border-t border-slate-800/80 pt-0.5 font-semibold">
                        <span>ফ্রি স্টক:</span>
                        <strong className="font-extrabold">{toBnDigit(Math.max(0, p.stockPairs - bookedPairs))} জোড়া</strong>
                      </div>
                    </div>
                  </div>

                  {/* Restock Button */}
                  {canEditStock && (
                    <button
                      onClick={() => {
                        setRestockProductId(p.id);
                        setAddedPairsInput(p.pairsPerCarton);
                      }}
                      className="mt-2 w-full py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      রি-স্টক
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((p) => {
              const isLowStock = p.stockPairs <= p.minStockAlert;
              const cleanSize = p.sizeRange ? p.sizeRange.replace(/\(.*?\)/g, '').trim() : '৩৯-৪৪';
              const isMenuOpen = activeMenuProductId === p.id;
              const bookedPairs = getBookedPairs(p.id);

              return (
                <div 
                  key={p.id} 
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors relative"
                >
                  <div className="flex items-start gap-3">
                    {/* Product Image Thumbnail */}
                    <div 
                      className="relative flex-shrink-0 cursor-pointer group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-sm w-16 h-16 sm:w-20 sm:h-20"
                      onClick={() => setPreviewImage({ url: p.imageUrl, articleCode: p.articleCode })}
                      title="ছবি বড় করে দেখতে ক্লিক করুন"
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.articleCode}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute bottom-1 right-1 bg-slate-950/80 text-amber-300 p-1 rounded-md shadow backdrop-blur-xs">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-1 pr-6">
                        <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 text-xs truncate">
                          {p.articleCode}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-0.5">
                        <div>সাইজ: <strong className="text-white font-bold">{cleanSize}</strong></div>
                        <div>বিক্রয় মূল্য: <strong className="text-emerald-400 font-extrabold">{formatTaka(p.sellPrice || p.buyPrice)}</strong></div>
                        <div>ক্রয় মূল্য: <strong className="text-rose-300 font-bold">{showBuyPrice ? formatTaka(p.buyPrice) : '•••• ৳'}</strong></div>
                      </div>

                      {isLowStock && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded-full border border-rose-500/30 font-bold">
                          <AlertTriangle className="w-3 h-3 text-rose-400" /> কম স্টক
                        </span>
                      )}
                    </div>

                    {/* 3-Dots Menu Button */}
                    {canEditStock && (
                      <div className="absolute top-2 right-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuProductId(isMenuOpen ? null : p.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                          title="অপশনসমূহ"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div 
                            className="absolute right-0 mt-1 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                              এডিট
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingProduct(p);
                                setActiveMenuProductId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              ডিলেট
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Bottom Row: Stock Quantity & Action */}
                  <div className="space-y-1.5 pt-2.5 border-t border-slate-800/80 text-xs mt-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">মোট মজুদ (Physical):</span>
                      <strong className={`font-bold ${isLowStock ? 'text-rose-400' : 'text-slate-200'}`}>
                        {toBnDigit(p.stockPairs)} জোড়া / {pairsToCartonText(p.stockPairs, p.pairsPerCarton)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">বুকড (Reserved):</span>
                      <strong className="text-amber-300 font-bold">
                        {toBnDigit(bookedPairs)} জোড়া
                      </strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-emerald-400 text-[11px] font-semibold">কার্যকর ফ্রি স্টক:</span>
                      <strong className="text-emerald-400 font-extrabold">
                        {toBnDigit(Math.max(0, p.stockPairs - bookedPairs))} জোড়া / {pairsToCartonText(Math.max(0, p.stockPairs - bookedPairs), p.pairsPerCarton)}
                      </strong>
                    </div>

                    {canEditStock && (
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          onClick={() => {
                            setRestockProductId(p.id);
                            setAddedPairsInput(p.pairsPerCarton);
                          }}
                          className="w-full px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          রি-স্টক
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto no-scrollbar overflow-y-visible">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium pb-2">
                  <th className="pb-3 pr-4">আর্টিকল ও ছবি</th>
                  <th className="pb-3 px-3">সাইজ</th>
                  <th className="pb-3 px-3 text-right">ক্রয় মূল্য {showBuyPrice ? '(৳)' : '(গোপন)'}</th>
                  <th className="pb-3 px-3 text-right">বিক্রয় মূল্য (৳)</th>
                  <th className="pb-3 px-3 text-center">মোট মজুদ</th>
                  <th className="pb-3 px-3 text-center">বুকড স্টক</th>
                  <th className="pb-3 px-3 text-center">কার্যকর ফ্রি স্টক</th>
                  {canEditStock && <th className="pb-3 pl-3 text-right">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stockPairs <= p.minStockAlert;
                  const cleanSize = p.sizeRange ? p.sizeRange.replace(/\(.*?\)/g, '').trim() : '৩৯-৪৪';
                  const isMenuOpen = activeMenuProductId === p.id;
                  const bookedPairs = getBookedPairs(p.id);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Article Code & Image */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="relative group cursor-pointer flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-sm"
                            onClick={() => setPreviewImage({ url: p.imageUrl, articleCode: p.articleCode })}
                            title="ছবি বড় করে দেখতে ক্লিক করুন"
                          >
                            <img
                              src={p.imageUrl}
                              alt={p.articleCode}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-300">
                              <ZoomIn className="w-4 h-4" />
                            </div>
                          </div>
                          <div>
                            <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs">
                              {p.articleCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-3 text-slate-200 font-bold">
                        {cleanSize}
                      </td>

                      {/* Buy Price */}
                      <td className="py-3 px-3 text-right font-bold text-rose-300">
                        {showBuyPrice ? formatTaka(p.buyPrice) : <span className="text-slate-500 font-mono">•••• ৳</span>}
                      </td>

                      {/* Sell Price */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        {formatTaka(p.sellPrice || p.buyPrice)}
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-3 text-center">
                        <div className={`font-bold text-sm ${isLowStock ? 'text-rose-400' : 'text-slate-100'}`}>
                          {toBnDigit(p.stockPairs)} জোড়া
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ({pairsToCartonText(p.stockPairs, p.pairsPerCarton)})
                        </div>
                        {isLowStock && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-300 bg-rose-500/20 px-1.5 py-0.2 rounded-full border border-rose-500/30 mt-0.5 font-bold">
                            <AlertTriangle className="w-3 h-3 text-rose-400" /> কম স্টক
                          </span>
                        )}
                      </td>

                      {/* Booked Quantity */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-sm text-amber-300">
                          {toBnDigit(bookedPairs)} জোড়া
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ({pairsToCartonText(bookedPairs, p.pairsPerCarton)})
                        </div>
                      </td>

                      {/* Net Available Free Stock */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-sm text-emerald-400">
                          {toBnDigit(Math.max(0, p.stockPairs - bookedPairs))} জোড়া
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ({pairsToCartonText(Math.max(0, p.stockPairs - bookedPairs), p.pairsPerCarton)})
                        </div>
                      </td>

                      {/* Actions with 3-Dots Menu */}
                      {canEditStock && (
                        <td className="py-3 pl-3 text-right">
                          <div className="flex items-center justify-end gap-2 relative">
                            <button
                              onClick={() => {
                                setRestockProductId(p.id);
                                setAddedPairsInput(p.pairsPerCarton);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              রি-স্টক
                            </button>

                            {/* 3-Dots Menu Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuProductId(isMenuOpen ? null : p.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition-colors cursor-pointer"
                              title="অপশনসমূহ"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div 
                                className="absolute right-0 top-9 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(p)}
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                                  এডিট করুন
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingProduct(p);
                                    setActiveMenuProductId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  ডিলেট করুন
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
              নতুন জুতার স্টক যোগ করুন
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">আর্টিকল কোড *</label>
                  <input
                    type="text"
                    required
                    value={articleCode}
                    onChange={(e) => setArticleCode(e.target.value)}
                    placeholder="যেমন: M-105"
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ক্যাটাগরি</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    {categoriesList.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">সাইজ</label>
                  <input
                    type="text"
                    value={sizeRange}
                    onChange={(e) => setSizeRange(e.target.value)}
                    placeholder="যেমন: ৩৯-৪৪"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-rose-300 font-semibold mb-1">ক্রয় মূল্য (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 text-rose-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">বিক্রয় মূল্য (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-amber-300 font-semibold mb-1">প্রাথমিক মজুদ (জোড়া)</label>
                <input
                  type="number"
                  required
                  value={initialStockPairs}
                  onChange={(e) => setInitialStockPairs(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              {/* Image Upload Section */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sky-300 font-semibold flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4" />
                    পণ্যের ছবি আপলোড
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors">
                    {isUploading ? 'আপলোড হচ্ছে...' : 'ছবি সিলেক্ট করুন'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <span className="text-xs text-emerald-400 font-medium truncate max-w-[200px]">
                      ✓ ছবি সংযুক্ত হয়েছে
                    </span>
                  )}
                </div>

                {imageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      onClick={() => setPreviewImage({ url: imageUrl, articleCode: articleCode || 'নতুন প্রোডাক্ট' })}
                      className="w-10 h-10 object-cover rounded-lg border border-slate-700 cursor-pointer hover:scale-105 transition-transform" 
                      title="বড় করে দেখতে ক্লিক করুন"
                    />
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="অথবা সরাসরি ইমেজ URL দিন"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  সংরক্ষণ করুন
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-400" />
              স্টক এডিট করুন ({editingProduct.articleCode})
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">আর্টিকল কোড *</label>
                  <input
                    type="text"
                    required
                    value={editArticleCode}
                    onChange={(e) => setEditArticleCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ক্যাটাগরি</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    {categoriesList.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">সাইজ</label>
                  <input
                    type="text"
                    value={editSizeRange}
                    onChange={(e) => setEditSizeRange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-rose-300 font-semibold mb-1">ক্রয় মূল্য (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editBuyPrice}
                    onChange={(e) => setEditBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 text-rose-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">বিক্রয় মূল্য (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editSellPrice}
                    onChange={(e) => setEditSellPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-amber-300 font-semibold mb-1">বর্তমান মজুদ (জোড়া)</label>
                <input
                  type="number"
                  required
                  value={editStockPairs}
                  onChange={(e) => setEditStockPairs(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              {/* Edit Image Upload Section */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sky-300 font-semibold flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4" />
                    পণ্যের ছবি পরিবর্তন
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors">
                    {isUploading ? 'আপলোড হচ্ছে...' : 'নতুন ছবি সিলেক্ট করুন'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {editImageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img 
                      src={editImageUrl} 
                      alt="Preview" 
                      onClick={() => setPreviewImage({ url: editImageUrl, articleCode: editArticleCode })}
                      className="w-10 h-10 object-cover rounded-lg border border-slate-700 cursor-pointer hover:scale-105 transition-transform" 
                      title="বড় করে দেখতে ক্লিক করুন"
                    />
                    <input
                      type="text"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="ইমেজ URL"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  আপডেট করুন
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              স্টক ডিলেট কনফার্মেশন
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                আপনি কি নিশ্চিত যে আর্টিকল <span className="font-bold text-amber-300 font-mono px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">{deletingProduct.articleCode}</span> ডিলেট করতে চান?
              </p>
              <p className="text-[11px] text-slate-400">
                এই স্টকটি মুছে ফেললে ডাটাবেজ থেকেও মুছে যাবে।
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingProduct(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  ডিলেট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockProductId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              নতুন মাল রি-স্টক
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                আর্টিকল: <span className="font-bold text-amber-300 font-mono">{products.find((p) => p.id === restockProductId)?.articleCode}</span>
              </p>

              <div>
                <label className="block text-slate-300 font-medium mb-1">যোগ করার জুতার পরিমাণ (জোড়া)</label>
                <input
                  type="number"
                  min="1"
                  value={addedPairsInput}
                  onChange={(e) => setAddedPairsInput(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  ({pairsToCartonText(addedPairsInput, 12)})
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRestockProductId(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleConfirmRestock}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  কনফার্ম করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                {previewImage.articleCode && (
                  <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs">
                    {previewImage.articleCode}
                  </span>
                )}
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                title="বন্ধ করুন"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden min-h-[250px] max-h-[70vh] border border-slate-800 p-2">
              <img
                src={previewImage.url}
                alt={previewImage.articleCode || 'পণ্যের ছবি'}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80';
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>বন্ধ করতে স্ক্রিনের যেকোনো জায়গায় ক্লিক করুন</span>
              <a 
                href={previewImage.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 font-medium"
              >
                মূল ছবি নতুন ট্যাবে খুলুন ↗
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
