/**
 * i18n Configuration for React Native
 * Supports: Turkish (tr), English (en), Chinese (zh)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import en from './locales/en';
import tr from './locales/tr';
import zh from './locales/zh';

const LANGUAGE_STORAGE_KEY = '@pbt_language';

// Get saved language from AsyncStorage
const getStoredLanguage = async (): Promise<string> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return language || 'tr'; // Default to Turkish
  } catch (error) {
    console.error('Error reading language from storage:', error);
    return 'tr';
  }
};

// Save language to AsyncStorage
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language to storage:', error);
  }
};

// Initialize i18n
const initI18n = async () => {
  const storedLanguage = await getStoredLanguage();

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3', // For React Native
      resources: {
        en: { translation: en },
        tr: { translation: tr },
        zh: { translation: zh },
      },
      lng: storedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already escapes
      },
      react: {
        useSuspense: false, // Important for React Native
      },
    });

  console.log(`✅ i18n initialized with language: ${storedLanguage}`);
};

initI18n();

export default i18n;
