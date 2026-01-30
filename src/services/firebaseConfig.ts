import { initializeApp, getApps } from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

// Firebase configuration - for development, using minimal config to prevent errors
// For production, replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC6iWREcoNo_IQ--rCZORs4evOMmhrIEnE",
  authDomain: "historia-application.firebaseapp.com",
  projectId: "historia-application",
  storageBucket: "historia-application.firebasestorage.app",
  messagingSenderId: "135408828364",
  appId: "1:135408828364:web:65289ee646662bc66fa769",
  measurementId: "G-EPLW4PV103"
};

// Initialize Firebase only if it hasn't been initialized
const initializeFirebase = () => {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
};

// Initialize Firebase
initializeFirebase();

// Export Firebase services
export { firestore, storage, auth };
export default firestore;

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  COMMENTS: 'comments',
  LANDMARKS: 'landmarks',
} as const;