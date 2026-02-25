import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'tr' | 'en';
export type Currency = 'USD' | 'TRY' | 'EUR';

interface SettingsState {
  language: Language;
  currency: Currency;
  exchangeRates: {
    TRY: number;
    EUR: number;
  };

  // Actions
  setLanguage: (language: Language) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  loadSettings: () => Promise<void>;
  convertPrice: (usdPrice: number) => number;
  getCurrencySymbol: () => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'tr',
  currency: 'USD',
  exchangeRates: {
    TRY: 35.5, // 1 USD = 35.5 TRY (approximate)
    EUR: 0.92, // 1 USD = 0.92 EUR (approximate)
  },

  setLanguage: async (language: Language) => {
    try {
      await AsyncStorage.setItem('language', language);
      set({ language });
    } catch (error) {
      console.error('Error saving language:', error);
    }
  },

  setCurrency: async (currency: Currency) => {
    try {
      await AsyncStorage.setItem('currency', currency);
      set({ currency });
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  },

  loadSettings: async () => {
    try {
      const [language, currency] = await Promise.all([
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('currency'),
      ]);

      if (language) set({ language: language as Language });
      if (currency) set({ currency: currency as Currency });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },

  convertPrice: (usdPrice: number) => {
    const { currency, exchangeRates } = get();

    if (currency === 'USD') {
      return usdPrice;
    } else if (currency === 'TRY') {
      return usdPrice * exchangeRates.TRY;
    } else if (currency === 'EUR') {
      return usdPrice * exchangeRates.EUR;
    }

    return usdPrice;
  },

  getCurrencySymbol: () => {
    const { currency } = get();

    switch (currency) {
      case 'USD':
        return '$';
      case 'TRY':
        return '₺';
      case 'EUR':
        return '€';
      default:
        return '$';
    }
  },
}));
