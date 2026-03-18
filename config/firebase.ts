import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firebase Analytics
// NOTE: Analytics only works on Web in Expo Go (managed workflow)
// For production React Native (iOS/Android), you need a development build with @react-native-firebase/analytics
let analytics: any = null;

try {
  if (Platform.OS === 'web') {
    const { getAnalytics } = require('firebase/analytics');
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized (Web)');
  } else {
    // EXPO GO: Analytics not available on React Native (requires development build)
    // For now, analytics will be null on mobile (events won't be tracked)
    console.log('ℹ️ Firebase Analytics skipped (Expo Go - managed workflow)');
    console.log('ℹ️ To enable analytics on mobile, create a development build');
  }
} catch (error: any) {
  console.warn('⚠️ Firebase Analytics initialization skipped:', error?.message || error);
}

export { analytics };
export default app;
