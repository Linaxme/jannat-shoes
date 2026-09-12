import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB9Lfjm9cXUkqHDcP93rn85FFz5dY39gxE",
  authDomain: "stokm-fe3c1.firebaseapp.com",
  projectId: "stokm-fe3c1",
  storageBucket: "stokm-fe3c1.firebasestorage.app",
  messagingSenderId: "987062417795",
  appId: "1:987062417795:web:d010f7efafe744165cdeb6",
  measurementId: "G-R3BVMMTL9H"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  try {
    firestoreDb = getFirestore(app);
  } catch {
    firestoreDb = getFirestore();
  }
}

export const db = firestoreDb;

// Check connection gracefully in the background without throwing unhandled exceptions
if (typeof window !== 'undefined') {
  setTimeout(() => {
    getDocFromServer(doc(db, 'systemConfig', 'conn_ping')).catch(() => {
      // Offline mode or handshake in progress
    });
  }, 1000);
}

export const auth = getAuth(app);

export { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy, where };
export { RecaptchaVerifier, signInWithPhoneNumber };
