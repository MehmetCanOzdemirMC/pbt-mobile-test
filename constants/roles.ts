/**
 * Role-Based Access Control (RBAC) System
 * Ported from Web version for consistent permissions
 */

// ============================================
// ROLE DEFINITIONS
// ============================================
export const ROLES = {
  UNVERIFIED: 'unverified',
  VERIFIED_RETAILER: 'verifiedRetailer',
  SUPPLIER_LOCAL: 'supplierLocal',
  SUPPLIER_DROPSHIP: 'supplierDropship',
  SUPPLIER_INTERNATIONAL: 'supplierInternational',
  ADMIN: 'admin',
  SUPER_ADMIN: 'superAdmin',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

// ============================================
// ROLE LABELS (Turkish)
// ============================================
export const ROLE_LABELS: Record<RoleType, string> = {
  [ROLES.UNVERIFIED]: 'Doğrulanmamış',
  [ROLES.VERIFIED_RETAILER]: 'Perakendeci',
  [ROLES.SUPPLIER_LOCAL]: 'Yerel Tedarikçi',
  [ROLES.SUPPLIER_DROPSHIP]: 'Dropship Tedarikçi',
  [ROLES.SUPPLIER_INTERNATIONAL]: 'Uluslararası Tedarikçi',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPER_ADMIN]: 'Süper Admin',
};

// ============================================
// ROLE DETECTION HELPERS
// ============================================

/**
 * Check if role is Supplier (any type)
 */
export const isSupplierRole = (role: string | undefined | null): boolean => {
  if (!role) return false;
  return (
    role === ROLES.SUPPLIER_LOCAL ||
    role === ROLES.SUPPLIER_DROPSHIP ||
    role === ROLES.SUPPLIER_INTERNATIONAL
  );
};

/**
 * Check if role is Admin (any type)
 */
export const isAdminRole = (role: string | undefined | null): boolean => {
  if (!role) return false;
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
};

/**
 * Check if role is Retailer
 */
export const isRetailerRole = (role: string | undefined | null): boolean => {
  return role === ROLES.VERIFIED_RETAILER;
};

/**
 * Get user-friendly role label
 */
export const getRoleLabel = (role: string | undefined | null): string => {
  if (!role) return ROLE_LABELS[ROLES.UNVERIFIED];
  return ROLE_LABELS[role as RoleType] || role;
};

/**
 * Map Firestore role to ROLES constant
 * Handles legacy role names like 'supplier' or 'retailer'
 */
export const normalizeRole = (firestoreRole: string | undefined | null): RoleType => {
  if (!firestoreRole) return ROLES.UNVERIFIED;

  // Direct matches
  if (firestoreRole === ROLES.SUPER_ADMIN) return ROLES.SUPER_ADMIN;
  if (firestoreRole === ROLES.ADMIN) return ROLES.ADMIN;
  if (firestoreRole === ROLES.SUPPLIER_INTERNATIONAL) return ROLES.SUPPLIER_INTERNATIONAL;
  if (firestoreRole === ROLES.SUPPLIER_DROPSHIP) return ROLES.SUPPLIER_DROPSHIP;
  if (firestoreRole === ROLES.SUPPLIER_LOCAL) return ROLES.SUPPLIER_LOCAL;
  if (firestoreRole === ROLES.VERIFIED_RETAILER) return ROLES.VERIFIED_RETAILER;

  // Legacy mappings
  if (firestoreRole === 'supplier') return ROLES.SUPPLIER_LOCAL;
  if (firestoreRole === 'retailer') return ROLES.VERIFIED_RETAILER;

  return ROLES.UNVERIFIED;
};

// ============================================
// PERMISSION DEFINITIONS (Simplified for Mobile)
// ============================================

/**
 * Check if role can access Admin Dashboard
 */
export const canAccessAdminDashboard = (role: string | undefined | null): boolean => {
  return isAdminRole(role);
};

/**
 * Check if role can access Supplier Dashboard
 */
export const canAccessSupplierDashboard = (role: string | undefined | null): boolean => {
  return isSupplierRole(role);
};

/**
 * Check if role can access Retailer Marketplace
 */
export const canAccessMarketplace = (role: string | undefined | null): boolean => {
  return isRetailerRole(role) || isAdminRole(role);
};

/**
 * Check if role can add/edit stones
 */
export const canManageInventory = (role: string | undefined | null): boolean => {
  return isSupplierRole(role) || isAdminRole(role);
};

/**
 * Check if role can view prices
 */
export const canViewPrices = (role: string | undefined | null): boolean => {
  if (!role || role === ROLES.UNVERIFIED) return false;
  return true; // All verified users can view prices
};

/**
 * Check if role can purchase (add to cart)
 */
export const canPurchase = (role: string | undefined | null): boolean => {
  return isRetailerRole(role) || isAdminRole(role);
};

/**
 * Check if role can view sales orders
 */
export const canViewSalesOrders = (role: string | undefined | null): boolean => {
  return isSupplierRole(role) || isAdminRole(role);
};

/**
 * Check if role can view purchase orders
 */
export const canViewPurchaseOrders = (role: string | undefined | null): boolean => {
  return isRetailerRole(role) || isAdminRole(role);
};
