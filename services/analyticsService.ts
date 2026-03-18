/**
 * Firebase Analytics Service for React Native & Web
 * Equivalent to GA4 tracking in web app
 * Tracks user behavior, e-commerce events, and custom events
 *
 * Supports both:
 * - Web: firebase/analytics
 * - React Native: @react-native-firebase/analytics
 */

import { Platform } from 'react-native';
import { analytics } from '../config/firebase';

// Web Firebase Analytics imports (conditional)
let webLogEvent: any;
let webSetUserId: any;
let webSetUserProperties: any;

if (Platform.OS === 'web' && analytics) {
  const webAnalytics = require('firebase/analytics');
  webLogEvent = webAnalytics.logEvent;
  webSetUserId = webAnalytics.setUserId;
  webSetUserProperties = webAnalytics.setUserProperties;
}

/**
 * Track a screen view
 * @param screenName - Name of the screen
 * @param screenClass - Class of the screen (optional)
 */
export const trackScreenView = (screenName: string, screenClass?: string) => {
  if (!analytics) return;

  try {
    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'screen_view', {
        firebase_screen: screenName,
        firebase_screen_class: screenClass || screenName,
      });
    } else {
      // React Native Firebase Analytics
      analytics.logEvent('screen_view', {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    }
    console.log(`📊 Analytics: screen_view - ${screenName}`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track user sign up
 * @param method - Sign up method (email, google, etc.)
 */
export const trackSignUp = (method: string) => {
  if (!analytics) return;

  try {
    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'sign_up', { method });
    } else {
      analytics.logEvent('sign_up', { method });
    }
    console.log(`📊 Analytics: sign_up - ${method}`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track user login
 * @param method - Login method (email, google, etc.)
 */
export const trackLogin = (method: string) => {
  if (!analytics) return;

  try {
    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'login', { method });
    } else {
      analytics.logEvent('login', { method });
    }
    console.log(`📊 Analytics: login - ${method}`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track search
 * @param searchTerm - Search query
 */
export const trackSearch = (searchTerm: string) => {
  if (!analytics) return;

  try {
    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'search', { search_term: searchTerm });
    } else {
      analytics.logEvent('search', { search_term: searchTerm });
    }
    console.log(`📊 Analytics: search - ${searchTerm}`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track product view
 * @param item - Product item details
 */
export const trackViewItem = (item: {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  currency?: string;
}) => {
  if (!analytics) return;

  try {
    const eventParams = {
      currency: item.currency || 'USD',
      value: item.price || 0,
      items: [
        {
          item_id: item.item_id,
          item_name: item.item_name,
          item_category: item.item_category || 'Diamond',
          price: item.price || 0,
        },
      ],
    };

    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'view_item', eventParams);
    } else {
      analytics.logEvent('view_item', eventParams);
    }
    console.log(`📊 Analytics: view_item - ${item.item_name}`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track add to cart
 * @param item - Product item details
 */
export const trackAddToCart = (item: {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}) => {
  if (!analytics) return;

  try {
    const eventParams = {
      currency: item.currency || 'USD',
      value: (item.price || 0) * (item.quantity || 1),
      items: [
        {
          item_id: item.item_id,
          item_name: item.item_name,
          item_category: item.item_category || 'Diamond',
          price: item.price || 0,
          quantity: item.quantity || 1,
        },
      ],
    };

    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'add_to_cart', eventParams);
    } else {
      analytics.logEvent('add_to_cart', eventParams);
    }
    console.log(`📊 Analytics: add_to_cart - ${item.item_name}`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track remove from cart
 * @param item - Product item details
 */
export const trackRemoveFromCart = (item: {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}) => {
  if (!analytics) return;

  try {
    const eventParams = {
      currency: item.currency || 'USD',
      value: (item.price || 0) * (item.quantity || 1),
      items: [
        {
          item_id: item.item_id,
          item_name: item.item_name,
          item_category: item.item_category || 'Diamond',
          price: item.price || 0,
          quantity: item.quantity || 1,
        },
      ],
    };

    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'remove_from_cart', eventParams);
    } else {
      analytics.logEvent('remove_from_cart', eventParams);
    }
    console.log(`📊 Analytics: remove_from_cart - ${item.item_name}`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track begin checkout
 * @param value - Total cart value
 * @param items - Cart items
 */
export const trackBeginCheckout = (
  value: number,
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>
) => {
  if (!analytics) return;

  try {
    const eventParams = {
      currency: 'USD',
      value,
      items,
    };

    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'begin_checkout', eventParams);
    } else {
      analytics.logEvent('begin_checkout', eventParams);
    }
    console.log(`📊 Analytics: begin_checkout - $${value}`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track purchase
 * @param transactionId - Transaction ID
 * @param value - Total purchase value
 * @param items - Purchased items
 */
export const trackPurchase = (
  transactionId: string,
  value: number,
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>
) => {
  if (!analytics) return;

  try {
    const eventParams = {
      transaction_id: transactionId,
      currency: 'USD',
      value,
      items,
    };

    if (Platform.OS === 'web') {
      webLogEvent(analytics, 'purchase', eventParams);
    } else {
      analytics.logEvent('purchase', eventParams);
    }
    console.log(`📊 Analytics: purchase - ${transactionId} ($${value})`);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Track custom event
 * @param eventName - Event name
 * @param params - Event parameters
 */
export const trackCustomEvent = (
  eventName: string,
  params?: Record<string, any>
) => {
  if (!analytics) return;

  try {
    if (Platform.OS === 'web') {
      webLogEvent(analytics, eventName as any, params);
    } else {
      analytics.logEvent(eventName, params || {});
    }
    console.log(`📊 Analytics: ${eventName}`, params);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Set user ID
 * @param userId - User ID
 */
export const setAnalyticsUserId = (userId: string | null) => {
  if (!analytics) return;

  try {
    if (userId) {
      if (Platform.OS === 'web') {
        webSetUserId(analytics, userId);
      } else {
        analytics.setUserId(userId);
      }
      console.log(`📊 Analytics: User ID set - ${userId}`);
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Set user properties
 * @param properties - User properties
 */
export const setAnalyticsUserProperties = (properties: Record<string, any>) => {
  if (!analytics) return;

  try {
    if (Platform.OS === 'web') {
      webSetUserProperties(analytics, properties);
    } else {
      analytics.setUserProperties(properties);
    }
    console.log('📊 Analytics: User properties set', properties);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Check if analytics is enabled
 * @returns boolean
 */
export const isAnalyticsEnabled = (): boolean => {
  return !!analytics;
};

export default {
  trackScreenView,
  trackSignUp,
  trackLogin,
  trackSearch,
  trackViewItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackPurchase,
  trackCustomEvent,
  setAnalyticsUserId,
  setAnalyticsUserProperties,
  isAnalyticsEnabled,
};
