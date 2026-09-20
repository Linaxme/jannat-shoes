export type UserRole = 'super_admin' | 'admin' | 'seller' | 'customer';

export interface UserAccount {
  id: string;
  name: string;
  shopName?: string;
  loginId: string; // ফোন নম্বর বা সিন্থেটিক ইমেইল
  password: string;
  role: UserRole;
  phone: string;
  email?: string;
  area?: string;
  sellerId?: string;
  initialDue?: number;
  isActive: boolean;
  createdAt: string;
  isOffline?: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  avatar?: string;
}

export interface ShoeProduct {
  id: string;
  articleCode: string; // e.g., "M-102", "L-88", "S-405"
  name: string; // e.g., "অরিজিনাল লেদার লোফার"
  category: 'জেন্টস ফর্মাল' | 'জেন্টস ক্যাজুয়াল' | 'স্পোর্টস কেডস' | 'লেডিস হিল/স্যান্ডেল' | 'বাচ্চাদের জুতা' | string;
  brand: string; // e.g. "জান্নাত সুজ", "বাটা স্টাইল", "পেগাসাস", "এপেক্স স্টাইল"
  sizeRange: string; // e.g., "৩৯-৪৪" (39-44) or "৩৬-৪০"
  buyPrice: number; // ক্রয় মূল্য (প্রতি জোড়া)
  sellPrice: number; // পাইকারি বিক্রয় মূল্য (প্রতি জোড়া)
  retailPrice: number; // খুচরা মূল্য (এমআরপি)
  pairsPerCarton: number; // ডজনে কত জোড়া (যেমন: ১২ জোড়া / ৬ জোড়া)
  stockPairs: number; // স্টকে মোট মজুদ জোড়া
  minStockAlert: number; // সর্বনিম্ন মজুদ সতর্কবার্তা সীমা
  imageUrl: string;
  description?: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string; //Proprietor / Customer Name
  shopName: string; // দোকানের নাম (e.g. "আল-মদিনা শু হাউস")
  address: string; // এলাকা / জেলা (e.g. "বাদামতলী, ফেনী")
  phone: string;
  assignedSellerId: string; // কোন সেলারের আন্ডারে কাস্টমার
  assignedSellerName: string;
  sellerId?: string;
  sellerName?: string;
  currentDue: number; // বর্তমান মোট বাকী (টাকা)
  creditLimit: number; // সর্বোচ্চ বাকীর সীমা
  lastDueReminderDate?: string; // YYYY-MM-DD format, tracks the last date a due reminder was sent
}

export interface SalesRep {
  id: string;
  name: string; // সেলারের নাম
  phone: string;
  area: string; // সেলস এলাকা
  monthlyTargetPairs: number; // মাসিক টার্গেট (জোড়া)
  monthlyTargetAmount?: number; // মাসিক টার্গেট (টাকায়)
  commissionRatePercent: number; // সেলসের ওপর কমিশন শতাংশ (যেমন 2.5%)
  commissionPerPair?: number; // প্রতি জোড়ায় নির্দিষ্ট কমিশন (টাকা)
  commissionType?: 'percent' | 'per_pair' | 'both'; // কমিশন মডেল
  role?: string;
  isAdmin?: boolean;
}

export interface OrderItem {
  productId: string;
  articleCode: string;
  productName: string;
  sizeRange: string;
  unitType: 'pairs' | 'cartons'; // জোড়া নাকি ডজন
  quantityInput: number; // সংখ্যা (কত জোড়া বা কত ডজন)
  totalPairs: number; // হিসাব করা মোট জোড়া
  unitSellPrice: number; // প্রতি জোড়ার পাইকারি বিক্রয় মূল্য
  unitBuyPrice: number; // প্রতি জোড়ার ক্রয় মূল্য
  commissionPerPair?: number; // জোড়া প্রতি কমিশন (যেমন ৪ টাকা)
  netUnitPrice?: number; // কার্যকরী রেট = unitSellPrice - commissionPerPair
  totalCommission?: number; // মোট কমিশন = totalPairs * commissionPerPair
  totalAmount: number; // মোট দাম (টাকা)
}

export interface Order {
  id: string;
  memoNo: string; // e.g. "MEMO-2026-1001"
  date: string; // YYYY-MM-DD
  time: string; // HH:mm AM/PM
  createdAt?: number | string;
  customerId: string;
  customerName: string;
  shopName: string;
  customerPhone: string;
  customerAddress: string;
  phone?: string;
  address?: string;
  customerShop?: string;
  transportName?: string;
  netPayable?: number;
  sellerId: string;
  sellerName: string;
  items: OrderItem[];
  totalPairs: number; // মোট জোড়া
  totalCartons: number; // মোট ডজন (আনুমানিক)
  subTotal: number; // মোট গায়ের দাম
  totalCommission?: number; // মোট জোড়া প্রতি কমিশন বাবদ ছাড়
  discount: number; // ছাড় (টাকা)
  adjustmentAmount: number; // রাউন্ড অফ / এডজাস্টমেন্ট
  grandTotal: number; // নিট বিল
  paidAmount: number; // জমা / পরিশোধিত টাকা
  dueAmount: number; // নতুন বাকী টাকা
  previousDue: number; // পূর্বের বাকী
  totalNetDue: number; // সর্বমোট বাকি (পূর্বের + নতুন)
  paymentMethod: 'নগদ ক্যাশ' | 'বিকাশ / নগদ' | 'ব্যাংক ট্রান্সফার' | 'বাকী (ডিউ)';
  status: 'পরিশোধিত' | 'আংশিক বাকী' | 'সম্পূর্ণ বাকী';
  orderType?: 'sample_booking' | 'direct_sale';
  deliveryStatus?: 'booked' | 'delivered';
  deliveryDate?: string; // YYYY-MM-DD যখন অর্ডারটি ডেলিভারি হলো
  deliveryPaidAmount?: number; // ডেলিভারির সময়ে নগদ আদায়কৃত টাকা
  deliveryPaymentMethod?: string;
  deliveryNotes?: string;
  isOnlineOrder?: boolean;
  isClaimed?: boolean;
  notes?: string;
}

export interface ConfirmDeliveryData {
  deliveryDate: string;
  collectedAtDelivery: number;
  paymentMethod: 'নগদ ক্যাশ' | 'বিকাশ / নগদ' | 'ব্যাংক ট্রান্সফার';
  notes?: string;
}

export interface DuePaymentLog {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  shopName: string;
  sellerId: string;
  sellerName: string;
  amountPaid: number;
  discountAmount?: number;
  previousDue: number;
  remainingDue: number;
  paymentMethod: string;
  receivedBy: string;
  receiptNo: string;
  notes?: string;
}

export interface RestockLog {
  id: string;
  date: string;
  productId: string;
  productName: string;
  articleCode: string;
  addedPairs: number;
  buyPrice: number;
  supplierName: string;
  notes?: string;
}

export type UIThemeId = 'royal_navy' | 'leather_craft' | 'emerald_dark';

export interface UITheme {
  id: UIThemeId;
  nameBn: string;
  nameEn: string;
  descBn: string;
  bgClass: string;
  cardClass: string;
  headerClass: string;
  primaryBtnClass: string;
  accentBadgeClass: string;
  textPrimaryClass: string;
  borderClass: string;
}

export interface SystemConfig {
  id: string;
  enableSellerTracking: boolean;
  enableTargetSystem: boolean;
  enableCommissionSystem: boolean;
  enableSampleBooking: boolean;
  enableStockAlerts: boolean;
  enableProfitCalculation: boolean;
  enableSMS?: boolean;
  allowGuestBrowsingAndOrder?: boolean;
  allowSellerToSeeFinancials: boolean;
  allowSellerToSeeOtherSellersSales?: boolean;
  allowSellerToSeeOtherSellersDue?: boolean;
  allowSellerToEditStock?: boolean;
  allowSellerToManageUsers?: boolean;
  smsBalance?: number;
  totalSentSms?: number;
  categories?: string[];
  apkDownloadUrl?: string;
}

export type TrashItemType = 'order' | 'customer' | 'user' | 'product';

export interface TrashItem {
  id: string; // unique ID in trash collection
  itemType: TrashItemType;
  itemId: string; // original entity ID
  title: string;
  subtitle?: string;
  details?: string;
  trashedAt: string; // ISO string
  trashedBy?: string; // name or role
  originalData: any; // complete snapshot to allow exact restoration
}

