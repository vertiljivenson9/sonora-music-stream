import { initializeApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAMse_dDSSkgYe8o1nksi73MeFos0prF7k",
  authDomain: "sonara-e38cb.firebaseapp.com",
  databaseURL: "https://sonara-e38cb-default-rtdb.firebaseio.com",
  projectId: "sonara-e38cb",
  storageBucket: "sonara-e38cb.firebasestorage.app",
  messagingSenderId: "1097009305788",
  appId: "1:1097009305788:web:7b80ad960b28d0024918b9",
  measurementId: "G-R10X1R010P"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const storage = getStorage(app);
export const database = getDatabase(app);
export const auth = getAuth(app);
export default app;
