/**
 * Language Context
 * Manages app language state with persistence
 * Supports: Turkish (tr), English (en), Chinese (zh)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../i18n'; // Initialize i18n

const LANGUAGE_STORAGE_KEY = '@pbt_language';

export type Language = 'tr' | 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState<Language>('tr');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language on mount
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && ['tr', 'en', 'zh'].includes(savedLanguage)) {
        const lang = savedLanguage as Language;
        setLanguage(lang);
        await i18n.changeLanguage(lang);
        console.log(`✅ Loaded saved language: ${lang}`);
      } else {
        // Default to Turkish
        setLanguage('tr');
        await i18n.changeLanguage('tr');
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
      setLanguage('tr');
      await i18n.changeLanguage('tr');
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (lang: Language) => {
    try {
      setLanguage(lang);
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      console.log(`✅ Language changed to: ${lang}`);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
