/**
 * Language Switcher Component
 * Allows users to switch between Turkish, English, and Chinese
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage, Language } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Check, Globe } from 'lucide-react-native';

interface LanguageSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'tr' as Language, name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'zh' as Language, name: '中文', flag: '🇨🇳' },
];

export default function LanguageSwitcher({ visible, onClose }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const { theme } = useTheme();

  const handleLanguageSelect = async (lang: Language) => {
    await changeLanguage(lang);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: theme.backgroundCard }]}>
          <View style={styles.header}>
            <Globe size={24} color={theme.primary} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {t('settings.selectLanguage')}
            </Text>
          </View>

          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                {
                  backgroundColor:
                    language === lang.code
                      ? `${theme.primary}15`
                      : theme.background,
                  borderColor:
                    language === lang.code ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.languageName,
                    {
                      color: theme.textPrimary,
                      fontWeight: language === lang.code ? '600' : '400',
                    },
                  ]}
                >
                  {lang.name}
                </Text>
              </View>
              {language === lang.code && (
                <Check size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: theme.textPrimary }]}>
              {t('common.close')}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 28,
  },
  languageName: {
    fontSize: 16,
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
