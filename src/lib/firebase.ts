import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy, where } from 'firebase/firestore';
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

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);

export { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy, where };
export { RecaptchaVerifier, signInWithPhoneNumber };


