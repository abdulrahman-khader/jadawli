// اتصال Firebase. البيانات تُحفظ أيضاً على الجهاز (IndexedDB) فيفتح الموقع فوراً في المرات التالية
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile,
} from "firebase/auth";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  collection, doc, getDocs, setDoc, deleteDoc, updateDoc, onSnapshot,
} from "firebase/firestore";

export function init(cfg) {
  const app = initializeApp(cfg);
  let db;
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch { db = initializeFirestore(app, { localCache: memoryLocalCache() }); } // متصفح لا يدعم التخزين المحلي
  return { auth: getAuth(app), db, api };
}
export const api = {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, updateProfile, collection, doc, getDocs, setDoc, deleteDoc, updateDoc, onSnapshot,
};
