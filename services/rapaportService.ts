/**
 * Rapaport Price Service
 *
 * Manages Rapaport diamond price cache for React Native
 * Port from: web/src/services/rapaportService.js
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'rapaport_cache';
const CACHE_EXPIRY_KEY = 'rapaport_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface RapaportCache {
  [key: string]: number; // Format: "Round-1.5-D-VVS1" => 15000
}

let cachedData: RapaportCache | null = null;
let cacheReady = false;

/**
 * Load Rapaport cache from AsyncStorage
 */
export const loadRapaportCache = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const cacheExpiry = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);
    const now = Date.now();

    // Check if cache expired
    if (cacheExpiry && now > parseInt(cacheExpiry)) {
      console.log('⚠️ Rapaport cache expired');
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
      return { success: false, message: 'Cache expired' };
    }

    const cacheString = await AsyncStorage.getItem(CACHE_KEY);
    if (cacheString) {
      cachedData = JSON.parse(cacheString);
      cacheReady = true;
      console.log('✅ Rapaport cache loaded from storage');
      return { success: true };
    }

    console.log('⚠️ No Rapaport cache found');
    return { success: false, message: 'No cache found' };
  } catch (error) {
    console.error('❌ Error loading Rapaport cache:', error);
    return { success: false, message: 'Load error' };
  }
};

/**
 * Save Rapaport cache to AsyncStorage
 */
export const saveRapaportCache = async (data: RapaportCache): Promise<void> => {
  try {
    const expiry = Date.now() + CACHE_DURATION;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_EXPIRY_KEY, String(expiry));
    cachedData = data;
    cacheReady = true;
    console.log('✅ Rapaport cache saved');
  } catch (error) {
    console.error('❌ Error saving Rapaport cache:', error);
  }
};

/**
 * Get Rapaport price from cache
 */
export const getRapaportFromCache = (
  shape: string,
  carat: number,
  color: string,
  clarity: string
): number | null => {
  if (!cacheReady || !cachedData) {
    console.warn('⚠️ Rapaport cache not ready');
    return null;
  }

  // Round carat to nearest 0.01
  const roundedCarat = Math.round(carat * 100) / 100;

  // Build cache key
  const cacheKey = `${shape}-${roundedCarat}-${color}-${clarity}`;

  const price = cachedData[cacheKey];

  if (price !== undefined) {
    return price;
  }

  console.warn(`⚠️ No Rapaport price found for: ${cacheKey}`);
  return null;
};

/**
 * Check if cache is ready
 */
export const isCacheReady = (): boolean => {
  return cacheReady;
};

/**
 * Clear Rapaport cache
 */
export const clearRapaportCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
    cachedData = null;
    cacheReady = false;
    console.log('✅ Rapaport cache cleared');
  } catch (error) {
    console.error('❌ Error clearing Rapaport cache:', error);
  }
};

/**
 * Mock data for development (optional)
 * In production, this should be fetched from Rapaport API
 */
export const loadMockRapaportData = async (): Promise<void> => {
  const mockData: RapaportCache = {
    // Round
    'Round-1.0-D-VVS1': 10000,
    'Round-1.0-D-VVS2': 9500,
    'Round-1.0-E-VVS1': 9800,
    'Round-1.5-D-VVS1': 15000,
    'Round-1.5-D-VVS2': 14500,
    'Round-2.0-D-VVS1': 20000,
    // Princess
    'Princess-1.0-D-VVS1': 8000,
    'Princess-1.5-D-VVS1': 12000,
    // Add more mock data as needed...
  };

  await saveRapaportCache(mockData);
  console.log('✅ Mock Rapaport data loaded');
};
