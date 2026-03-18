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
// For React Native (iOS/Android): use @react-native-firebase/analytics
// For Web: use firebase/analytics
let analytics: any = null;

try {
  if (Platform.OS === 'web') {
    const { getAnalytics } = require('firebase/analytics');
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized (Web)');
  } else {
    // For React Native, use @react-native-firebase/analytics
    const rnAnalytics = require('@react-native-firebase/analytics').default;
    analytics = rnAnalytics();
    console.log('✅ Firebase Analytics initialized (React Native)');
  }
} catch (error) {
  console.error('⚠️ Firebase Analytics initialization error:', error);
}

export { analytics };
export default app;
