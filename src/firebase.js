// src/firebase.js
// Firebase app init. These config values are not secret — they just tell the
// SDK which project to talk to. Access is controlled by Firestore Security
// Rules (see the console), not by hiding this object.
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyABtoRofZ2VolMN6LhU0pPeDmwSRxwhBBo",
  authDomain: "tianzige.firebaseapp.com",
  projectId: "tianzige",
  storageBucket: "tianzige.firebasestorage.app",
  messagingSenderId: "542666491499",
  appId: "1:542666491499:web:3d74ec9e839abfdec0532e",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
