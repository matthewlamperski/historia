import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC6iWREcoNo_IQ--rCZORs4evOMmhrIEnE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "historia-application.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "historia-application",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "historia-application.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "135408828364",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:135408828364:web:65289ee646662bc66fa769",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
