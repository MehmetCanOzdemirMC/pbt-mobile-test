/**
 * Shared Constants for React Native App
 *
 * Ported from web project with mobile-specific adaptations
 */

/**
 * Diamond Shapes
 */
export const DIAMOND_SHAPES = [
  'Round',
  'Princess',
  'Cushion',
  'Oval',
  'Emerald',
  'Radiant',
  'Pear',
  'Marquise',
  'Heart',
  'Asscher'
];

/**
 * Color Grades
 */
export const COLOR_GRADES = [
  'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

/**
 * Clarity Grades
 */
export const CLARITY_GRADES = [
  'FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2',
  'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'
];

/**
 * Cut Grades
 */
export const CUT_GRADES = [
  'Excellent',
  'Very Good',
  'Good',
  'Fair',
  'Poor'
];

/**
 * Fluorescence Levels
 */
export const FLUORESCENCE_LEVELS = [
  'None',
  'Faint',
  'Medium',
  'Strong',
  'Very Strong'
];

/**
 * Certification Labs
 */
export const CERTIFICATION_LABS = [
  'GIA',
  'IGI',
  'HRD',
  'AGS',
  'EGL',
  'GCAL',
  'GSI',
  'OTHER'
];

/**
 * User Roles
 */
export const USER_ROLES = {
  RETAILER: 'retailer',
  SUPPLIER: 'supplier',
  INTERNATIONAL_SUPPLIER: 'international',
  DROPSHIPPER: 'dropshipper',
  ADMIN: 'admin'
};

/**
 * Stone Status
 */
export const STONE_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
  PENDING: 'pending'
};

/**
 * Order Status
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

/**
 * File Upload Limits (Mobile)
 */
export const UPLOAD_LIMITS = {
  MAX_EXCEL_ROWS: 5000,       // Mobile performance limit
  WARNING_THRESHOLD: 3000,     // Show warning above this
  MAX_FILE_SIZE_MB: 10,        // 10MB for Excel
  MAX_IMAGE_SIZE_MB: 5,        // 5MB for images
  MAX_3D_MODEL_SIZE_MB: 50,    // 50MB for 3D models
  BATCH_SIZE: 500              // Firestore batch size
};

/**
 * Firestore Collection Names
 */
export const COLLECTIONS = {
  USERS: 'users',
  STONES: 'stones',
  ORDERS: 'orders',
  CONVERSATIONS: 'conversations',
  CUSTOM_DESIGNS: 'custom_designs',
  CUSTOM_ORDERS: 'custom_orders',
  MOUNTINGS: 'mountings',
  CUSTOM_STONES: 'custom_stones',
  CERTIFICATES: 'certificates',
  SEARCH_LOGS: 'search_logs',
  CART_LOGS: 'cart_logs',
  EMAIL_LOGS: 'email_logs'
};

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  RAPAPORT: 'https://rapaport-api.example.com',
  JTR_MEDIA: 'https://jtr-cdn.example.com',
  IJEWEL: 'https://drive.ijewel.com'
};

/**
 * Regular Expressions
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  CERTIFICATE_NUMBER: /^[A-Z0-9-]+$/i,
  MEASUREMENTS: /^\d+(\.\d+)?\s*[xX]\s*\d+(\.\d+)?\s*[xX]\s*\d+(\.\d+)?$/,
  URL: /^https?:\/\/.+/
};

/**
 * Date Formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  FULL: 'dd MMM yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
};

/**
 * Currency
 */
export const CURRENCY = {
  USD: {
    symbol: '$',
    code: 'USD',
    decimals: 2
  },
  TRY: {
    symbol: '₺',
    code: 'TRY',
    decimals: 2
  }
};

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  LOAD_MORE_THRESHOLD: 0.8 // Load more when 80% scrolled
};

/**
 * Cache TTL (Time To Live) in milliseconds
 */
export const CACHE_TTL = {
  RAPAPORT: 24 * 60 * 60 * 1000,    // 24 hours
  USER_PROFILE: 30 * 60 * 1000,      // 30 minutes
  SEARCH_RESULTS: 5 * 60 * 1000,     // 5 minutes
  CART: 60 * 60 * 1000               // 1 hour
};

/**
 * Analytics Events
 */
export const ANALYTICS_EVENTS = {
  // User events
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',

  // Product events
  VIEW_ITEM: 'view_item',
  VIEW_ITEM_LIST: 'view_item_list',
  SEARCH: 'search',
  FILTER_USAGE: 'filter_usage',

  // Cart events
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  BEGIN_CHECKOUT: 'begin_checkout',
  PURCHASE: 'purchase',

  // Supplier events
  BULK_IMPORT: 'bulk_import_completed',
  UPLOAD_STONE: 'upload_stone',

  // Custom design events
  START_DESIGN: 'start_custom_design',
  SELECT_MOUNTING: 'select_mounting',
  SELECT_STONE: 'select_stone',
  SHARE_DESIGN: 'share_design'
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTH_ERROR: 'Authentication failed. Please login again.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed.',
  INVALID_FILE_TYPE: 'Invalid file type selected.',
  PARSE_ERROR: 'Failed to parse file. Please check the format.',
  UPLOAD_ERROR: 'Upload failed. Please try again.',
  VALIDATION_ERROR: 'Validation failed. Please check your data.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'File uploaded successfully',
  IMPORT_SUCCESS: 'Data imported successfully',
  SAVE_SUCCESS: 'Saved successfully',
  DELETE_SUCCESS: 'Deleted successfully',
  UPDATE_SUCCESS: 'Updated successfully',
  SENT_SUCCESS: 'Sent successfully'
};
