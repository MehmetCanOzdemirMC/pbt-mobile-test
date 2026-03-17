import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../config/firebase';
import SupplierDashboardScreen from './SupplierDashboardScreen';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const user = auth.currentUser;
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role || null);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  // Show Supplier Dashboard if user is a supplier
  if (userRole?.includes('supplier')) {
    return <SupplierDashboardScreen />;
  }

  // Show welcome screen for retailers
  return (
    <ScreenWrapper>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>🏠 {t('home.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('home.welcome', { name: user?.displayName || user?.email })}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundCard }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>📊 {t('home.quickAccess.title')}</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>• {t('home.quickAccess.viewMarketplace')}</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>• {t('home.quickAccess.checkMessages')}</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>• {t('home.quickAccess.editProfile')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundCard }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>ℹ️ {t('home.testMode.title')}</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            {t('home.testMode.description')}
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});
