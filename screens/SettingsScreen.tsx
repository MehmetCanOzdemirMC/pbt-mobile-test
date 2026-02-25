import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore, Language, Currency } from '../stores/settingsStore';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { language, currency, setLanguage, setCurrency, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const currencies: { value: Currency; label: string; symbol: string }[] = [
    { value: 'USD', label: 'US Dollar', symbol: '$' },
    { value: 'TRY', label: 'Turkish Lira', symbol: '₺' },
    { value: 'EUR', label: 'Euro', symbol: '€' },
  ];

  const handleLanguageChange = async (newLanguage: Language) => {
    await setLanguage(newLanguage);
    Alert.alert('Başarılı', 'Dil değiştirildi. Uygulamayı yeniden başlatmanız gerekebilir.');
  };

  const handleCurrencyChange = async (newCurrency: Currency) => {
    await setCurrency(newCurrency);
    Alert.alert('Başarılı', 'Para birimi değiştirildi');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌍 Dil / Language</Text>
        <Text style={styles.sectionSubtitle}>Uygulama dilini seçin</Text>

        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.value}
            style={[
              styles.optionButton,
              language === lang.value && styles.optionButtonActive,
            ]}
            onPress={() => handleLanguageChange(lang.value)}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionFlag}>{lang.flag}</Text>
              <Text style={[
                styles.optionLabel,
                language === lang.value && styles.optionLabelActive,
              ]}>
                {lang.label}
              </Text>
            </View>
            {language === lang.value && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Currency Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💱 Para Birimi / Currency</Text>
        <Text style={styles.sectionSubtitle}>
          Fiyatların gösterileceği para birimini seçin
        </Text>

        {currencies.map((curr) => (
          <TouchableOpacity
            key={curr.value}
            style={[
              styles.optionButton,
              currency === curr.value && styles.optionButtonActive,
            ]}
            onPress={() => handleCurrencyChange(curr.value)}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionSymbol}>{curr.symbol}</Text>
              <View>
                <Text style={[
                  styles.optionLabel,
                  currency === curr.value && styles.optionLabelActive,
                ]}>
                  {curr.label}
                </Text>
                <Text style={styles.optionCode}>{curr.value}</Text>
              </View>
            </View>
            {currency === curr.value && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Kur bilgileri yaklaşık değerlerdir. Gerçek fiyatlar için tedarikçi ile iletişime geçin.
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionFlag: {
    fontSize: 28,
  },
  optionSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    width: 32,
    textAlign: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  optionLabelActive: {
    fontWeight: '600',
    color: '#007AFF',
  },
  optionCode: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
