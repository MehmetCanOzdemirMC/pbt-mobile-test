/**
 * Facebook Pixel for React Native (MOCK VERSION)
 *
 * Port from: web/src/utils/fbPixel.js
 * Note: react-native-fbsdk-next not installed
 * Functions are mocked to prevent errors
 */

/**
 * Track page view
 */
export const trackPageView = () => {
  console.log('[FB Pixel Mock] Page view');
};

/**
 * Track user registration
 */
export const trackCompleteRegistration = (method = 'email') => {
  console.log(`[FB Pixel Mock] Registration: ${method}`);
};

/**
 * Track login
 */
export const trackLogin = (method = 'email') => {
  console.log(`[FB Pixel Mock] Login: ${method}`);
};

/**
 * Track search
 */
export const trackSearch = (searchTerm, filters = {}) => {
  console.log(`[FB Pixel Mock] Search: ${searchTerm}`);
};

/**
 * Track content view (diamond detail)
 */
export const trackViewContent = (item) => {
  console.log(`[FB Pixel Mock] View content: ${item.id}`);
};

/**
 * Track add to cart
 */
export const trackAddToCart = (item) => {
  console.log(`[FB Pixel Mock] Add to cart: ${item.id}`);
};

/**
 * Track initiate checkout
 */
export const trackInitiateCheckout = (items, totalValue) => {
  console.log(`[FB Pixel Mock] Checkout: ${items.length} items, $${totalValue}`);
};

/**
 * Track purchase
 */
export const trackPurchase = (transactionId, items, totalValue) => {
  console.log(`[FB Pixel Mock] Purchase: ${transactionId}, $${totalValue}`);
};

/**
 * Track bulk import
 */
export const trackBulkImport = (itemCount) => {
  console.log(`[FB Pixel Mock] Bulk import: ${itemCount} items`);
};

/**
 * Track custom design started
 */
export const trackCustomDesignStarted = () => {
  console.log('[FB Pixel Mock] Custom design started');
};

/**
 * Track design shared
 */
export const trackDesignShared = (platform) => {
  console.log(`[FB Pixel Mock] Design shared: ${platform}`);
};

// Mock initialization
export const initFacebookPixel = () => {
  console.log('[FB Pixel Mock] Initialized');
};
