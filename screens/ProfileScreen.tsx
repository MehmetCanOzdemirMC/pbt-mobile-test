import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { useCartStore } from '../stores/cartStore';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser;
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({ orders: 0, conversations: 0 });
  const [loading, setLoading] = useState(true);
  const { totalItems } = useCartStore();

  useEffect(() => {
    if (user) {
      loadUserData();
      loadStats();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user!.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Count orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('buyerId', '==', user!.uid)
      );
      const ordersSnapshot = await getDocs(ordersQuery);

      // Count conversations
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', user!.uid)
      );
      const conversationsSnapshot = await getDocs(conversationsQuery);

      setStats({
        orders: ordersSnapshot.size,
        conversations: conversationsSnapshot.size,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const getRoleIcon = (role: string) => {
    if (!role) return '👤';

    // Admin roles
    if (role.includes('superAdmin')) return '👑';
    if (role.includes('admin')) return '⚡';

    // Supplier roles
    if (role.includes('supplier')) return '🏭';

    // Retailer/Buyer roles
    if (role.includes('retailer') || role.includes('buyer')) return '🛍️';

    // Default
    return '👤';
  };

  const getRoleLabel = (role: string) => {
    console.log('User role:', role); // Debug log

    if (!role) return 'Onay Bekliyor';

    // Admin roles
    if (role.includes('superAdmin')) return 'Süper Yönetici';
    if (role.includes('admin')) return 'Yönetici';

    // Supplier roles (check specific types first)
    if (role.includes('supplierInternational')) return 'Uluslararası Tedarikçi';
    if (role.includes('supplierDropship')) return 'Dropship Tedarikçi';
    if (role.includes('supplierLocal')) return 'Yerel Tedarikçi';
    if (role.includes('supplier')) return 'Tedarikçi'; // Generic supplier

    // Retailer/Buyer roles
    if (role.includes('verifiedRetailer')) return 'Onaylı Perakendeci';
    if (role.includes('retailer')) return 'Perakendeci';
    if (role.includes('buyer')) return 'Alıcı';

    // Unverified user
    if (role.includes('unverified')) return 'Onay Bekliyor';

    // If we have a role but it doesn't match any known type
    return role; // Show the actual role value
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Profil yükleniyor...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Profil yüklenemedi</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{getRoleIcon(userData.role)}</Text>
        <Text style={styles.name}>
          {userData.name || 'N/A'} {userData.surname || ''}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{getRoleLabel(userData.role)}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statBox}
          onPress={() => (navigation as any).navigate('Cart')}
        >
          <Text style={styles.statValue}>{totalItems()}</Text>
          <Text style={styles.statLabel}>Sepet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statBox}
          onPress={() => (navigation as any).navigate('Favorites')}
        >
          <Text style={styles.statValue}>❤️</Text>
          <Text style={styles.statLabel}>Favoriler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statBox}
          onPress={() => (navigation as any).navigate('Orders')}
        >
          <Text style={styles.statValue}>{stats.orders}</Text>
          <Text style={styles.statLabel}>Sipariş</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>

        {userData.companyName && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>🏢 Firma:</Text>
            <Text style={styles.value}>{userData.companyName}</Text>
          </View>
        )}

        {userData.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>📞 Telefon:</Text>
            <Text style={styles.value}>{userData.phone}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.label}>📧 Email:</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>✅ Durum:</Text>
          <Text style={styles.value}>{userData.membershipStatus || 'pending'}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => (navigation as any).navigate('ProfileEdit')}
      >
        <Text style={styles.editButtonText}>✏️ Profili Düzenle</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => (navigation as any).navigate('Settings')}
      >
        <Text style={styles.settingsButtonText}>⚙️ Ayarlar (Dil & Para Birimi)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>🚪 Çıkış Yap</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>✅ Veriler web sitesi ile senkron</Text>
      <View style={{ height: 20 }} />
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  roleBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  editButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#34C759',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 24,
  },
});
