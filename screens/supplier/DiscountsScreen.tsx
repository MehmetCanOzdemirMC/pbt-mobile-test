import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import CreateDiscountModal from '../../components/CreateDiscountModal';
import StockDiscountModal from '../../components/StockDiscountModal';
import ViewDiscountModal from '../../components/ViewDiscountModal';

interface Discount {
  id: string;
  discountPercent: number;
  percentage?: number; // Legacy support
  expiresAt: any;
  customerId: string;
  customerName?: string;
  used: boolean;
  createdAt: any;
  stoneIds?: string[];
  startDate?: string;
  endDate?: string;
}

/**
 * Discounts Screen - Supplier discount management
 * Shows active and past discounts
 */
export default function DiscountsScreen() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStockDiscountModal, setShowStockDiscountModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'discounts'),
      where('supplierId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const discountsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Discount[];

      // Sort on client side (newest first)
      discountsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setDiscounts(discountsData);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const handleCreateDiscount = () => {
    setShowCreateModal(true);
  };

  const handleCreateStockDiscount = () => {
    setShowStockDiscountModal(true);
  };

  const handleDiscountCreated = () => {
    // Discounts will automatically update via onSnapshot
    setRefreshing(true);
  };

  const handleViewDiscount = (discount: Discount) => {
    setSelectedDiscount(discount);
    setShowViewModal(true);
  };

  const renderDiscountCard = ({ item }: { item: Discount }) => {
    const isExpired = item.expiresAt?.toDate?.() < new Date();
    const statusColor = item.used ? '#9E9E9E' : isExpired ? '#F44336' : '#4CAF50';
    const statusText = item.used ? 'Kullanıldı' : isExpired ? 'Süresi Doldu' : 'Aktif';
    const discountValue = item.discountPercent || item.percentage || 0;

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleViewDiscount(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentage}>%{discountValue}</Text>
            <Text style={styles.percentageLabel}>İndirim</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        {item.customerName && (
          <Text style={styles.customer}>Müşteri: {item.customerName}</Text>
        )}

        {item.stoneIds && item.stoneIds.length > 0 && (
          <Text style={styles.stoneCount}>📦 {item.stoneIds.length} taş seçildi</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.date}>
            {item.startDate ? `${item.startDate} — ${item.endDate}` :
             `Oluşturma: ${item.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || ''}`}
          </Text>
          {item.expiresAt && (
            <Text style={styles.date}>
              Son Gün: {item.expiresAt?.toDate?.()?.toLocaleDateString('tr-TR') || ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Create Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.createButton, styles.primaryButton]}
          onPress={handleCreateStockDiscount}
        >
          <Text style={styles.createButtonText}>💎 Stok İndirimi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createButton, styles.secondaryButton]}
          onPress={handleCreateDiscount}
        >
          <Text style={styles.createButtonText}>📋 Müşteri İndirimi</Text>
        </TouchableOpacity>
      </View>

      {/* Discounts List */}
      <FlatList
        data={discounts}
        keyExtractor={(item) => item.id}
        renderItem={renderDiscountCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz indirim oluşturulmamış</Text>
            <Text style={styles.emptySubtext}>Müşterilere özel indirim tanımlayın</Text>
          </View>
        }
      />

      {/* Create Discount Modal */}
      <CreateDiscountModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleDiscountCreated}
      />

      {/* Stock Discount Modal */}
      <StockDiscountModal
        visible={showStockDiscountModal}
        onClose={() => setShowStockDiscountModal(false)}
        onSuccess={handleDiscountCreated}
      />

      {/* View Discount Modal */}
      <ViewDiscountModal
        visible={showViewModal}
        discount={selectedDiscount}
        onClose={() => {
          setShowViewModal(false);
          setSelectedDiscount(null);
        }}
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
  buttonsContainer: {
    flexDirection: 'row',
    margin: 12,
    gap: 12,
  },
  createButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  createButtonText: {
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
    marginBottom: 12,
  },
  percentageContainer: {
    alignItems: 'center',
  },
  percentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  percentageLabel: {
    fontSize: 12,
    color: '#666',
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
  customer: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  stoneCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
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
