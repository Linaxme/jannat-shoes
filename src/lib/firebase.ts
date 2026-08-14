import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy, where, enableIndexedDbPersistence } from 'firebase/firestore';
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

try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence');
    }
  });
} catch (e) {
  console.warn('Could not enable persistence:', e);
}

export const auth = getAuth(app);

export { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy, where };
export { RecaptchaVerifier, signInWithPhoneNumber };


