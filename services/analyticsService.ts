/**
 * Firebase Analytics Service for React Native
 * Equivalent to GA4 tracking in web app
 * Tracks user behavior, e-commerce events, and custom events
 */

import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analytics } from '../config/firebase';

/**
 * Track a screen view
 * @param screenName - Name of the screen
 * @param screenClass - Class of the screen (optional)
 */
export const trackScreenView = (screenName: string, screenClass?: string) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenClass || screenName,
    });
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
    logEvent(analytics, 'sign_up', {
      method,
    });
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
    logEvent(analytics, 'login', {
      method,
    });
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
    logEvent(analytics, 'search', {
      search_term: searchTerm,
    });
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
    logEvent(analytics, 'view_item', {
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
    });
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
    logEvent(analytics, 'add_to_cart', {
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
    });
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
    logEvent(analytics, 'remove_from_cart', {
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
    });
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
    logEvent(analytics, 'begin_checkout', {
      currency: 'USD',
      value,
      items,
    });
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
    logEvent(analytics, 'purchase', {
      transaction_id: transactionId,
      currency: 'USD',
      value,
      items,
    });
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
    logEvent(analytics, eventName as any, params);
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
      setUserId(analytics, userId);
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
    setUserProperties(analytics, properties);
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
