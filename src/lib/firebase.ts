import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

export { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, orderBy };


