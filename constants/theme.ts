/**
 * PBT Design System - Theme Colors
 * Synchronized with web app (PBTv1)
 */

export const DARK_THEME = {
  // Primary Colors
  primary: '#3c83f6',        // Blue - Buttons, Actions (web: --color-primary)
  primaryLight: '#5b9af9',
  primaryDark: '#2563eb',
  accent: '#06a9ea',         // Cyan - Chat, Highlights (web: --color-accent)
  accentHover: '#0ea5e9',

  // Background Colors
  backgroundDeepest: '#0a0f1a',  // Deepest dark (web: --bg-deepest)
  background: '#0f172a',         // Main background (web: --bg-dark)
  backgroundCard: '#1e293b',     // Cards, Panels (web: --bg-card)
  backgroundHeader: '#1e293b',   // Header (web: --bg-header)
  backgroundSurface: '#1e293b',  // Alternative surface

  // Text Colors
  textPrimary: '#f8fafc',    // White - Main text (web: --text-primary)
  textSecondary: '#94a3b8',  // Gray - Secondary text (web: --text-secondary)
  textDim: '#64748b',        // Gray dark - Placeholder (web: --text-dim)
  textDisabled: '#475569',   // Disabled text

  // Status Colors
  success: '#10b981',        // Green (web: --color-success)
  successLight: '#34d399',
  warning: '#f59e0b',        // Amber (web: --color-warning)
  warningLight: '#fbbf24',
  error: '#ef4444',          // Red (web: --color-error)
  errorLight: '#f87171',
  info: '#3b82f6',           // Blue (web: --color-info)
  infoLight: '#60a5fa',

  // Additional Status
  online: '#22c55e',         // Green - Online status
  unread: '#3b82f6',         // Blue - Unread badge

  // Border & Divider
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  divider: 'rgba(255, 255, 255, 0.1)',

  // Glass & Overlay
  glass: 'rgba(30, 41, 59, 0.8)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.25)',

  // Specific Features
  messagingCyan: '#06a9ea',  // Chat interface
  purple: '#8b5cf6',         // Purple accent
};

export const LIGHT_THEME = {
  // Primary Colors
  primary: '#3c83f6',        // Same blue as dark mode
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  accent: '#06a9ea',
  accentHover: '#0ea5e9',

  // Background Colors
  backgroundDeepest: '#ffffff',
  background: '#f8fafc',     // Light gray background
  backgroundCard: '#ffffff',  // White cards
  backgroundHeader: '#ffffff',
  backgroundSurface: '#f1f5f9',

  // Text Colors
  textPrimary: '#0f172a',    // Dark text
  textSecondary: '#475569',  // Gray text
  textDim: '#64748b',
  textDisabled: '#94a3b8',

  // Status Colors (same as dark)
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',
  info: '#3b82f6',
  infoLight: '#60a5fa',

  // Additional Status
  online: '#22c55e',
  unread: '#3b82f6',

  // Border & Divider
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.05)',
  divider: 'rgba(0, 0, 0, 0.1)',

  // Glass & Overlay
  glass: 'rgba(255, 255, 255, 0.8)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.25)',

  // Specific Features
  messagingCyan: '#06a9ea',
  purple: '#8b5cf6',
};

// Typography (will be used with Plus Jakarta Sans)
export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    semiBold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing (same as web)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

// Border Radius (same as web)
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Shadows (React Native compatible)
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Theme type
export type Theme = typeof DARK_THEME;
export type ThemeMode = 'light' | 'dark';
