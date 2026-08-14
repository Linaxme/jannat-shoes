import React, { useState, useMemo } from 'react';
import { ShoeProduct, Customer, Order, OrderItem, UserAccount, SystemConfig } from '../types';
import { LoginModal } from './LoginModal';
import { formatTaka, toBnDigit } from '../utils/formatters';
import { ProductImageDisplay } from './Shoe2DPlaceholder';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  Phone,
  Store,
  User,
  MapPin,
  Lock,
  ArrowRight,
  PackageCheck,
  Sparkles,
  Info,
  Maximize2,
  ShieldCheck,
  Check,
  Truck,
  Tag,
  Layers,
  Sparkle,
  FileText,
  Clock,
  CreditCard,
  Printer,
  Eye,
  EyeOff,
  LogOut,
  History,
  AlertCircle,
  Receipt
} from 'lucide-react';

interface CartItem {
  product: ShoeProduct;
  unitType: 'pairs' | 'cartons';
  quantityInput: number; // e.g. 1 carton or 12 pairs
  totalPairs: number;
  totalAmount: number;
}

interface CustomerStorefrontProps {
  products: ShoeProduct[];
  customers: Customer[];
  orders?: Order[];
  userAccounts: UserAccount[];
  onSubmitOrder: (
    shopkeeperData: {
      shopName: string;
      customerName: string;
      phone: string;
      address: string;
      password?: string;
    },
    items: OrderItem[],
    grandTotal: number,
    totalPairs: number
  ) => Promise<Order | null>;
  currentUser?: UserAccount | null;
  systemConfig?: SystemConfig;
  onLoginClick?: () => void;
  onLoginSuccess?: (user: UserAccount) => void;
}

export const CustomerStorefront: React.FC<CustomerStorefrontProps> = ({
  products,
  customers,
  orders = [],
  userAccounts,
  onSubmitOrder,
  currentUser,
  systemConfig,
  onLoginClick,
  onLoginSuccess,
}) => {
  const isGuestAllowed = systemConfig?.allowGuestBrowsingAndOrder !== false;
  const isGuestAccessDisabled = !isGuestAllowed && !currentUser;
  const [selectedCategory, setSelectedCategory] = useState<string>('সব');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [previewProduct, setPreviewProduct] = useState<ShoeProduct | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Shopkeeper Profile & Order History Modal States
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);

  // Secure Authentication state for profile modal
  const [profileAuthPhone, setProfileAuthPhone] = useState(currentUser?.phone || '');
  const [profileAuthPassword, setProfileAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [profileAuthError, setProfileAuthError] = useState<string | null>(null);
  const [authenticatedCustomer, setAuthenticatedCustomer] = useState<Customer | null>(() => {
    if (currentUser?.phone) {
      const userDigits = (currentUser.phone || "").replace(/\D/g, '');
      const match = customers.find((c) => {
        const cDigits = (c.phone || '').replace(/\D/g, '');
        return cDigits === userDigits || cDigits.endsWith(userDigits) || userDigits.endsWith(cDigits);
      });
      if (match) return match;
    }
    return null;
  });

  // Verify phone + password/PIN
  const handleVerifyShopkeeperLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileAuthError(null);

    const cleanPhone = profileAuthPhone.replace(/\D/g, '');
    const enteredPass = profileAuthPassword.trim();

    if (!cleanPhone || cleanPhone.length < 11) {
      setProfileAuthError('দয়া করে ১১ ডিজিটের সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    if (!enteredPass) {
      setProfileAuthError('প্রাইভেসির কারণে পাসওয়ার্ড বা সিকিউরিটি পিন প্রদান করা আবশ্যক।');
      return;
    }

    // 1. Search matching user account in userAccounts
    const matchedAccount = userAccounts.find((u) => {
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const uLoginDigits = (u.loginId || '').replace(/\D/g, '');
      return (uPhoneDigits === cleanPhone || uLoginDigits === cleanPhone) && u.password === enteredPass;
    });

    // 2. Find customer by phone
    const matchedCust = customers.find((c) => {
      const cDigits = (c.phone || '').replace(/\D/g, '');
      return cDigits === cleanPhone;
    });

    if (matchedAccount) {
      if (matchedCust) {
        setAuthenticatedCustomer(matchedCust);
      } else {
        setAuthenticatedCustomer({
          id: matchedAccount.id,
          name: matchedAccount.name,
          shopName: (matchedAccount as any).shopName || matchedAccount.name,
          address: matchedAccount.area || 'ঠিকানা দেওয়া নেই',
          phone: matchedAccount.phone,
          assignedSellerId: '',
          assignedSellerName: 'অনলাইন সেলস',
          currentDue: 0,
          creditLimit: 50000,
        });
      }
      setProfileAuthPassword('');
      setProfileAuthError(null);
      return;
    }

    // 3. Fallback check for customer record if PIN matches last 4 digits or default pin
    if (matchedCust) {
      const last4 = cleanPhone.slice(-4);
      if (enteredPass === last4 || enteredPass === '1234' || enteredPass === '0000' || enteredPass === '123456') {
        setAuthenticatedCustomer(matchedCust);
        setProfileAuthPassword('');
        setProfileAuthError(null);
        return;
      }
    }

    setProfileAuthError('ফোন নম্বর অথবা পাসওয়ার্ড/পিন সঠিক নয়! প্রাইভেসির কারণে ভুল পাসওয়ার্ড দিলে তথ্য দেখা যাবে না।');
  };

  const handleLockProfile = () => {
    setAuthenticatedCustomer(null);
    setProfileAuthPassword('');
    setProfileAuthError(null);
  };

  // Customer Orders history for verified profile
  const customerOrdersHistory = useMemo(() => {
    if (!authenticatedCustomer) return [];
    const custDigits = (authenticatedCustomer.phone || "").replace(/\D/g, '');
    const custShopLower = (authenticatedCustomer.shopName || authenticatedCustomer.name || '').toLowerCase().trim();

    return orders.filter((o) => {
      const oDigits = (o.phone || o.customerPhone || '').replace(/\D/g, '');
      const oShopLower = (o.shopName || '').toLowerCase().trim();
      return (
        (custDigits && oDigits && (custDigits.endsWith(oDigits) || oDigits.endsWith(custDigits))) ||
        (custShopLower && oShopLower && custShopLower === oShopLower)
      );
    });
  }, [authenticatedCustomer, orders]);

  // Form Fields
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [shopName, setShopName] = useState('');
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');

  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [matchedNotice, setMatchedNotice] = useState<string | null>(null);

  const [selectedAdminCustomerId, setSelectedAdminCustomerId] = useState<string>('');

  const handleOpenCheckoutModal = () => {
    setIsCheckoutModalOpen(true);
    setSelectedAdminCustomerId('');

    if (currentUser) {
      if (currentUser.role === 'customer') {
        const userDigits = (currentUser.phone || '').replace(/\D/g, '');
        const match = customers.find((c) => {
          const cDigits = (c.phone || '').replace(/\D/g, '');
          return cDigits && userDigits && (cDigits === userDigits || cDigits.endsWith(userDigits) || userDigits.endsWith(cDigits));
        });

        if (match) {
          setPhone(match.phone);
          setShopName(match.shopName);
          setCustomerName(match.name);
          setAddress(match.address);
          setMatchedCustomer(match);
          setMatchedNotice(`${match.shopName} - আপনার নিবন্ধিত দোকানের তথ্য প্রাক-পূরণ করা হয়েছে।`);
        } else {
          setPhone(currentUser.phone || '');
          setCustomerName(currentUser.name || '');
          setShopName((currentUser as any).shopName || currentUser.name || '');
          setAddress(currentUser.area || '');
          setMatchedCustomer(null);
          setMatchedNotice(null);
        }
      } else {
        // Staff (Super Admin / Admin / Seller)
        setPhone('');
        setShopName('');
        setCustomerName('');
        setAddress('');
        setPassword('');
        setMatchedCustomer(null);
        setMatchedNotice(null);
      }
    } else {
      // Guest
      setPhone('');
      setShopName('');
      setCustomerName('');
      setAddress('');
      setPassword('');
      setMatchedCustomer(null);
      setMatchedNotice(null);
    }
  };

  // Auto-lookup customer details ONLY when full 11 digits match existing customer database
  const handlePhoneChange = (inputPhone: string) => {
    setPhone(inputPhone);
    setMatchedNotice(null);
    const cleaned = inputPhone.replace(/\D/g, '');

    if (cleaned.length === 11) {
      const match = customers.find((c) => {
        const cPhoneDigits = (c.phone || '').replace(/\D/g, '');
        return cPhoneDigits === cleaned;
      });

      if (match) {
        setMatchedCustomer(match);
      } else {
        setMatchedCustomer(null);
      }
    } else {
      setMatchedCustomer(null);
    }
  };

  const applyMatchedCustomer = (cust: Customer) => {
    setShopName(cust.shopName);
    setCustomerName(cust.name);
    setAddress(cust.address);
    setMatchedNotice(`${cust.shopName} (${cust.name}) - এর দোকানের তথ্য সফলভাবে পূর্ণ হয়েছে`);
  };

  const configuredCategories = systemConfig?.categories && systemConfig.categories.length > 0
    ? systemConfig.categories
    : ['জেন্টস ফর্মাল', 'জেন্টস ক্যাজুয়াল', 'স্পোর্টস কেডস', 'লেডিস হিল/স্যান্ডেল', 'বাচ্চাদের জুতা'];
  const categories = ['সব', ...configuredCategories];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'সব' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.articleCode || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Toast feedback trigger
  const showToast = (msg: string) => {
    setAddedToast(msg);
    setTimeout(() => {
      setAddedToast(null);
    }, 2200);
  };

  // Cart operations
  const handleAddToCart = (product: ShoeProduct, unitType: 'pairs' | 'cartons', qty: number) => {
    if (qty <= 0) return;
    const pairsPerCarton = product.pairsPerCarton || 12;
    const calculatedPairs = unitType === 'cartons' ? qty * pairsPerCarton : qty;

    // Calculate current pairs in cart for this product
    const currentCartPairs = cart
      .filter((item) => item.product.id === product.id)
      .reduce((sum, item) => sum + item.totalPairs, 0);

    if (currentCartPairs + calculatedPairs > product.stockPairs) {
      alert(`দুঃখিত, পর্যাপ্ত স্টক নেই! বর্তমানে স্টক আছে ${toBnDigit(product.stockPairs)} জোড়া।`);
      return;
    }

    const itemAmount = calculatedPairs * product.sellPrice;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.product.id === product.id && item.unitType === unitType);
      if (existingIdx > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIdx].quantityInput + qty;
        const newPairs = unitType === 'cartons' ? newQty * pairsPerCarton : newQty;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantityInput: newQty,
          totalPairs: newPairs,
          totalAmount: newPairs * product.sellPrice,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            unitType,
            quantityInput: qty,
            totalPairs: calculatedPairs,
            totalAmount: itemAmount,
          },
        ];
      }
    });

    const unitLabel = unitType === 'cartons' ? `${toBnDigit(qty)} ডজন` : `${toBnDigit(qty)} জোড়া`;
    showToast(`${product.articleCode} - কার্টে ${unitLabel} যোগ করা হয়েছে`);
  };

  const updateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    
    const item = cart[index];
    const pairsPerCarton = item.product.pairsPerCarton || 12;
    const newPairs = item.unitType === 'cartons' ? newQty * pairsPerCarton : newQty;

    // Check total pairs for this product across all cart items (excluding the old quantity of THIS item)
    const otherCartPairs = cart
      .filter((c, i) => c.product.id === item.product.id && i !== index)
      .reduce((sum, c) => sum + c.totalPairs, 0);

    if (otherCartPairs + newPairs > item.product.stockPairs) {
      alert(`দুঃখিত, পর্যাপ্ত স্টক নেই! বর্তমানে স্টক আছে ${toBnDigit(item.product.stockPairs)} জোড়া।`);
      return;
    }

    setCart((prevCart) => {
      const updated = [...prevCart];
      const targetItem = updated[index];
      updated[index] = {
        ...targetItem,
        quantityInput: newQty,
        totalPairs: newPairs,
        totalAmount: newPairs * targetItem.product.sellPrice,
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  const totalCartPairs = cart.reduce((acc, item) => acc + item.totalPairs, 0);
  const totalCartAmount = cart.reduce((acc, item) => acc + item.totalAmount, 0);

  const handleConfirmCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!phone || !shopName || !customerName || !address) {
      alert('দয়া করে আপনার দোকানের নাম, মালিকের নাম, মোবাইল নম্বর ও ঠিকানা পূরণ করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems: OrderItem[] = cart.map((c) => ({
        productId: c.product.id,
        articleCode: c.product.articleCode,
        productName: c.product.name,
        sizeRange: c.product.sizeRange,
        unitType: c.unitType,
        quantityInput: c.quantityInput,
        totalPairs: c.totalPairs,
        unitSellPrice: c.product.sellPrice,
        unitBuyPrice: c.product.buyPrice,
        totalAmount: c.totalAmount,
      }));

      const created = await onSubmitOrder(
        {
          shopName,
          customerName,
          phone,
          address,
          password,
        },
        orderItems,
        totalCartAmount,
        totalCartPairs
      );

      if (created) {
        setCompletedOrder(created);
        setCart([]);
        setIsCheckoutModalOpen(false);
        setIsCartOpen(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('অর্ডার সাবমিট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed top-20 right-4 z-[90] bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-300 animate-slideDown">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* Minimal Store Catalog Header */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-black text-amber-400 tracking-wide whitespace-nowrap flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            অনলাইন অর্ডার
          </span>
          <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-slate-800 to-transparent flex-1" />
        </div>

        {/* Login or Shopkeeper Button */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser && currentUser.role === 'customer' && (
            <button
              onClick={() => setIsCustomerProfileOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-300 hover:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentUser.shopName || currentUser.name}</span>
            </button>
          )}

          {!currentUser && onLoginClick && (
            <button
              onClick={onLoginClick}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition cursor-pointer shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              <span>লগইন</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4 shadow-xl">
        
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="আর্টিকেল কোড (যেমন: ART-101), জুতার নাম বা ব্র্যান্ড..."
              className="w-full pl-10 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/10 cursor-pointer transition"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>অর্ডার কার্ট</span>
            <span className="px-2.5 py-0.5 bg-slate-950 text-amber-400 rounded-full text-[11px] font-black">
              {toBnDigit(totalCartPairs)} জোড়া ({formatTaka(totalCartAmount)})
            </span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" /> ক্যাটাগরি:
          </span>
          {categories.map((cat) => {
            const count = cat === 'সব' ? products.length : products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  {toBnDigit(count)}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Product Display Grid */}
      {isGuestAccessDisabled ? (
        <LoginModal
          userAccounts={userAccounts}
          onLoginSuccess={(user) => {
            if (onLoginSuccess) {
              onLoginSuccess(user);
            }
          }}
        />
      ) : filteredProducts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-white">কোনো জুতা পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400">
            আপনার ফিল্টার বা সার্চে কোনো জুতা পাওয়া যায়নি। অন্য কিওয়ার্ড লিখে চেষ্টা করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stockPairs <= 0;
            const pairsPerCarton = product.pairsPerCarton || 12;

            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-2.5 space-y-2 flex flex-col justify-between shadow-md transition-all group hover:shadow-xl hover:shadow-amber-500/10"
              >
                <div className="space-y-2">
                  {/* Photo Thumbnail Container */}
                  <div
                    onClick={() => setPreviewProduct(product)}
                    className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center cursor-pointer group/img"
                  >
                    <ProductImageDisplay
                      src={product.imageUrl}
                      alt={product.name}
                      articleCode={product.articleCode}
                      category={product.category}
                      size="md"
                    />

                    {/* Quick View Button Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-1.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-lg flex items-center gap-1 shadow-md">
                        <Maximize2 className="w-3 h-3" /> বড় দেখুন
                      </span>
                    </div>

                    {/* Article Code Badge */}
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-950/90 text-amber-400 text-[9px] font-black rounded border border-slate-800">
                      {product.articleCode}
                    </span>

                    {/* Stock Status Badge */}
                    {isOutOfStock && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[8px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        স্টক শেষ
                      </span>
                    )}
                  </div>

                  {/* Compact Product Details */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-xs line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>সাইজ: <strong className="text-slate-200">{product.sizeRange}</strong></span>
                      <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-300 rounded">{product.brand}</span>
                    </div>

                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">পাইকারি:</span>
                      <strong className="text-emerald-400 font-black text-xs">
                        {formatTaka(product.sellPrice)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Compact Quick Buttons */}
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => handleAddToCart(product, 'cartons', 1)}
                    disabled={isOutOfStock}
                    className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/40 hover:text-slate-950 text-amber-300 font-extrabold text-[10px] rounded-lg flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                    +১ ডজন (১২ জোড়া)
                  </button>
                  <button
                    onClick={() => handleAddToCart(product, 'pairs', 6)}
                    disabled={isOutOfStock}
                    className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +৬ জোড়া স্যাম্পল
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Floating Sticky Cart Bar for Mobile */}
      {totalCartPairs > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto animate-slideUp">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border-2 border-amber-300 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-950 text-amber-400 rounded-xl">
                <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900">
                  বুকিং কার্ট ({toBnDigit(cart.length)} টি আইটেম)
                </div>
                <div className="text-sm font-black text-slate-950">
                  মোট {toBnDigit(totalCartPairs)} জোড়া
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black px-3 py-1 bg-slate-950 text-emerald-400 rounded-xl">
                {formatTaka(totalCartAmount)}
              </span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 p-5 relative">
            <button
              onClick={() => setPreviewProduct(null)}
              className="absolute right-4 top-4 z-10 p-2 rounded-full bg-slate-950/80 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <ProductImageDisplay
                src={previewProduct.imageUrl}
                alt={previewProduct.name}
                articleCode={previewProduct.articleCode}
                category={previewProduct.category}
                size="xl"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-xs rounded border border-amber-500/30">
                  {previewProduct.articleCode}
                </span>
                <span className="text-xs text-slate-400">ব্র্যান্ড: <strong className="text-white">{previewProduct.brand}</strong></span>
              </div>
              <h3 className="text-base font-bold text-white">{previewProduct.name}</h3>
              <p className="text-xs text-slate-300">সাইজ রেঞ্জ: {previewProduct.sizeRange}</p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">পাইকারি মূল্য:</span>
                <span className="text-emerald-400 font-extrabold text-sm">{formatTaka(previewProduct.sellPrice)} / জোড়া</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleAddToCart(previewProduct, 'cartons', 1);
                  setPreviewProduct(null);
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                কার্টে +১ কার্টুন যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5 text-white">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">আপনার বুকিং কার্ট</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-400">আপনার কার্টে কোনো প্রোডাক্ট সিলেক্ট করা নেই।</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${item.unitType}`}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                          {item.product.articleCode}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1">
                          {item.product.name}
                        </h4>
                        <div className="text-[10px] text-slate-400">
                          সাইজ: {item.product.sizeRange} • {formatTaka(item.product.sellPrice)}/জোড়া
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                        <button
                          onClick={() => updateCartQty(idx, item.quantityInput - 1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-white px-2">
                          {toBnDigit(item.quantityInput)} {item.unitType === 'cartons' ? 'ডজন' : 'জোড়া'}
                        </span>
                        <button
                          onClick={() => updateCartQty(idx, item.quantityInput + 1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total Amount for Item */}
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-emerald-400">
                          {formatTaka(item.totalAmount)}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          ({toBnDigit(item.totalPairs)} জোড়া)
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-white">
                  <span>মোট জোড়া:</span>
                  <span className="text-amber-400">{toBnDigit(totalCartPairs)} জোড়া</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base font-extrabold text-white">
                  <span>সর্বমোট বিল:</span>
                  <span className="text-emerald-400 text-lg">{formatTaka(totalCartAmount)}</span>
                </div>

                <button
                  onClick={handleOpenCheckoutModal}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition"
                >
                  <PackageCheck className="w-4 h-4" />
                  অর্ডার কনফার্ম করুন
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Checkout Form Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">দোকান তথ্য ও বুকিং কনফার্মেশন</h3>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckout} className="space-y-3">
              
              {/* Staff (Admin/Seller) Customer Dropdown */}
              {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'seller') && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-amber-400 shrink-0" />
                      অর্ডারটি কোন দোকানদারের জন্য কাটা হচ্ছে?
                    </span>
                    <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                      {currentUser.role === 'seller' ? 'সেলার মোড' : 'এডমিন মোড'}
                    </span>
                  </div>
                  <select
                    value={selectedAdminCustomerId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAdminCustomerId(val);
                      const selected = customers.find((c) => c.id === val);
                      if (selected) {
                        setPhone(selected.phone);
                        setShopName(selected.shopName);
                        setCustomerName(selected.name);
                        setAddress(selected.address);
                        setMatchedCustomer(selected);
                        setMatchedNotice(`${selected.shopName} (${selected.name}) - দোকানের তথ্য সফলভাবে পূর্ণ করা হয়েছে`);
                      } else if (val === 'NEW') {
                        setPhone('');
                        setShopName('');
                        setCustomerName('');
                        setAddress('');
                        setMatchedCustomer(null);
                        setMatchedNotice('নতুন কাস্টমারের মোবাইল, শপের নাম ও ঠিকানা নিচে লিখুন।');
                      }
                    }}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- নিবন্ধিত দোকানদার তালিকা থেকে সিলেক্ট করুন --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shopName} — {c.name} ({c.phone})
                      </option>
                    ))}
                    <option value="NEW">+ নতুন দোকানদার / ওয়াক-ইন গ্রাহক (ম্যানুয়ালি লিখুন)</option>
                  </select>
                </div>
              )}

              {/* Logged in Customer Welcome Notice */}
              {currentUser?.role === 'customer' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    স্বাগতম <strong>{currentUser.name}</strong>! আপনার নিবন্ধিত দোকানের তথ্য প্রাক-পূরণ করা হয়েছে।
                  </div>
                </div>
              )}

              {/* Informative Note for Guests */}
              {!currentUser && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-[11px] text-blue-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    আপনার মোবাইল নম্বর প্রদান করুন। আমাদের সিস্টেমে আপনার দোকান আগে থেকেই অন্তর্ভুক্ত থাকলে তথ্য সংক্রিয়ভাবে লিংক হবে।
                  </div>
                </div>
              )}

              {/* Phone Input */}
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">
                  মোবাইল নম্বর <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="০১৮১২-০০০০০"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Clickable Card if 11 digits match a registered shop */}
                {matchedCustomer && (
                  <button
                    type="button"
                    onClick={() => applyMatchedCustomer(matchedCustomer)}
                    className="w-full mt-2 text-left p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-xl transition cursor-pointer flex items-center justify-between group shadow-md"
                  >
                    <div className="space-y-0.5 pr-2">
                      <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>দোকান মিল পাওয়া গেছে: <strong className="text-white underline group-hover:text-amber-200">{matchedCustomer.shopName}</strong></span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        প্রোপ্রাইটর: {matchedCustomer.name} • ঠিকানা: {matchedCustomer.address}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded-lg shrink-0 group-hover:scale-105 transition-transform flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3 h-3" />
                      ক্লিক করে ফিল করুন
                    </span>
                  </button>
                )}

                {matchedNotice && (
                  <div className="mt-1.5 p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-300 font-medium flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{matchedNotice}</span>
                  </div>
                )}
              </div>

              {/* Shop Name */}
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">
                  দোকানের নাম (Shop Name) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="যেমন: আল-মদিনা শু হাউস"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">
                  প্রোপ্রাইটর / মালিকের নাম <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="যেমন: মো: রফিকুল ইসলাম"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">
                  ঠিকানা / বাজার এলাকা <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="যেমন: বাদামতলী মার্কেট, ফেনী"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Password - only for guest users */}
              {!currentUser && (
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">
                    পাসওয়ার্ড তৈরি করুন (ঐচ্ছিক - পরবর্তীতে লগইনের জন্য)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="আপনার পছন্দের গোপন পাসওয়ার্ড"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Checkout Calculation Summary */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>মোট মডেল আইটেম:</span>
                  <span className="font-bold">{toBnDigit(cart.length)} টি</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>মোট জুতার পরিমাণ:</span>
                  <span className="font-bold text-amber-400">{toBnDigit(totalCartPairs)} জোড়া</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 font-extrabold text-sm pt-1.5 border-t border-slate-800">
                  <span>আনুমানিক বিল:</span>
                  <span>{formatTaka(totalCartAmount)}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'প্রসেস হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 text-white p-6 rounded-3xl max-w-md w-full space-y-4 text-center shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">অর্ডার বুকিং সফল হয়েছে!</h3>
              <p className="text-xs text-slate-300">
                মেমো নম্বর: <strong className="text-amber-400 font-mono text-sm">{completedOrder.memoNo}</strong>
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>দোকানের নাম:</span>
                <strong className="text-white">{completedOrder.shopName}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>প্রোপ্রাইটর:</span>
                <strong className="text-white">{completedOrder.customerName}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>মোট পরিমাণ:</span>
                <strong className="text-amber-400">{toBnDigit(completedOrder.totalPairs)} জোড়া</strong>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1.5">
                <span>মোট বিল:</span>
                <strong className="text-emerald-400 font-extrabold">{formatTaka(completedOrder.grandTotal)}</strong>
              </div>
            </div>

            <p className="text-[11px] text-amber-300/90 leading-relaxed bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
              মেসার্স জান্নাত সুজ এডমিন আপনার অর্ডার চেক করে দ্রুত মাল ডেলিভারি প্রসেস করবে। আপনার মোবাইলে অটোমেটিক নিশ্চিতকরণ SMS চলে গেছে।
            </p>

            <button
              onClick={() => setCompletedOrder(null)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}

      {/* Customer Profile & Order History Modal */}
      {isCustomerProfileOpen && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    দোকানদার প্রোফাইল ও অর্ডার ইতিহাস
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      পাসওয়ার্ড দিয়ে সুরক্ষিত
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    গোপনীয়তা রক্ষায় পাসওয়ার্ড বা সিকিউরিটি পিন দিয়ে যাচাই করার পর মেমো দেখা যাবে
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomerProfileOpen(false)}
                className="p-1.5 rounded-full bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* IF NOT AUTHENTICATED: Show Password / PIN Login Form */}
            {!authenticatedCustomer ? (
              <form onSubmit={handleVerifyShopkeeperLogin} className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800/90 shadow-inner">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs pb-2 border-b border-slate-800">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>দোকানের তথ্য ও মেমো দেখতে পাসওয়ার্ড/পিন প্রবেশ করান:</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      দোকানের নিবন্ধিত মোবাইল নম্বর:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={profileAuthPhone}
                        onChange={(e) => setProfileAuthPhone(e.target.value)}
                        placeholder="১১ ডিজিটের নম্বর (যেমন: 01812345678)"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      পাসওয়ার্ড বা সিকিউরিটি পিন (PIN):
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showAuthPassword ? 'text' : 'password'}
                        value={profileAuthPassword}
                        onChange={(e) => setProfileAuthPassword(e.target.value)}
                        placeholder="আপনার পাসওয়ার্ড বা পিন প্রবেশ করান"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      * প্রথমবার মেমো দেখতে ফোন নম্বরের শেষ ৪ ডিজিট পিন হিসেবে ট্রাই করুন অথবা মেইন এডমিন একাউন্ট দিয়ে লগইন করুন।
                    </p>
                  </div>
                </div>

                {profileAuthError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{profileAuthError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>পাসওয়ার্ড দিয়ে যাচাই করুন ও প্রোফাইল দেখুন</span>
                  </button>

                  {!currentUser && onLoginClick && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomerProfileOpen(false);
                        onLoginClick();
                      }}
                      className="px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      <span>মেইন সিস্টেমে লগইন করুন</span>
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* IF AUTHENTICATED: Show Verified Profile & Order Memos */
              <div className="space-y-4">
                {/* Matched Customer Info Card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div>
                      <h4 className="text-base font-black text-amber-400 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-amber-400" />
                        {authenticatedCustomer.shopName}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        প্রোপ্রাইটর: <strong className="text-white">{authenticatedCustomer.name}</strong> • মোবাইল: <span className="font-mono text-slate-300">{authenticatedCustomer.phone}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" /> {authenticatedCustomer.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> সুরক্ষিত একাউন্ট
                      </span>

                      <button
                        type="button"
                        onClick={handleLockProfile}
                        className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="সিকিউরিটি লগআউট"
                      >
                        <LogOut className="w-3 h-3 text-rose-400" />
                        <span>লগআউট</span>
                      </button>
                    </div>
                  </div>

                  {/* Due & Credit Summary Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className={`p-3 rounded-xl border ${authenticatedCustomer.currentDue > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">বর্তমান মোট বাকী</span>
                      <strong className={`text-base font-black ${authenticatedCustomer.currentDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {formatTaka(authenticatedCustomer.currentDue)}
                      </strong>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">বাকীর সর্বোচ্চ সীমা (ক্রেডিট লিমিট)</span>
                      <strong className="text-base font-black text-slate-200">
                        {formatTaka(authenticatedCustomer.creditLimit || 50000)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Order Memos History List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-400" />
                      আপনার অর্ডার মেমো ইতিহাস ({toBnDigit(customerOrdersHistory.length)} টি)
                    </h4>
                  </div>

                  {customerOrdersHistory.length === 0 ? (
                    <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2">
                      <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">এই ফোন নম্বরে কোনো পূর্বের অর্ডার মেমো পাওয়া যায়নি।</p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {customerOrdersHistory.map((ord) => {
                        const statusBadge =
                          ord.status === 'delivered' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ডেলিভার্ড</span>
                          ) : ord.status === 'processing' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">প্রসেসিং</span>
                          ) : ord.status === 'cancelled' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">বাতিল</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">নতুন বুকিং</span>
                          );

                        return (
                          <div
                            key={ord.id}
                            className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 hover:border-amber-500/40 transition flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-amber-400">{ord.memoNo}</span>
                                {statusBadge}
                              </div>
                              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-500" /> {ord.date} {ord.time ? `(${ord.time})` : ''}
                              </p>
                              <p className="text-[11px] text-slate-300 font-medium">
                                {toBnDigit(ord.totalPairs)} জোড়া • মোট বিল: <strong className="text-emerald-400">{formatTaka(ord.grandTotal)}</strong>
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedHistoryOrder(ord)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 transition cursor-pointer shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>মেমো দেখুন</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCustomerProfileOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Historical Order Memo Invoice Popup */}
      {selectedHistoryOrder && (
        <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-amber-400 font-mono">
                  {selectedHistoryOrder.memoNo}
                </h3>
                <p className="text-[11px] text-slate-400">
                  তারিখ: {selectedHistoryOrder.date} | মেসার্স জান্নাত সুজ
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryOrder(null)}
                className="p-1 rounded-full bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">দোকানের নাম:</span>
                <strong className="text-white">{selectedHistoryOrder.shopName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">প্রোপ্রাইটর:</span>
                <strong className="text-white">{selectedHistoryOrder.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">মোবাইল:</span>
                <span className="font-mono text-slate-300">{selectedHistoryOrder.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ঠিকানা:</span>
                <span className="text-slate-300">{selectedHistoryOrder.address}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">আর্টিকেল</th>
                    <th className="p-2.5 text-center">পরিমাণ</th>
                    <th className="p-2.5 text-right">রেট</th>
                    <th className="p-2.5 text-right">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {selectedHistoryOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <div className="font-bold text-amber-300">{item.articleCode}</div>
                        <div className="text-[10px] text-slate-400">{item.productName} ({item.sizeRange})</div>
                      </td>
                      <td className="p-2.5 text-center font-bold">
                        {toBnDigit(item.totalPairs)} জোড়া
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        {formatTaka(item.unitSellPrice)}
                      </td>
                      <td className="p-2.5 text-right font-bold font-mono text-emerald-400">
                        {formatTaka(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">সর্বমোট বিল:</span>
              <span className="text-emerald-400 font-black text-sm">{formatTaka(selectedHistoryOrder.grandTotal)}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট / মেমো ডাউনলোড</span>
              </button>
              <button
                onClick={() => setSelectedHistoryOrder(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
