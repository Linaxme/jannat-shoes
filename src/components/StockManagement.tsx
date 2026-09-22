import React, { useState } from 'react';
import { ShoeProduct, UITheme, Order, UserAccount, SystemConfig } from '../types';
import { formatTaka, toBnDigit, pairsToCartonText } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { ProductImageDisplay } from './Shoe2DPlaceholder';
import { compressImageFile, getOptimizedCloudinaryUrl } from '../utils/imageCompressor';
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Filter,
  X,
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('সব');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [stockAlertFilter, setStockAlertFilter] = useState<'all' | 'low'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'card' | 'grid'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table'
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(100);
  const productsContainerRef = React.useRef<HTMLDivElement>(null);

  const getBookedPairs = (productId: string) => {
    if (!orders) return 0;
    return orders.reduce((sum, order) => {
      if (order.deliveryStatus !== 'booked') return sum;
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
  const [addedPairsInput, setAddedPairsInput] = useState<number | string>('');

  const defaultCategories = ['জেন্টস ফর্মাল', 'জেন্টস ক্যাজুয়াল', 'স্পোর্টস কেডস', 'লেডিস হিল/স্যান্ডেল', 'বাচ্চাদের জুতা'];
  const categoriesList = systemConfig?.categories && systemConfig.categories.length > 0
    ? systemConfig.categories
    : defaultCategories;

  const [showAddCatDropdown, setShowAddCatDropdown] = useState(false);
  const [showEditCatDropdown, setShowEditCatDropdown] = useState(false);

  // Toggle state to show/hide buy price
  const [showBuyPrice, setShowBuyPrice] = useState(false);

  // New Product Form State (Product Name field completely removed)
  const [articleCode, setArticleCode] = useState('');
  const [category, setCategory] = useState<string>(categoriesList[0] || 'জেন্টস ক্যাজুয়াল');
  const [sizeRange, setSizeRange] = useState('৩৯-৪৪');
  const [buyPrice, setBuyPrice] = useState<number | string>('');
  const [sellPrice, setSellPrice] = useState<number | string>('');
  const [initialStockPairs, setInitialStockPairs] = useState<number | string>('');
  const [imageUrl, setImageUrl] = useState('');

  // Edit Product Form State
  const [editArticleCode, setEditArticleCode] = useState('');
  const [editCategory, setEditCategory] = useState<string>('জেন্টস ক্যাজুয়াল');
  const [editSizeRange, setEditSizeRange] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState<number | string>('');
  const [editSellPrice, setEditSellPrice] = useState<number | string>('');
  const [editStockPairs, setEditStockPairs] = useState<number | string>('');
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
      // Compress client-side image to 150-350 KB (down from 4-8 MB) before uploading
      const compressedFile = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
      });

      const activeCloudName = localStorage.getItem('cloudinary_cloud_name') || cloudName || 'aeuf3r8e';
      const activePreset = localStorage.getItem('cloudinary_upload_preset') || uploadPreset || 'stock_m';

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', activePreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${activeCloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        const finalUrl = getOptimizedCloudinaryUrl(data.secure_url);
        if (isEdit) {
          setEditImageUrl(finalUrl);
        } else {
          setImageUrl(finalUrl);
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
        reader.readAsDataURL(compressedFile);
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
    const matchesSearch =
      (p.articleCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && (p.brand || "").toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (selectedCategoryFilter !== 'সব' && p.category !== selectedCategoryFilter) {
      return false;
    }

    if (stockAlertFilter === 'low' && p.stockPairs > p.minStockAlert) {
      return false;
    }

    return true;
  });

  const totalPages = itemsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = itemsPerPage === 'all' ? 0 : (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === 'all' ? filteredProducts.length : startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (productsContainerRef.current) {
      productsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const totalStockPairs = products.reduce((sum, p) => sum + p.stockPairs, 0);
  const totalStockValueBuy = products.reduce((sum, p) => sum + p.stockPairs * p.buyPrice, 0);
  const allPendingBookedPairs = (orders || []).reduce((sum, order) => {
    if (order.deliveryStatus !== 'booked') return sum;
    const orderPairs = (order.items || []).reduce((iSum, item) => iSum + (item.totalPairs || 0), 0);
    return sum + orderPairs;
  }, 0);
  const freeStockPairs = Math.max(0, totalStockPairs - allPendingBookedPairs);
  const lowStockCount = products.filter((p) => p.stockPairs <= p.minStockAlert).length;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleCode.trim()) {
      alert('আর্টিকল কোড দেওয়া আবশ্যক!');
      return;
    }

    const cleanArticle = articleCode.toUpperCase().trim();
    const cleanBuyPrice = typeof buyPrice === 'number' ? buyPrice : parseFloat(buyPrice as string) || 0;
    const cleanSellPrice = typeof sellPrice === 'number' ? sellPrice : parseFloat(sellPrice as string) || cleanBuyPrice;
    const cleanStock = typeof initialStockPairs === 'number' ? initialStockPairs : parseInt(initialStockPairs as string) || 0;

    const newProd: ShoeProduct = {
      id: `p-${Date.now()}`,
      articleCode: cleanArticle,
      name: cleanArticle,
      category,
      brand: 'জান্নাত সুজ',
      sizeRange,
      buyPrice: cleanBuyPrice,
      sellPrice: cleanSellPrice > 0 ? cleanSellPrice : cleanBuyPrice,
      retailPrice: 0,
      pairsPerCarton: 12,
      stockPairs: cleanStock,
      minStockAlert: 24,
      imageUrl: imageUrl.trim(),
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onAddProduct(newProd);
    setShowAddModal(false);
    setArticleCode('');
    setBuyPrice('');
    setSellPrice('');
    setInitialStockPairs('');
    setImageUrl('');
  };

  const handleStartEdit = (p: ShoeProduct) => {
    setEditingProduct(p);
    setEditArticleCode(p.articleCode);
    setEditCategory(p.category || 'জেন্টস ক্যাজুয়াল');
    setEditSizeRange(p.sizeRange || '৩৯-৪৪');
    setEditBuyPrice(p.buyPrice > 0 ? p.buyPrice : '');
    setEditSellPrice((p.sellPrice || p.buyPrice || 0) > 0 ? (p.sellPrice || p.buyPrice || '') : '');
    setEditStockPairs(p.stockPairs > 0 ? p.stockPairs : (p.stockPairs === 0 ? 0 : ''));
    setEditImageUrl(p.imageUrl);
    setActiveMenuProductId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editArticleCode.trim()) return;

    const cleanArticle = editArticleCode.toUpperCase().trim();
    const cleanBuy = typeof editBuyPrice === 'number' ? editBuyPrice : parseFloat(editBuyPrice as string) || 0;
    const cleanSell = typeof editSellPrice === 'number' ? editSellPrice : parseFloat(editSellPrice as string) || cleanBuy;
    const cleanStock = typeof editStockPairs === 'number' ? editStockPairs : parseInt(editStockPairs as string) || 0;

    const updated: ShoeProduct = {
      ...editingProduct,
      articleCode: cleanArticle,
      name: cleanArticle,
      category: editCategory,
      sizeRange: editSizeRange,
      buyPrice: cleanBuy,
      sellPrice: cleanSell,
      stockPairs: cleanStock,
      imageUrl: editImageUrl.trim(),
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
    
    const parsedAdded = typeof addedPairsInput === 'number' ? addedPairsInput : parseInt(addedPairsInput as string) || 0;
    if (parsedAdded === 0) {
      alert('অনুগ্রহ করে সঠিক পরিমাণ দিন!');
      return;
    }
    
    const targetProduct = products.find(p => p.id === restockProductId);
    if (parsedAdded < 0 && targetProduct && Math.abs(parsedAdded) > targetProduct.stockPairs) {
       alert('স্টকের চেয়ে বেশি পরিমাণ বাদ দেওয়া যাবে না!');
       return;
    }

    onRestockProduct(restockProductId, parsedAdded);
    setRestockProductId(null);
    setAddedPairsInput('');
  };

  return (
    <div className="space-y-6" onClick={() => { setActiveMenuProductId(null); setIsCategoryDropdownOpen(false); }}>
      
      {/* Minimal Stock Header */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-black text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            স্টক হিসাব
          </span>
          <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-slate-800 to-transparent flex-1" />
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

      {/* 3D Dashboard-Style Unified Stock & Valuation Card */}
      <div className="relative bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/60 border-t-slate-600/70 border-b-[3px] border-b-slate-950 p-4 sm:p-5 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_24px_-4px_rgba(0,0,0,0.6)]">
        {/* Top Status Row inside Stock Card */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-3.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
              <Boxes className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">মোট মজুদ ওভারভিউ</h3>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full text-[11px] font-medium border border-slate-700">
                {toBnDigit(products.length)} টি মডেল
              </span>
            </div>
          </div>

          {/* Right Action / Status Badges */}
          <div className="flex items-center gap-2">
            {lowStockCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setStockAlertFilter(stockAlertFilter === 'low' ? 'all' : 'low');
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                  stockAlertFilter === 'low'
                    ? 'bg-rose-500/30 text-rose-200 border-rose-500 shadow-sm'
                    : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40'
                }`}
                title="কম স্টক ফিল্টার"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>কম স্টক: {toBnDigit(lowStockCount)} টি</span>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>স্টক পর্যাপ্ত</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowBuyPrice(!showBuyPrice)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-950 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium transition cursor-pointer"
              title={showBuyPrice ? "ক্রয় মূল্য লুকান" : "ক্রয় মূল্য দেখুন"}
            >
              {showBuyPrice ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden xs:inline">{showBuyPrice ? 'লুকান' : 'দেখুন'}</span>
            </button>
          </div>
        </div>

        {/* 3 Balanced Metric Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 mt-3.5">
          {/* 1. মোট মজুদ */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400">মোট মজুদ</span>
            <div className="text-sm sm:text-lg font-black text-amber-300 font-mono mt-1 truncate">
              {toBnDigit(totalStockPairs)} <span className="text-[10px] sm:text-xs font-normal text-slate-400">জোড়া</span>
            </div>
            <div className="text-[10px] sm:text-xs text-amber-400/90 font-medium truncate mt-1">
              {pairsToCartonText(totalStockPairs, 12)}
            </div>
          </div>

          {/* 2. মোট ক্রয়মূল্য (ইনভেন্টরি মূল্য) */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400">মোট ক্রয়মূল্য</span>
              <button
                type="button"
                onClick={() => setShowBuyPrice(!showBuyPrice)}
                className="text-slate-500 hover:text-amber-400 transition cursor-pointer"
                title={showBuyPrice ? "ক্রয় মূল্য লুকান" : "ক্রয় মূল্য দেখুন"}
              >
                {showBuyPrice ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-sm sm:text-lg font-black text-rose-400 font-mono mt-1 truncate">
              {showBuyPrice ? formatTaka(totalStockValueBuy) : '•••• ৳'}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate mt-1">
              ইনভেন্টরি ক্রয় হিসাব
            </div>
          </div>

          {/* 3. ফ্রি ও বুকড স্টক */}
          <div className="col-span-2 sm:col-span-1 bg-slate-950/70 border border-slate-800/90 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">ফ্রি স্টক</span>
              <span className="text-[10px] font-semibold text-amber-400/90">
                বুকড: {toBnDigit(allPendingBookedPairs)}
              </span>
            </div>
            <div className="text-sm sm:text-lg font-black text-emerald-300 font-mono mt-1 truncate">
              {toBnDigit(freeStockPairs)} <span className="text-[10px] sm:text-xs font-normal text-slate-400">জোড়া</span>
            </div>
            <div className="text-[10px] sm:text-xs text-emerald-300/80 font-medium truncate mt-1">
              {pairsToCartonText(freeStockPairs, 12)}
            </div>
          </div>
        </div>
      </div>

      {/* Search Input & Unified Action Controls */}
      <div className="bg-slate-900/70 border border-slate-800/80 p-3 sm:p-3.5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="আর্টিকল খুঁজুন..."
            className="bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 w-full focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Left Group: Eye toggle + Category Custom Dropdown + Low Stock Alert */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Standalone Eye Icon Toggle */}
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

            {/* Custom Category Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCategoryDropdownOpen((prev) => !prev);
                }}
                className={`bg-slate-950 border text-xs rounded-xl px-3 py-2 font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCategoryFilter !== 'সব'
                    ? 'border-amber-500/80 text-amber-300 bg-amber-500/10 shadow-sm shadow-amber-500/10'
                    : 'border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-none">
                  {selectedCategoryFilter === 'সব' ? 'সব ক্যাটাগরি' : selectedCategoryFilter}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isCategoryDropdownOpen ? 'rotate-180 text-amber-400' : ''
                  }`}
                />
              </button>

              {/* Custom Category Menu */}
              {isCategoryDropdownOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-1.5 w-56 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>ক্যাটাগরি ফিল্টার</span>
                    {selectedCategoryFilter !== 'সব' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryFilter('সব');
                          setCurrentPage(1);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer text-[10px]"
                      >
                        রিসেট
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter('সব');
                      setCurrentPage(1);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      selectedCategoryFilter === 'সব'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>সব ক্যাটাগরি</span>
                    {selectedCategoryFilter === 'সব' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                  {categoriesList.map((cat, idx) => {
                    const isSelected = selectedCategoryFilter === cat;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryFilter(cat);
                          setCurrentPage(1);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer border-t border-slate-800/40 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Low Stock Alert Quick Toggle */}
            <button
              type="button"
              onClick={() => {
                setStockAlertFilter(stockAlertFilter === 'low' ? 'all' : 'low');
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                stockAlertFilter === 'low'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
              title="কম স্টক সতর্কতা"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${stockAlertFilter === 'low' ? 'text-rose-400' : 'text-slate-400'}`} />
              <span className="hidden xs:inline">কম স্টক</span>
            </button>
          </div>

          {/* Right: View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 ml-auto">
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
      <div ref={productsContainerRef} className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl min-h-[300px]">
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            কোনো প্রডাক্ট বা আর্টিকল পাওয়া যায়নি।
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {paginatedProducts.map((p) => {
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
                    <ProductImageDisplay
                      src={p.imageUrl}
                      alt={p.articleCode}
                      articleCode={p.articleCode}
                      category={p.category}
                      size="lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage({ url: p.imageUrl, articleCode: p.articleCode });
                      }}
                      className="absolute bottom-1 right-1 bg-slate-950/80 text-amber-300 p-1 rounded-md shadow backdrop-blur-xs cursor-pointer z-10"
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
            {paginatedProducts.map((p) => {
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
                      <ProductImageDisplay
                        src={p.imageUrl}
                        alt={p.articleCode}
                        articleCode={p.articleCode}
                        category={p.category}
                        size="sm"
                      />
                      <div className="absolute bottom-1 right-1 bg-slate-950/80 text-amber-300 p-1 rounded-md shadow backdrop-blur-xs z-10">
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
                {paginatedProducts.map((p) => {
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
                            title="ছবি দেখতে ক্লিক করুন"
                          >
                            <ProductImageDisplay
                              src={p.imageUrl}
                              alt={p.articleCode}
                              articleCode={p.articleCode}
                              category={p.category}
                              size="xs"
                              showLabel={false}
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-300 z-10">
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
          </>
        )}
      </div>

      {/* Pagination & Summary Bar */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/90 px-3.5 py-2.5 rounded-2xl shadow-sm">
          {/* Left: Summary */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>মোট: <strong className="text-slate-200 font-mono font-bold">{toBnDigit(filteredProducts.length)}</strong> টি</span>
            {itemsPerPage !== 'all' && filteredProducts.length > itemsPerPage && (
              <span className="text-slate-500 font-mono text-[11px]">
                ({toBnDigit(startIndex + 1)} - {toBnDigit(Math.min(endIndex, filteredProducts.length))})
              </span>
            )}
          </div>

          {/* Right: Per page switcher & Page navigation */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end">
            {/* Items Per Page Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
              <span className="text-[10px] text-slate-500 px-1 font-medium hidden xs:inline">প্রতি পেজে:</span>
              {([50, 100, 200, 'all'] as const).map((opt) => (
                <button
                  key={String(opt)}
                  type="button"
                  onClick={() => {
                    setItemsPerPage(opt);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    itemsPerPage === opt
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {opt === 'all' ? 'সব' : toBnDigit(opt)}
                </button>
              ))}
            </div>

            {/* Page navigation buttons */}
            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                  title="আগের পেজ"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs font-mono font-bold text-amber-300 px-1.5">
                  {toBnDigit(safeCurrentPage)} / {toBnDigit(totalPages)}
                </span>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                  title="পরের পেজ"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAddCatDropdown(!showAddCatDropdown)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 flex items-center justify-between text-left focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
                    >
                      <span className="truncate">{category || 'ক্যাটাগরি নির্বাচন'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${showAddCatDropdown ? 'rotate-180 text-amber-400' : ''}`} />
                    </button>
                    {showAddCatDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 max-h-48 overflow-y-auto">
                        {categoriesList.map((cat, idx) => {
                          const isSelected = category === cat;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCategory(cat);
                                setShowAddCatDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{cat}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                    min="0"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="০"
                    className="w-full bg-slate-950 border border-slate-700 text-rose-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">বিক্রয় মূল্য (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="০"
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-amber-300 font-semibold mb-1">প্রাথমিক মজুদ (জোড়া)</label>
                <input
                  type="number"
                  value={initialStockPairs}
                  onChange={(e) => setInitialStockPairs(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="০"
                  className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              {/* Image Upload Section */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sky-300 font-semibold flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4" />
                    পণ্যের ছবি সংযুক্তকরণ
                  </label>
                  {imageUrl && (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> ছবি যুক্ত হয়েছে
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {isUploading ? 'ছবি আপলোড হচ্ছে...' : imageUrl ? 'অন্য ছবি পরিবর্তন করুন' : 'ছবি নির্বাচন করুন'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      title="ছবি মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ছবি সরান</span>
                    </button>
                  )}
                </div>

                {imageUrl && (
                  <div className="mt-2 flex items-center gap-3 p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div 
                      onClick={() => setPreviewImage({ url: imageUrl, articleCode: articleCode || 'নতুন প্রোডাক্ট' })}
                      className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 cursor-pointer group shrink-0 bg-slate-950"
                      title="বড় করে দেখতে ক্লিক করুন"
                    >
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="text-xs space-y-0.5 min-w-0">
                      <p className="text-slate-200 font-bold truncate">ছবি প্রিভিউ</p>
                      <p className="text-[11px] text-slate-400">ক্লিক করে বড় সাইজে দেখতে পারবেন</p>
                    </div>
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEditCatDropdown(!showEditCatDropdown)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 flex items-center justify-between text-left focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
                    >
                      <span className="truncate">{editCategory || 'ক্যাটাগরি নির্বাচন'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${showEditCatDropdown ? 'rotate-180 text-amber-400' : ''}`} />
                    </button>
                    {showEditCatDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 max-h-48 overflow-y-auto">
                        {categoriesList.map((cat, idx) => {
                          const isSelected = editCategory === cat;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setEditCategory(cat);
                                setShowEditCatDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{cat}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                    min="0"
                    value={editBuyPrice}
                    onChange={(e) => setEditBuyPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="০"
                    className="w-full bg-slate-950 border border-slate-700 text-rose-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">বিক্রয় মূল্য (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={editSellPrice}
                    onChange={(e) => setEditSellPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="০"
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-amber-300 font-semibold mb-1">বর্তমান মজুদ (জোড়া)</label>
                <input
                  type="number"
                  value={editStockPairs}
                  onChange={(e) => setEditStockPairs(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="০"
                  className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              {/* Edit Image Upload Section */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sky-300 font-semibold flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4" />
                    পণ্যের ছবি পরিবর্তন
                  </label>
                  {editImageUrl && (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> ছবি রয়েছে
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {isUploading ? 'ছবি আপলোড হচ্ছে...' : editImageUrl ? 'নতুন ছবি সিলেক্ট করুন' : 'ছবি নির্বাচন করুন'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {editImageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditImageUrl('')}
                      className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      title="ছবি মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ছবি সরান</span>
                    </button>
                  )}
                </div>

                {editImageUrl && (
                  <div className="mt-2 flex items-center gap-3 p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div 
                      onClick={() => setPreviewImage({ url: editImageUrl, articleCode: editArticleCode })}
                      className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 cursor-pointer group shrink-0 bg-slate-950"
                      title="বড় করে দেখতে ক্লিক করুন"
                    >
                      <img 
                        src={editImageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="text-xs space-y-0.5 min-w-0">
                      <p className="text-slate-200 font-bold truncate">ছবি প্রিভিউ</p>
                      <p className="text-[11px] text-slate-400">ক্লিক করে বড় সাইজে দেখতে পারবেন</p>
                    </div>
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
              পণ্য ট্র্যাশে পাঠানো
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                আপনি কি নিশ্চিত যে আর্টিকল <span className="font-bold text-amber-300 font-mono px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">{deletingProduct.articleCode}</span> ({deletingProduct.name}) ট্র্যাশে পাঠাতে চান?
              </p>
              <p className="text-[11px] text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
                ✓ এটি সরাসরি নষ্ট হবে না। রিসাইকেল বিন (ট্র্যাশ) থেকে যেকোনো সময় পুনরায় সক্রিয় স্টকে রিস্টোর করতে পারবেন।
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
                  ট্র্যাশে পাঠান
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock & Adjustment Modal */}
      {restockProductId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              স্টক অ্যাডজাস্টমেন্ট (রিটার্ন / ড্যামেজ)
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                আর্টিকল: <span className="font-bold text-amber-300 font-mono">{products.find((p) => p.id === restockProductId)?.articleCode}</span>
              </p>

              <div>
                <label className="block text-slate-300 font-medium mb-1">জুতার পরিমাণ (জোড়া)</label>
                <input
                  type="number"
                  value={addedPairsInput}
                  onChange={(e) => setAddedPairsInput(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="যেমন: ১২ (যোগ) বা -২ (বাদ)"
                  className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * নতুন স্টক বা রিটার্ন হলে সংখ্যা দিন (যেমন: ১২)<br/>
                  * ড্যামেজ বা বাদ দিতে মাইনাস দিন (যেমন: -২)
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRestockProductId(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium cursor-pointer transition-colors hover:bg-slate-700"
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
                X
              </button>
            </div>

            <div className="flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden min-h-[250px] max-h-[70vh] border border-slate-800 p-2">
              <ProductImageDisplay
                src={previewImage.url}
                alt={previewImage.articleCode || 'পণ্যের ছবি'}
                articleCode={previewImage.articleCode}
                size="xl"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
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
