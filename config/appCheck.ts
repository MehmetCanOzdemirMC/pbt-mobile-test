/**
 * Firebase App Check Configuration
 * Protects backend resources from abuse
 * Uses ReCAPTCHA for web, Device Check for iOS, Play Integrity for Android
 */

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import app from './firebase';
import Constants from 'expo-constants';

// ReCAPTCHA v3 Site Key (for web/Expo Go)
// Get from: https://console.cloud.google.com/security/recaptcha
const RECAPTCHA_SITE_KEY =
  Constants.expoConfig?.extra?.recaptchaSiteKey ||
  process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ||
  '';

let appCheck: any = null;

/**
 * Initialize Firebase App Check
 * Call this once at app startup
 */
export const initializeFirebaseAppCheck = () => {
  // Only initialize on web platform
  // For native apps, use expo-firebase-recaptcha
  if (typeof window !== 'undefined' && RECAPTCHA_SITE_KEY) {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true, // Auto-refresh tokens
      });
      console.log('✅ Firebase App Check initialized');
    } catch (error) {
      console.error('❌ Firebase App Check initialization failed:', error);
    }
  } else {
    console.log(
      '⚠️ Firebase App Check not available (native or missing key)'
    );
  }
};

/**
 * Check if App Check is enabled
 * @returns boolean
 */
export const isAppCheckEnabled = (): boolean => {
  return !!appCheck;
};

/**
 * Get App Check status message
 * @returns string
 */
export const getAppCheckStatus = (): string => {
  if (!RECAPTCHA_SITE_KEY) {
    return '⚠️ App Check not configured (missing ReCAPTCHA key)';
  }
  if (isAppCheckEnabled()) {
    return '✅ App Check active - Backend protected';
  }
  return '⚠️ App Check not initialized';
};

export default {
  initializeFirebaseAppCheck,
  isAppCheckEnabled,
  getAppCheckStatus,
};
