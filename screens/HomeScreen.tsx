import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import SupplierDashboardScreen from './SupplierDashboardScreen';

export default function HomeScreen() {
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show Supplier Dashboard if user is a supplier
  if (userRole?.includes('supplier')) {
    return <SupplierDashboardScreen />;
  }

  // Show welcome screen for retailers
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏠 Ana Sayfa</Text>
        <Text style={styles.subtitle}>Hoş geldiniz, {user?.displayName || user?.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Hızlı Erişim</Text>
        <Text style={styles.cardText}>• Marketplace'den taş görebilirsiniz</Text>
        <Text style={styles.cardText}>• Mesajlarınızı kontrol edin</Text>
        <Text style={styles.cardText}>• Profilinizi düzenleyin</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ Test Modu</Text>
        <Text style={styles.cardText}>
          Bu mobil uygulama test amaçlıdır. Veriler web sitesi ile senkronize çalışır.
        </Text>
      </View>
    </ScrollView>
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
