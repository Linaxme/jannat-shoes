import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

let firebaseConfig: any = defaultFirebaseConfig;
try {
  const saved = localStorage.getItem('custom_firebase_config');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.projectId) {
      firebaseConfig = parsed;
    }
  }
} catch (e) {
  console.error("Failed to load custom firebase config", e);
}

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

export { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy };


