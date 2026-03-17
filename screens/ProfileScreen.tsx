import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { useCartStore } from '../stores/cartStore';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
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
      t('auth.logout'),
      t('confirmations.logout'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message);
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

    if (!role) return t('profile.rolePending');

    // Admin roles
    if (role.includes('superAdmin')) return t('profile.roleSuperAdmin');
    if (role.includes('admin')) return t('profile.roleAdmin');

    // Supplier roles (check specific types first)
    if (role.includes('supplierInternational')) return t('profile.roleSupplierInternational');
    if (role.includes('supplierDropship')) return t('profile.roleSupplierDropship');
    if (role.includes('supplierLocal')) return t('profile.roleSupplierLocal');
    if (role.includes('supplier')) return t('profile.roleSupplier'); // Generic supplier

    // Retailer/Buyer roles
    if (role.includes('verifiedRetailer')) return t('profile.roleVerifiedRetailer');
    if (role.includes('retailer')) return t('profile.roleRetailer');
    if (role.includes('buyer')) return t('profile.roleBuyer');

    // Unverified user
    if (role.includes('unverified')) return t('profile.rolePending');

    // If we have a role but it doesn't match any known type
    return role; // Show the actual role value
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('profile.loading')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!userData) {
    return (
      <ScreenWrapper>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>{t('profile.loadingError')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        {userData.photoURL ? (
          <Image
            source={{ uri: userData.photoURL }}
            style={styles.profileImage}
          />
        ) : (
          <View style={[styles.emojiContainer, { backgroundColor: theme.primary }]}>
            <Text style={styles.emoji}>{getRoleIcon(userData.role)}</Text>
          </View>
        )}
        <Text style={[styles.name, { color: theme.textPrimary }]}>
          {userData.name || 'N/A'} {userData.surname || ''}
        </Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.roleBadgeText}>{getRoleLabel(userData.role)}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: theme.backgroundCard }]}>
        <TouchableOpacity
          style={styles.statBox}
          onPress={() => (navigation as any).navigate('Cart')}
        >
          <Text style={[styles.statValue, { color: theme.primary }]}>{totalItems()}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('cart.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statBox}
          onPress={() => (navigation as any).navigate('Favorites')}
        >
          <Text style={[styles.statValue, { color: theme.primary }]}>❤️</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.favorites')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statBox}
          onPress={() => (navigation as any).navigate('Orders')}
        >
          <Text style={[styles.statValue, { color: theme.primary }]}>{stats.orders}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('orders.title')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('profile.accountInfo')}</Text>

        {userData.companyName && (
          <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{`🏢 ${t('profile.companyLabel')}`}</Text>
            <Text style={[styles.value, { color: theme.textPrimary }]}>{userData.companyName}</Text>
          </View>
        )}

        {userData.phone && (
          <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{`📞 ${t('profile.phoneLabel')}`}</Text>
            <Text style={[styles.value, { color: theme.textPrimary }]}>{userData.phone}</Text>
          </View>
        )}

        <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{`📧 ${t('profile.emailLabel')}`}</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{user?.email}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{`✅ ${t('profile.statusLabel')}`}</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{userData.membershipStatus || 'pending'}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.editButton, { backgroundColor: theme.primary }]}
        onPress={() => (navigation as any).navigate('ProfileEdit')}
      >
        <Text style={styles.editButtonText}>{`✏️ ${t('profile.editProfile')}`}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: theme.success }]}
        onPress={() => (navigation as any).navigate('Settings')}
      >
        <Text style={styles.settingsButtonText}>{`⚙️ ${t('profile.settingsButton')}`}</Text>
      </TouchableOpacity>

      {/* 🧪 TEST FEATURES (NEW - Port from Web) */}
      <View style={[styles.section, { backgroundColor: theme.backgroundCard, marginTop: 16 }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{`🧪 ${t('profile.testFeatures')}`}</Text>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
          onPress={() => (navigation as any).navigate('Analytics')}
        >
          <Text style={styles.testButtonIcon}>📊</Text>
          <Text style={[styles.testButtonText, { color: theme.primary }]}>Analytics Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
          onPress={() => (navigation as any).navigate('Calculator')}
        >
          <Text style={styles.testButtonIcon}>💰</Text>
          <Text style={[styles.testButtonText, { color: theme.primary }]}>Price Calculator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
          onPress={() => (navigation as any).navigate('BulkImport')}
        >
          <Text style={styles.testButtonIcon}>📤</Text>
          <Text style={[styles.testButtonText, { color: theme.primary }]}>Bulk Import</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
          onPress={() => (navigation as any).navigate('Certificate')}
        >
          <Text style={styles.testButtonIcon}>🔍</Text>
          <Text style={[styles.testButtonText, { color: theme.primary }]}>Certificate Verification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
          onPress={() => (navigation as any).navigate('CustomDesign')}
        >
          <Text style={styles.testButtonIcon}>✨</Text>
          <Text style={[styles.testButtonText, { color: theme.primary }]}>Custom Design (3D Viewer)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: `${theme.warning}15`, borderColor: theme.warning }]}
          onPress={() => (navigation as any).navigate('AdminDashboard')}
        >
          <Text style={styles.testButtonIcon}>👑</Text>
          <Text style={[styles.testButtonText, { color: theme.warning }]}>Admin Dashboard (6 Tabs)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.error }]} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>{`🚪 ${t('auth.logout')}`}</Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: theme.success }]}>{`✅ ${t('profile.syncedData')}`}</Text>
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
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  emojiContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 48,
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
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  testButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
