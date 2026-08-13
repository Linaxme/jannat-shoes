import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Default DB

async function check() {
  const snap1 = await getDocs(collection(db, 'products'));
  console.log('Products:', snap1.docs.length);
  const snap2 = await getDocs(collection(db, 'orders'));
  console.log('Orders:', snap2.docs.length);
  const snap3 = await getDocs(collection(db, 'customers'));
  console.log('Customers:', snap3.docs.length);
  process.exit(0);
}
check().catch(console.error);
