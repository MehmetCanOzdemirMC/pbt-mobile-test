/**
 * Sentry Error Monitoring Configuration for React Native
 * Tracks errors, performance, and user sessions
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Sentry DSN from environment
const SENTRY_DSN =
  Constants.expoConfig?.extra?.sentryDsn ||
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  '';

// App version
const APP_VERSION =
  Constants.expoConfig?.extra?.appVersion ||
  process.env.EXPO_PUBLIC_APP_VERSION ||
  '1.0.0';

/**
 * Initialize Sentry
 * Call this once at app startup
 */
export const initializeSentry = () => {
  if (!SENTRY_DSN) {
    console.log('⚠️ Sentry not configured (missing DSN)');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: __DEV__ ? 'development' : 'production',
      release: APP_VERSION,

      // Performance Monitoring
      enableAutoPerformanceTracing: true,
      tracesSampleRate: 1.0, // 100% of transactions for performance monitoring

      // Session Tracking
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000, // 30 seconds

      // Native Crash Handling
      enableNative: true,
      enableNativeCrashHandling: true,

      // Breadcrumbs
      maxBreadcrumbs: 50,

      // Before send hook - filter sensitive data
      beforeSend(event, hint) {
        // Filter out sensitive information
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['Cookie'];
          }
        }

        // Don't send errors in development
        if (__DEV__) {
          console.log('🚨 Sentry Event (dev mode - not sent):', event);
          return null;
        }

        return event;
      },
    });

    console.log('✅ Sentry initialized');
  } catch (error) {
    console.error('❌ Sentry initialization failed:', error);
  }
};

/**
 * Set user context
 * @param user - User information
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
} | null) => {
  if (!SENTRY_DSN) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
    console.log('🚨 Sentry user set:', user.id);
  } else {
    Sentry.setUser(null);
    console.log('🚨 Sentry user cleared');
  }
};

/**
 * Capture exception manually
 * @param error - Error object
 * @param context - Additional context
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (!SENTRY_DSN) {
    console.error('Error (Sentry disabled):', error, context);
    return;
  }

  if (context) {
    Sentry.setContext('additional', context);
  }

  Sentry.captureException(error);
  console.log('🚨 Exception captured by Sentry:', error.message);
};

/**
 * Capture message manually
 * @param message - Message to log
 * @param level - Severity level
 */
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info'
) => {
  if (!SENTRY_DSN) {
    console.log(`Message (Sentry disabled) [${level}]:`, message);
    return;
  }

  Sentry.captureMessage(message, level);
  console.log(`🚨 Message captured by Sentry [${level}]:`, message);
};

/**
 * Add breadcrumb
 * @param breadcrumb - Breadcrumb data
 */
export const addBreadcrumb = (breadcrumb: {
  message: string;
  category?: string;
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  data?: Record<string, any>;
}) => {
  if (!SENTRY_DSN) return;

  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Check if Sentry is configured
 * @returns boolean
 */
export const isSentryConfigured = (): boolean => {
  return !!SENTRY_DSN && SENTRY_DSN.length > 0;
};

/**
 * Get Sentry status message
 * @returns string
 */
export const getSentryStatus = (): string => {
  if (!isSentryConfigured()) {
    return '⚠️ Sentry not configured (missing DSN)';
  }
  return '✅ Sentry error monitoring active';
};

export default {
  initializeSentry,
  setSentryUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  isSentryConfigured,
  getSentryStatus,
};
