import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';

interface Stone {
  id: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  cut?: string;
  totalPrice?: number;
  pricePerCarat?: number;
  rapPrice?: number;
  availability: 'available' | 'reserved' | 'sold';
  createdAt: any;
}

/**
 * Inventory Screen - Supplier's stone inventory
 * Shows all stones uploaded by the supplier
 */
export default function InventoryScreen() {
  const { theme } = useTheme();
  const [stones, setStones] = useState<Stone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    reserved: 0,
    sold: 0,
  });

  useEffect(() => {
    if (!auth.currentUser) {
      console.log('❌ [InventoryScreen] No authenticated user');
      return;
    }

    console.log('🔍 [InventoryScreen] Querying stones for supplierId:', auth.currentUser.uid);

    const q = query(
      collection(db, 'stones'),
      where('supplierId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📦 [InventoryScreen] Firestore snapshot received:', {
        size: snapshot.size,
        empty: snapshot.empty,
      });

      const stonesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Stone[];

      // Sort on client side (newest first)
      stonesData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setStones(stonesData);

      // Calculate stats
      const stats = {
        total: stonesData.length,
        available: stonesData.filter((s) => s.availability === 'available').length,
        reserved: stonesData.filter((s) => s.availability === 'reserved').length,
        sold: stonesData.filter((s) => s.availability === 'sold').length,
      };
      setStats(stats);

      console.log('✅ [InventoryScreen] Stones loaded:', {
        total: stats.total,
        available: stats.available,
        reserved: stats.reserved,
        sold: stats.sold,
      });

      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('❌ [InventoryScreen] Firestore error:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const handleCSVUpload = () => {
    Alert.alert('CSV Yükleme', 'CSV yükleme özelliği yakında eklenecek!');
  };

  const renderStoneCard = ({ item }: { item: Stone }) => {
    const statusColor =
      item.availability === 'available' ? theme.success :
      item.availability === 'reserved' ? theme.warning :
      theme.textDim;

    const statusText =
      item.availability === 'available' ? 'Müsait' :
      item.availability === 'reserved' ? 'Rezerve' :
      'Satıldı';

    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.shape, { color: theme.textPrimary }]}>{item.shape}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.specs}>
          <Text style={[styles.spec, { color: theme.textSecondary, backgroundColor: theme.background }]}>{item.carat} ct</Text>
          <Text style={[styles.spec, { color: theme.textSecondary, backgroundColor: theme.background }]}>{item.color}</Text>
          <Text style={[styles.spec, { color: theme.textSecondary, backgroundColor: theme.background }]}>{item.clarity}</Text>
          {item.cut && <Text style={[styles.spec, { color: theme.textSecondary, backgroundColor: theme.background }]}>{item.cut}</Text>}
        </View>

        <Text style={[styles.price, { color: theme.primary }]}>${item.totalPrice?.toLocaleString() || '0'}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Stats Cards */}
      <View style={[styles.statsContainer, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Toplam</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.success }]}>{stats.available}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Müsait</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.warning }]}>{stats.reserved}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rezerve</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.textDim }]}>{stats.sold}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Satıldı</Text>
        </View>
      </View>

      {/* Upload Button */}
      <TouchableOpacity style={[styles.uploadButton, { backgroundColor: theme.primary }]} onPress={handleCSVUpload}>
        <Text style={styles.uploadButtonText}>+ CSV Yükle</Text>
      </TouchableOpacity>

      {/* Stones List */}
      <FlatList
        data={stones}
        keyExtractor={(item) => item.id}
        renderItem={renderStoneCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textDim }]}>Henüz stok eklenmemiş</Text>
            <Text style={[styles.emptySubtext, { color: theme.textDim }]}>CSV yükleyerek stok ekleyin</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  uploadButton: {
    margin: 12,
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shape: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  specs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  spec: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
});
