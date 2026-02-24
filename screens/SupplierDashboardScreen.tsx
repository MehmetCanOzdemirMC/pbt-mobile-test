import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

type RootStackParamList = {
  MainTabs: undefined;
  OrderDetail: { orderId: string };
};

interface Stone {
  id: string;
  stoneId: string;
  carat: number;
  shape: string;
  color: string;
  clarity: string;
  totalPrice: number;
  status: string;
}

interface Order {
  id: string;
  orderId: string;
  buyerEmail: string;
  finalTotal: number;
  status: string;
  createdAt: any;
  items: any[];
}

export default function SupplierDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');
  const [stones, setStones] = useState<Stone[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, reserved: 0, sold: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        await loadInventory();
      } else {
        await loadOrders();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Loading inventory for user:', user.uid);

      // Removed orderBy to avoid composite index requirement
      const stonesQuery = query(
        collection(db, 'stones'),
        where('supplierId', '==', user.uid)
        // No limit - show all inventory
      );

      const snapshot = await getDocs(stonesQuery);
      console.log('Stones found:', snapshot.size);

      const stonesData: Stone[] = [];
      let available = 0, reserved = 0, sold = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Stone:', doc.id, data.stoneId, data.status);

        stonesData.push({
          id: doc.id,
          stoneId: data.stoneId || 'N/A',
          carat: data.carat || 0,
          shape: data.shape || 'Unknown',
          color: data.color || 'N/A',
          clarity: data.clarity || 'N/A',
          totalPrice: data.totalPrice || 0,
          status: data.status || 'available',
        });

        if (data.status === 'available') available++;
        else if (data.status === 'reserved') reserved++;
        else if (data.status === 'sold') sold++;
      });

      // Client-side sorting by newest first
      stonesData.sort((a, b) => b.id.localeCompare(a.id));

      console.log('Final stones count:', stonesData.length);
      setStones(stonesData);
      setStats({ total: stonesData.length, available, reserved, sold });
    } catch (error) {
      console.error('Error loading inventory:', error);
      console.error('Full error:', JSON.stringify(error));
    }
  };

  const loadOrders = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No user found for orders');
        return;
      }

      console.log('📦 Loading orders for user:', user.uid);
      console.log('📦 User email:', user.email);

      // Removed orderBy to avoid composite index requirement
      const ordersQuery = query(
        collection(db, 'orders'),
        where('supplierId', '==', user.uid),
        limit(50)
      );

      console.log('📦 Query: supplierId ==', user.uid);

      const snapshot = await getDocs(ordersQuery);
      console.log('📦 Orders found:', snapshot.size);

      if (snapshot.size === 0) {
        console.log('⚠️ No orders found for this supplier!');
        console.log('⚠️ Make sure orders have supplierId:', user.uid);
      }

      const ordersData: Order[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Order:', doc.id, data.orderId, data.status);

        ordersData.push({
          id: doc.id,
          orderId: data.orderId || 'N/A',
          buyerEmail: data.buyerEmail || 'Unknown',
          finalTotal: data.finalTotal || 0,
          status: data.status || 'NEGOTIATING',
          createdAt: data.createdAt,
          items: data.items || [],
        });
      });

      // Client-side sorting by newest first
      ordersData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      console.log('Final orders count:', ordersData.length);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      console.error('Full error:', JSON.stringify(error));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'reserved': return '#FF9800';
      case 'sold': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Mevcut';
      case 'reserved': return 'Rezerve';
      case 'sold': return 'Satıldı';
      case 'NEGOTIATING': return 'Görüşülüyor';
      case 'PENDING_PAYMENT': return 'Ödeme Bekliyor';
      case 'PAYMENT_CLAIMED': return 'Ödeme Bildirimi';
      case 'COMPLETED': return 'Tamamlandı';
      default: return status;
    }
  };

  const renderStoneItem = ({ item }: { item: Stone }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.stoneId}>💎 {item.stoneId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.specs}>
          {item.carat} CT • {item.shape} • {item.color}/{item.clarity}
        </Text>
        <Text style={styles.price}>${item.totalPrice.toLocaleString()}</Text>
      </View>
    </View>
  );

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>📦 {item.orderId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#007AFF' }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.buyer}>Alıcı: {item.buyerEmail}</Text>
        <Text style={styles.itemCount}>{item.items.length} ürün</Text>
        <Text style={styles.price}>${item.finalTotal.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Debug Info Banner */}
      <View style={{ backgroundColor: '#fff3cd', padding: 8, borderBottomWidth: 1, borderBottomColor: '#ffc107' }}>
        <Text style={{ fontSize: 10, color: '#856404', textAlign: 'center' }}>
          Supplier UID: {auth.currentUser?.uid?.substring(0, 20)}...
        </Text>
      </View>

      {/* Stats */}
      {activeTab === 'inventory' && (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.available}</Text>
            <Text style={styles.statLabel}>Mevcut</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.reserved}</Text>
            <Text style={styles.statLabel}>Rezerve</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#9E9E9E' }]}>{stats.sold}</Text>
            <Text style={styles.statLabel}>Satıldı</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.tabActive]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>
            📦 Stoklar ({stones.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            🛒 Siparişler ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'inventory' ? stones : orders}
          renderItem={activeTab === 'inventory' ? renderStoneItem : renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{activeTab === 'inventory' ? '💎' : '📦'}</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'inventory' ? 'Henüz stok yok' : 'Henüz sipariş yok'}
              </Text>
            </View>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stoneId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    gap: 6,
  },
  specs: {
    fontSize: 14,
    color: '#666',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  buyer: {
    fontSize: 13,
    color: '#666',
  },
  itemCount: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
