import admin from 'firebase-admin';

let initialized = false;

const getAdminApp = () => {
  if (!initialized && admin.apps.length === 0) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'sonara-e38cb.firebasestorage.app',
          databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://sonara-e38cb-default-rtdb.firebaseio.com',
        });
      } else {
        // Fallback without auth (won't work for writes, but won't crash build)
        admin.initializeApp({
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'sonara-e38cb.firebasestorage.app',
          databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://sonara-e38cb-default-rtdb.firebaseio.com',
        });
      }
    } catch (e) {
      console.warn('Firebase Admin init skipped:', e);
    }
    initialized = true;
  }
  return admin;
};

export const adminApp = getAdminApp();
export const adminDb = adminApp.database();
export const adminStorage = adminApp.storage();
export const adminBucket = adminStorage.bucket();
