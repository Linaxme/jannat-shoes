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
  isActive: boolean;
  createdAt: string;
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
  category: 'জেন্টস ফর্মাল' | 'জেন্টস ক্যাজুয়াল' | 'স্পোর্টস কেডস' | 'লেডিস হিল/স্যান্ডেল' | 'বাচ্চাদের জুতা';
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
  commissionRatePercent: number; // কমিশন শতাংশ (যেমন 2.5%)
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
  totalAmount: number; // মোট দাম (টাকা)
}

export interface Order {
  id: string;
  memoNo: string; // e.g. "MEMO-2026-1001"
  date: string; // YYYY-MM-DD
  time: string; // HH:mm AM/PM
  customerId: string;
  customerName: string;
  shopName: string;
  customerPhone: string;
  customerAddress: string;
  sellerId: string;
  sellerName: string;
  items: OrderItem[];
  totalPairs: number; // মোট জোড়া
  totalCartons: number; // মোট ডজন (আনুমানিক)
  subTotal: number; // মোট গায়ের দাম
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
  isOnlineOrder?: boolean;
  isClaimed?: boolean;
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
}

