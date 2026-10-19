// يُحمَّل فقط عند وجود إعدادات Firebase
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile,
} from "firebase/auth";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";

export function init(cfg) {
  const app = initializeApp(cfg);
  return { auth: getAuth(app), db: getFirestore(app), api };
}
export const api = {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, updateProfile, collection, doc, getDocs, setDoc, deleteDoc,
};
