import { db, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from './firebase';

export async function deleteDocumentFromFirestore(collectionName: string, id: string) {
  try {
    const ref = doc(db, collectionName, id);
    await deleteDoc(ref);
  } catch (err) {
    console.error(`Error deleting from ${collectionName}/${id}:`, err);
  }
}
import { ShoeProduct, Customer, SalesRep, Order, DuePaymentLog, UserAccount, SystemConfig } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES_REPS, INITIAL_ORDERS, INITIAL_PAYMENT_LOGS, INITIAL_USER_ACCOUNTS, DEFAULT_SYSTEM_CONFIG } from '../data/initialData';

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

    // If Firestore is completely empty, seed it automatically with initial data!
    if (products.length === 0 && customers.length === 0) {
      await seedFirestoreData();
      return {
        products: INITIAL_PRODUCTS,
        customers: INITIAL_CUSTOMERS,
        sellers: INITIAL_SALES_REPS,
        orders: INITIAL_ORDERS,
        paymentLogs: INITIAL_PAYMENT_LOGS,
        userAccounts: INITIAL_USER_ACCOUNTS,
        systemConfig: DEFAULT_SYSTEM_CONFIG,
        isSeeded: true
      };
    }

    return {
      products: products.length > 0 ? products : INITIAL_PRODUCTS,
      customers: customers.length > 0 ? customers : INITIAL_CUSTOMERS,
      sellers: sellers.length > 0 ? sellers : INITIAL_SALES_REPS,
      orders: orders,
      paymentLogs: paymentLogs,
      userAccounts: userAccounts.length > 0 ? userAccounts : INITIAL_USER_ACCOUNTS,
      systemConfig: systemConfig,
      isSeeded: false
    };
  } catch (err) {
    console.error('Error fetching from Firestore:', err);
    return {
      products: INITIAL_PRODUCTS,
      customers: INITIAL_CUSTOMERS,
      sellers: INITIAL_SALES_REPS,
      orders: INITIAL_ORDERS,
      paymentLogs: INITIAL_PAYMENT_LOGS,
      userAccounts: INITIAL_USER_ACCOUNTS,
      systemConfig: DEFAULT_SYSTEM_CONFIG,
      isSeeded: false
    };
  }
}

export async function seedFirestoreData() {
  try {
    const batch = writeBatch(db);

    INITIAL_PRODUCTS.forEach(item => {
      const ref = doc(db, 'products', item.id);
      batch.set(ref, item);
    });

    INITIAL_CUSTOMERS.forEach(item => {
      const ref = doc(db, 'customers', item.id);
      batch.set(ref, item);
    });

    INITIAL_SALES_REPS.forEach(item => {
      const ref = doc(db, 'sellers', item.id);
      batch.set(ref, item);
    });

    INITIAL_ORDERS.forEach(item => {
      const ref = doc(db, 'orders', item.id);
      batch.set(ref, item);
    });

    INITIAL_PAYMENT_LOGS.forEach(item => {
      const ref = doc(db, 'paymentLogs', item.id);
      batch.set(ref, item);
    });

    INITIAL_USER_ACCOUNTS.forEach(item => {
      const ref = doc(db, 'userAccounts', item.id);
      batch.set(ref, item);
    });

    const configRef = doc(db, 'systemConfig', DEFAULT_SYSTEM_CONFIG.id);
    batch.set(configRef, DEFAULT_SYSTEM_CONFIG);

    await batch.commit();
    console.log('Firestore successfully seeded with Jannat Shoes wholesale data!');
  } catch (err) {
    console.error('Error seeding Firestore:', err);
  }
}

export async function saveDocumentToFirestore(collectionName: string, id: string, data: any) {
  try {
    const ref = doc(db, collectionName, id);
    await setDoc(ref, data, { merge: true });
  } catch (err) {
    console.error(`Error saving to ${collectionName}/${id}:`, err);
  }
}
