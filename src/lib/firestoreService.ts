import { db, collection, getDocs, getDocsFromCache, doc, setDoc, deleteDoc, writeBatch, query, where, orderBy } from './firebase';
import { ShoeProduct, Customer, SalesRep, Order, DuePaymentLog, UserAccount, SystemConfig, TrashItem, SMSLog } from '../types';
import { INITIAL_USER_ACCOUNTS, DEFAULT_SYSTEM_CONFIG } from '../data/initialData';

const LOCAL_SNAPSHOT_KEY = 'lixa_app_snapshot_v1';

export interface CachedAppData {
  products: ShoeProduct[];
  customers: Customer[];
  sellers: SalesRep[];
  orders: Order[];
  paymentLogs: DuePaymentLog[];
  userAccounts: UserAccount[];
  systemConfig: SystemConfig;
  trashItems: TrashItem[];
  smsLogs: SMSLog[];
}

export function loadCachedAppData(): CachedAppData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedAppData;
  } catch {
    return null;
  }
}

export function saveCachedAppData(data: Partial<CachedAppData>) {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadCachedAppData();
    const merged = {
      products: data.products ?? existing?.products ?? [],
      customers: data.customers ?? existing?.customers ?? [],
      sellers: data.sellers ?? existing?.sellers ?? [],
      orders: data.orders ?? existing?.orders ?? [],
      paymentLogs: data.paymentLogs ?? existing?.paymentLogs ?? [],
      userAccounts: data.userAccounts ?? existing?.userAccounts ?? INITIAL_USER_ACCOUNTS,
      systemConfig: data.systemConfig ?? existing?.systemConfig ?? DEFAULT_SYSTEM_CONFIG,
      trashItems: data.trashItems ?? existing?.trashItems ?? [],
      smsLogs: data.smsLogs ?? existing?.smsLogs ?? [],
    };
    try {
      localStorage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(merged));
    } catch {
      // If localStorage quota is exceeded due to large base64 images, store lightweight product entries
      const lightProducts = merged.products.map(p => ({
        ...p,
        imageUrl: p.imageUrl && p.imageUrl.startsWith('data:') && p.imageUrl.length > 2048 ? '' : p.imageUrl,
      }));
      localStorage.setItem(
        LOCAL_SNAPSHOT_KEY,
        JSON.stringify({ ...merged, products: lightProducts, trashItems: [] })
      );
    }
  } catch {
    // Ignore storage errors
  }
}

export async function deleteDocumentFromFirestore(collectionName: string, id: string) {
  try {
    const ref = doc(db, collectionName, id);
    await deleteDoc(ref);
  } catch (err) {
    console.error(`Error deleting from ${collectionName}/${id}:`, err);
  }
}

export async function clearAllDatabaseData() {
  try {
    const collectionsToClear = ['products', 'customers', 'sellers', 'orders', 'paymentLogs'];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(doc(db, colName, d.id));
      });
      await batch.commit();
    }
    console.log('All products, customers, sellers, orders and payment logs cleared from database!');
  } catch (err) {
    console.error('Error clearing database data:', err);
  }
}

export const SMS_LOG_RETENTION_MS = 48 * 60 * 60 * 1000; // 48 hours

export function getSMSLogTimestamp(log: SMSLog): number {
  if (typeof log.timestamp === 'number' && !isNaN(log.timestamp) && log.timestamp > 0) {
    return log.timestamp;
  }
  const idMatch = log.id?.match(/^sms-(\d{10,15})/);
  if (idMatch) {
    return Number(idMatch[1]);
  }
  if (log.date) {
    const parsed = new Date(log.date).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return Date.now();
}

export async function cleanupExpiredSMSLogs(logs: SMSLog[]): Promise<SMSLog[]> {
  const now = Date.now();
  const validLogs: SMSLog[] = [];
  const expiredLogs: SMSLog[] = [];

  for (const log of logs) {
    if (now - getSMSLogTimestamp(log) >= SMS_LOG_RETENTION_MS) {
      expiredLogs.push(log);
    } else {
      validLogs.push(log);
    }
  }

  if (expiredLogs.length > 0) {
    // Run deletion in background without blocking UI or data load
    const batch = writeBatch(db);
    expiredLogs.forEach(l => {
      batch.delete(doc(db, 'smsLogs', l.id));
    });
    batch.commit().catch(err => {
      console.error('Error auto-deleting expired SMS logs:', err);
    });
  }

  return validLogs;
}

export async function fetchFirestoreCachedData(): Promise<CachedAppData | null> {
  try {
    const safeCacheGet = async (colName: string) => {
      try {
        return await getDocsFromCache(collection(db, colName));
      } catch {
        return null;
      }
    };

    const [
      productsSnap,
      customersSnap,
      sellersSnap,
      ordersSnap,
      paymentLogsSnap,
      usersSnap,
      configSnap,
      trashSnap,
      smsLogsSnap
    ] = await Promise.all([
      safeCacheGet('products'),
      safeCacheGet('customers'),
      safeCacheGet('sellers'),
      safeCacheGet('orders'),
      safeCacheGet('paymentLogs'),
      safeCacheGet('userAccounts'),
      safeCacheGet('systemConfig'),
      safeCacheGet('trash'),
      safeCacheGet('smsLogs')
    ]);

    const products = productsSnap ? productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShoeProduct)) : [];
    const customers = customersSnap ? customersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)) : [];
    const sellers = sellersSnap ? sellersSnap.docs.map(d => ({ id: d.id, ...d.data() } as SalesRep)) : [];
    const orders = ordersSnap ? ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)) : [];
    const paymentLogs = paymentLogsSnap ? paymentLogsSnap.docs.map(d => ({ id: d.id, ...d.data() } as DuePaymentLog)) : [];
    const userAccounts = usersSnap ? usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserAccount)) : [];
    const systemConfigs = configSnap ? configSnap.docs.map(d => ({ id: d.id, ...d.data() } as SystemConfig)) : [];
    const trashItems = trashSnap ? trashSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrashItem)) : [];
    const rawSmsLogs = smsLogsSnap ? smsLogsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SMSLog)) : [];

    const hasAnyCachedData =
      products.length > 0 ||
      customers.length > 0 ||
      orders.length > 0 ||
      userAccounts.length > 0;

    if (!hasAnyCachedData) return null;

    const now = Date.now();
    const smsLogs = rawSmsLogs.filter(l => now - getSMSLogTimestamp(l) < SMS_LOG_RETENTION_MS);

    return {
      products,
      customers,
      sellers,
      orders,
      paymentLogs,
      userAccounts: userAccounts.length > 0 ? userAccounts : INITIAL_USER_ACCOUNTS,
      systemConfig: systemConfigs.length > 0 ? systemConfigs[0] : DEFAULT_SYSTEM_CONFIG,
      trashItems,
      smsLogs,
    };
  } catch {
    return null;
  }
}

export async function fetchFirestoreData() {
  try {
    const [
      productsSnap,
      customersSnap,
      sellersSnap,
      ordersSnap,
      paymentLogsSnap,
      usersSnap,
      configSnap,
      trashSnap,
      smsLogsSnap
    ] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'sellers')),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'paymentLogs')),
      getDocs(collection(db, 'userAccounts')),
      getDocs(collection(db, 'systemConfig')),
      getDocs(collection(db, 'trash')),
      getDocs(collection(db, 'smsLogs'))
    ]);

    const products: ShoeProduct[] = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShoeProduct));
    const customers: Customer[] = customersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
    const sellers: SalesRep[] = sellersSnap.docs.map(d => ({ id: d.id, ...d.data() } as SalesRep));
    const orders: Order[] = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    const paymentLogs: DuePaymentLog[] = paymentLogsSnap.docs.map(d => ({ id: d.id, ...d.data() } as DuePaymentLog));
    const userAccounts: UserAccount[] = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserAccount));
    const systemConfigs: SystemConfig[] = configSnap.docs.map(d => ({ id: d.id, ...d.data() } as SystemConfig));
    const trashItems: TrashItem[] = trashSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrashItem));
    const rawSmsLogs: SMSLog[] = smsLogsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SMSLog));
    const smsLogs: SMSLog[] = await cleanupExpiredSMSLogs(rawSmsLogs);
    const systemConfig = systemConfigs.length > 0 ? systemConfigs[0] : DEFAULT_SYSTEM_CONFIG;

    // Seed defaults in background without blocking return
    if (userAccounts.length === 0) {
      const batch = writeBatch(db);
      INITIAL_USER_ACCOUNTS.forEach(u => {
        batch.set(doc(db, 'userAccounts', u.id), u);
      });
      batch.commit().catch(err => console.error('Error seeding users:', err));
    }

    if (systemConfigs.length === 0) {
      setDoc(doc(db, 'systemConfig', DEFAULT_SYSTEM_CONFIG.id), DEFAULT_SYSTEM_CONFIG).catch(err =>
        console.error('Error seeding systemConfig:', err)
      );
    }

    const finalData = {
      products,
      customers,
      sellers,
      orders,
      paymentLogs,
      userAccounts: userAccounts.length > 0 ? userAccounts : INITIAL_USER_ACCOUNTS,
      systemConfig,
      trashItems,
      smsLogs,
      isSeeded: false
    };

    saveCachedAppData(finalData);
    return finalData;
  } catch (err) {
    console.error('Error fetching from Firestore:', err);
    const fallback = loadCachedAppData();
    if (fallback) {
      return { ...fallback, isSeeded: false };
    }
    return {
      products: [],
      customers: [],
      sellers: [],
      orders: [],
      paymentLogs: [],
      userAccounts: INITIAL_USER_ACCOUNTS,
      systemConfig: DEFAULT_SYSTEM_CONFIG,
      trashItems: [],
      smsLogs: [],
      isSeeded: false
    };
  }
}

export async function seedFirestoreData() {
  // Empty seed function kept for backwards compatibility if referenced
}

// Helper to strip undefined values recursively so Firestore setDoc does not throw errors
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = sanitizeForFirestore(val);
    }
  }
  return cleaned;
}

export async function saveDocumentToFirestore(collectionName: string, id: string, data: any) {
  try {
    const ref = doc(db, collectionName, id);
    const sanitized = sanitizeForFirestore(data);
    await setDoc(ref, sanitized, { merge: true });
  } catch (err) {
    console.error(`Error saving to ${collectionName}/${id}:`, err);
  }
}

