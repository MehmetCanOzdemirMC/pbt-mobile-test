/**
 * Two-Factor Authentication Service for React Native
 * Implements TOTP (Time-based One-Time Password) 2FA
 * Compatible with Google Authenticator, Authy, etc.
 */

import * as Crypto from 'expo-crypto';
import QRCode from 'qrcode';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const APP_NAME = 'PBT Diamond Marketplace';

/**
 * Generate a secret key for 2FA
 * @returns Base32 encoded secret
 */
export const generateSecret = async (): Promise<string> => {
  // Generate 20 random bytes
  const randomBytes = await Crypto.getRandomBytesAsync(20);

  // Convert to base32 (RFC 4648)
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let secret = '';

  // Convert bytes to bits
  for (let i = 0; i < randomBytes.length; i++) {
    bits += randomBytes[i].toString(2).padStart(8, '0');
  }

  // Convert bits to base32
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substr(i, 5).padEnd(5, '0');
    secret += base32chars[parseInt(chunk, 2)];
  }

  return secret;
};

/**
 * Generate TOTP code from secret
 * @param secret - Base32 encoded secret
 * @param timeStep - Time step in seconds (default: 30)
 * @returns 6-digit TOTP code
 */
export const generateTOTP = (secret: string, timeStep: number = 30): string => {
  // Get current time counter
  const time = Math.floor(Date.now() / 1000 / timeStep);

  // Convert time to 8-byte buffer
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(time));

  // Decode base32 secret to bytes
  const secretBytes = base32Decode(secret);

  // HMAC-SHA1
  const hmac = require('crypto').createHmac('sha1', secretBytes);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Generate 6-digit code
  const code = (binary % 1000000).toString().padStart(6, '0');
  return code;
};

/**
 * Verify TOTP code
 * @param secret - Base32 encoded secret
 * @param code - 6-digit code to verify
 * @param window - Time window (number of steps to check before/after)
 * @returns boolean - true if valid
 */
export const verifyTOTP = (
  secret: string,
  code: string,
  window: number = 1
): boolean => {
  const timeStep = 30;

  // Check current time and window
  for (let i = -window; i <= window; i++) {
    const time = Math.floor(Date.now() / 1000 / timeStep) + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(time));

    const secretBytes = base32Decode(secret);
    const hmac = require('crypto').createHmac('sha1', secretBytes);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const expectedCode = (binary % 1000000).toString().padStart(6, '0');

    if (expectedCode === code) {
      return true;
    }
  }

  return false;
};

/**
 * Generate QR code for 2FA setup
 * @param email - User email
 * @param secret - Base32 secret
 * @returns QR code data URL
 */
export const generateQRCode = async (
  email: string,
  secret: string
): Promise<string> => {
  const otpauthUrl = `otpauth://totp/${APP_NAME}:${email}?secret=${secret}&issuer=${APP_NAME}&algorithm=SHA1&digits=6&period=30`;

  try {
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
};

/**
 * Enable 2FA for user
 * @param userId - User ID
 * @param secret - Base32 secret
 */
export const enable2FA = async (userId: string, secret: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorEnabledAt: new Date().toISOString(),
    });
    console.log('✅ 2FA enabled for user:', userId);
  } catch (error) {
    console.error('❌ Error enabling 2FA:', error);
    throw error;
  }
};

/**
 * Disable 2FA for user
 * @param userId - User ID
 */
export const disable2FA = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorDisabledAt: new Date().toISOString(),
    });
    console.log('✅ 2FA disabled for user:', userId);
  } catch (error) {
    console.error('❌ Error disabling 2FA:', error);
    throw error;
  }
};

/**
 * Check if user has 2FA enabled
 * @param userId - User ID
 * @returns Object with 2FA status and secret
 */
export const get2FAStatus = async (
  userId: string
): Promise<{ enabled: boolean; secret: string | null }> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        enabled: data.twoFactorEnabled || false,
        secret: data.twoFactorSecret || null,
      };
    }
    return { enabled: false, secret: null };
  } catch (error) {
    console.error('❌ Error getting 2FA status:', error);
    return { enabled: false, secret: null };
  }
};

/**
 * Helper: Decode base32 to bytes
 */
const base32Decode = (base32: string): Buffer => {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';

  // Convert base32 to bits
  for (let i = 0; i < base32.length; i++) {
    const char = base32[i].toUpperCase();
    const index = base32chars.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  // Convert bits to bytes
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.substr(i, 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }

  return Buffer.from(bytes);
};

export default {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateQRCode,
  enable2FA,
  disable2FA,
  get2FAStatus,
};
