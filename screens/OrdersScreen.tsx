import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot, or, orderBy } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

interface Order {
  id: string;
  orderId: string;
  buyerId: string;
  buyerEmail: string;
  supplierId: string;
  supplierName: string;
  items: any[];
  originalTotal: number;
  finalTotal: number;
  totalDiscount: number;
  status: string;
  paymentInfo?: any;
  cancellationReason?: string;
  createdAt?: any;
}

const STATUS_LABELS: { [key: string]: string } = {
  NEGOTIATING: '🔄 Görüşülüyor',
  PENDING_PAYMENT: '⏳ Ödeme Bekleniyor',
  PAYMENT_CLAIMED: '💳 Ödeme İddia Edildi',
  COMPLETED: '✅ Tamamlandı',
  CANCELLED: '❌ İptal Edildi',
};

const STATUS_COLORS: { [key: string]: string } = {
  NEGOTIATING: '#FF9800',
  PENDING_PAYMENT: '#2196F3',
  PAYMENT_CLAIMED: '#9C27B0',
  COMPLETED: '#4CAF50',
  CANCELLED: '#F44336',
};

export default function OrdersScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) return;

    console.log('📦 Loading orders for user:', currentUserId);

    // Query orders where user is buyer OR supplier
    const ordersQuery = query(
      collection(db, 'orders'),
      or(
        where('buyerId', '==', currentUserId),
        where('supplierId', '==', currentUserId)
      )
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });

      // Sort by creation date (newest first)
      ordersData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      console.log('✅ Orders loaded:', ordersData.length);
      setOrders(ordersData);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [currentUserId]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const filteredOrders = filter === 'ALL'
    ? orders
    : orders.filter(order => order.status === filter);

  const getOrderRole = (order: Order): 'BUYER' | 'SUPPLIER' => {
    return order.buyerId === currentUserId ? 'BUYER' : 'SUPPLIER';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toMillis) return '';
    const date = new Date(timestamp.toMillis());
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const role = getOrderRole(item);
    const statusColor = STATUS_COLORS[item.status] || '#666';
    const statusLabel = STATUS_LABELS[item.status] || item.status;

    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: theme.backgroundCard }]}
        onPress={() => navigation.navigate('OrderDetail' as never, { orderId: item.id } as never)}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={[styles.orderId, { color: theme.textPrimary }]}>{item.orderId}</Text>
            <View style={[styles.roleBadge, { backgroundColor: role === 'BUYER' ? '#2196F3' : '#FF9800' }]}>
              <Text style={styles.roleBadgeText}>
                {role === 'BUYER' ? '🛍️ Alıcı' : '📦 Satıcı'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.orderDetails}>
          <Text style={[styles.orderDetailText, { color: theme.textSecondary }]}>
            {role === 'BUYER'
              ? `📍 Tedarikçi: ${item.supplierName}`
              : `👤 Alıcı: ${item.buyerEmail}`
            }
          </Text>
          <Text style={[styles.orderDetailText, { color: theme.textSecondary }]}>
            📦 {item.items.length} ürün
          </Text>
          <Text style={[styles.orderDetailText, { color: theme.textSecondary }]}>
            💰 Toplam: ${item.finalTotal.toLocaleString()}
          </Text>
          {item.createdAt && (
            <Text style={[styles.orderDate, { color: theme.textDim }]}>
              📅 {formatDate(item.createdAt)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Siparişler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: theme.background },
            filter === 'ALL' && [styles.filterTabActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[
            styles.filterTabText,
            { color: theme.textSecondary },
            filter === 'ALL' && styles.filterTabTextActive
          ]}>
            Tümü ({orders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: theme.background },
            filter === 'NEGOTIATING' && [styles.filterTabActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilter('NEGOTIATING')}
        >
          <Text style={[
            styles.filterTabText,
            { color: theme.textSecondary },
            filter === 'NEGOTIATING' && styles.filterTabTextActive
          ]}>
            Görüşülüyor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: theme.background },
            filter === 'PENDING_PAYMENT' && [styles.filterTabActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilter('PENDING_PAYMENT')}
        >
          <Text style={[
            styles.filterTabText,
            { color: theme.textSecondary },
            filter === 'PENDING_PAYMENT' && styles.filterTabTextActive
          ]}>
            Bekliyor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: theme.background },
            filter === 'COMPLETED' && [styles.filterTabActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilter('COMPLETED')}
        >
          <Text style={[
            styles.filterTabText,
            { color: theme.textSecondary },
            filter === 'COMPLETED' && styles.filterTabTextActive
          ]}>
            Tamamlandı
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Sipariş Bulunamadı</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {filter === 'ALL'
              ? 'Henüz hiç siparişiniz yok'
              : `${STATUS_LABELS[filter]} durumunda sipariş yok`
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  orderDetails: {
    gap: 8,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#555',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
