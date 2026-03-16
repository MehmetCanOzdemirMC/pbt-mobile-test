/**
 * Google Analytics 4 for React Native (MOCK VERSION)
 *
 * Port from: web/src/utils/ga4.js
 * Note: @react-native-firebase/analytics not installed
 * Functions are mocked to prevent errors
 */

// Mock analytics functions (no-op)
const mockAnalytics = () => ({
  logScreenView: async () => console.log('[GA4 Mock] Screen view tracked'),
  logEvent: async () => console.log('[GA4 Mock] Event tracked'),
  setUserId: async () => console.log('[GA4 Mock] User ID set'),
  setUserProperties: async () => console.log('[GA4 Mock] User properties set'),
});

/**
 * Track screen view
 * @param {string} screenName - Screen name
 * @param {string} screenClass - Screen class (optional)
 */
export const trackScreenView = async (screenName, screenClass = null) => {
  console.log(`[GA4 Mock] Screen: ${screenName}`);
};

/**
 * Track search
 */
export const trackSearch = async (searchTerm, filters = {}) => {
  console.log(`[GA4 Mock] Search: ${searchTerm}`);
};

/**
 * Track view item (diamond detail)
 */
export const trackViewItem = async (item) => {
  console.log(`[GA4 Mock] View item: ${item.id}`);
};

/**
 * Track add to cart
 */
export const trackAddToCart = async (item) => {
  console.log(`[GA4 Mock] Add to cart: ${item.id}`);
};

/**
 * Track remove from cart
 */
export const trackRemoveFromCart = async (item) => {
  console.log(`[GA4 Mock] Remove from cart: ${item.id}`);
};

/**
 * Track begin checkout
 */
export const trackBeginCheckout = async (items) => {
  console.log(`[GA4 Mock] Begin checkout: ${items.length} items`);
};

/**
 * Track purchase
 */
export const trackPurchase = async (transactionId, items, total) => {
  console.log(`[GA4 Mock] Purchase: ${transactionId}, ${total}`);
};

/**
 * Track custom event
 */
export const trackCustomEvent = async (eventName, params = {}) => {
  console.log(`[GA4 Mock] Custom event: ${eventName}`, params);
};

/**
 * Set user ID
 */
export const setUserId = async (userId) => {
  console.log(`[GA4 Mock] User ID: ${userId}`);
};

/**
 * Set user properties
 */
export const setUserProperties = async (properties) => {
  console.log(`[GA4 Mock] User properties:`, properties);
};

export default mockAnalytics;
