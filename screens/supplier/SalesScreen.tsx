import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../../config/firebase';

interface Order {
  id: string;
  status: string;
  finalTotal: number;
  originalTotal?: number;
  totalDiscount?: number;
  items: any[];
  buyerId: string;
  buyerCompany?: string;
  createdAt: any;
}

/**
 * Sales Screen - Incoming orders for supplier
 * Shows orders where supplier is the seller
 */
export default function SalesScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'orders'),
      where('supplierId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      // Sort on client side (newest first)
      ordersData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setOrders(ordersData);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('OrderDetail' as never, { orderId } as never);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_OFFER':
        return '#FF9800';
      case 'PENDING_PAYMENT':
        return '#2196F3';
      case 'PAYMENT_CLAIMED':
        return '#9C27B0';
      case 'COMPLETED':
        return '#4CAF50';
      case 'CANCELLED_BY_SUPPLIER':
      case 'CANCELLED_BY_BUYER':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_OFFER':
        return 'Teklif Bekliyor';
      case 'PENDING_PAYMENT':
        return 'Ödeme Bekliyor';
      case 'PAYMENT_CLAIMED':
        return 'Ödeme Bildirimi';
      case 'COMPLETED':
        return 'Tamamlandı';
      case 'CANCELLED_BY_SUPPLIER':
        return 'İptal (Tedarikçi)';
      case 'CANCELLED_BY_BUYER':
        return 'İptal (Alıcı)';
      default:
        return status;
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusText(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOrderPress(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{item.id.substring(0, 8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        {item.buyerCompany && (
          <Text style={styles.company}>{item.buyerCompany}</Text>
        )}

        <View style={styles.itemsContainer}>
          <Text style={styles.itemsText}>
            {item.items?.length || 0} taş
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>${item.finalTotal?.toLocaleString() || '0'}</Text>
          <Text style={styles.date}>
            {item.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || ''}
          </Text>
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
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz sipariş yok</Text>
            <Text style={styles.emptySubtext}>Gelen siparişler burada görünecek</Text>
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
  orderId: {
    fontSize: 16,
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
  company: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemsText: {
    fontSize: 14,
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
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
