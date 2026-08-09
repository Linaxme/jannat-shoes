import { db, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from './firebase';
import { ShoeProduct, Customer, SalesRep, Order, DuePaymentLog, UserAccount, SystemConfig } from '../types';
import { INITIAL_USER_ACCOUNTS, DEFAULT_SYSTEM_CONFIG } from '../data/initialData';

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

export async function fetchFirestoreData() {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    const customersSnap = await getDocs(collection(db, 'customers'));
    const sellersSnap = await getDocs(collection(db, 'sellers'));
    const ordersSnap = await getDocs(collection(db, 'orders'));
    const paymentLogsSnap = await getDocs(collection(db, 'paymentLogs'));
    const usersSnap = await getDocs(collection(db, 'userAccounts'));
    const configSnap = await getDocs(collection(db, 'systemConfig'));

    const products: ShoeProduct[] = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShoeProduct));
    const customers: Customer[] = customersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
    const sellers: SalesRep[] = sellersSnap.docs.map(d => ({ id: d.id, ...d.data() } as SalesRep));
    const orders: Order[] = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    const paymentLogs: DuePaymentLog[] = paymentLogsSnap.docs.map(d => ({ id: d.id, ...d.data() } as DuePaymentLog));
    const userAccounts: UserAccount[] = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserAccount));
    const systemConfigs: SystemConfig[] = configSnap.docs.map(d => ({ id: d.id, ...d.data() } as SystemConfig));
    const systemConfig = systemConfigs.length > 0 ? systemConfigs[0] : DEFAULT_SYSTEM_CONFIG;

    if (userAccounts.length === 0) {
      const batch = writeBatch(db);
      INITIAL_USER_ACCOUNTS.forEach(u => {
        batch.set(doc(db, 'userAccounts', u.id), u);
      });
      await batch.commit();
    }

    if (systemConfigs.length === 0) {
      await setDoc(doc(db, 'systemConfig', DEFAULT_SYSTEM_CONFIG.id), DEFAULT_SYSTEM_CONFIG);
    }

    return {
      products,
      customers,
      sellers,
      orders,
      paymentLogs,
      userAccounts: userAccounts.length > 0 ? userAccounts : INITIAL_USER_ACCOUNTS,
      systemConfig,
      isSeeded: false
    };
  } catch (err) {
    console.error('Error fetching from Firestore:', err);
    return {
      products: [],
      customers: [],
      sellers: [],
      orders: [],
      paymentLogs: [],
      userAccounts: INITIAL_USER_ACCOUNTS,
      systemConfig: DEFAULT_SYSTEM_CONFIG,
      isSeeded: false
    };
  }
}

export async function seedFirestoreData() {
  // Empty seed function kept for backwards compatibility if referenced
}

export async function saveDocumentToFirestore(collectionName: string, id: string, data: any) {
  try {
    const ref = doc(db, collectionName, id);
    await setDoc(ref, data, { merge: true });
  } catch (err) {
    console.error(`Error saving to ${collectionName}/${id}:`, err);
  }
}
