import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import ApplyDiscountModal from '../../components/ApplyDiscountModal';

interface OrderItem {
  stoneId: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  cut?: string;
  originalPrice: number;
  discountedPrice?: number;
}

interface Order {
  id: string;
  orderId: string;
  status: string;
  finalTotal: number;
  originalTotal: number;
  totalDiscount?: number;
  items: OrderItem[];
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerCompany?: string;
  supplierId: string;
  supplierName?: string;
  createdAt: any;
  updatedAt: any;
}

export default function OrderDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = route.params as { orderId: string };

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        setOrder({
          id: orderDoc.id,
          ...orderDoc.data(),
        } as Order);
      } else {
        Alert.alert('Hata', 'Sipariş bulunamadı');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Hata', 'Sipariş yüklenemedi');
    } finally {
      setLoading(false);
    }
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

  const handleApplyDiscount = () => {
    setShowDiscountModal(true);
  };

  const handleDiscountSuccess = () => {
    loadOrder(); // Reload order to show updated prices
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Sipariş bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Order Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>#{order.orderId?.substring(0, 16) || order.id.substring(0, 8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
          </View>
        </View>
        <Text style={styles.date}>
          {order.createdAt?.toDate?.()?.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Buyer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alıcı Bilgileri</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>İsim</Text>
          <Text style={styles.infoValue}>{order.buyerName || 'N/A'}</Text>

          {order.buyerCompany && (
            <>
              <Text style={styles.infoLabel}>Şirket</Text>
              <Text style={styles.infoValue}>{order.buyerCompany}</Text>
            </>
          )}

          <Text style={styles.infoLabel}>E-posta</Text>
          <Text style={styles.infoValue}>{order.buyerEmail || 'N/A'}</Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Taşlar ({order.items?.length || 0})</Text>
        {order.items?.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemShape}>{item.shape}</Text>
              <Text style={styles.itemPrice}>
                ${item.discountedPrice?.toLocaleString() || item.originalPrice?.toLocaleString() || 0}
              </Text>
            </View>
            <View style={styles.itemSpecs}>
              <Text style={styles.itemSpec}>{item.carat} ct</Text>
              <Text style={styles.itemSpec}>{item.color}</Text>
              <Text style={styles.itemSpec}>{item.clarity}</Text>
              {item.cut && <Text style={styles.itemSpec}>{item.cut}</Text>}
            </View>
            {item.discountedPrice && item.discountedPrice < item.originalPrice && (
              <Text style={styles.originalPrice}>
                Orijinal: ${item.originalPrice?.toLocaleString()}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Price Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fiyat Özeti</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Orijinal Toplam</Text>
            <Text style={styles.summaryValue}>${order.originalTotal?.toLocaleString() || 0}</Text>
          </View>

          {order.totalDiscount && order.totalDiscount > 0 && (
            <View style={[styles.summaryRow, styles.discountRow]}>
              <Text style={styles.summaryLabel}>İndirim</Text>
              <Text style={styles.discountValue}>-${order.totalDiscount?.toLocaleString()}</Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalValue}>${order.finalTotal?.toLocaleString() || 0}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {order.status === 'PENDING_OFFER' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.discountButton}
            onPress={handleApplyDiscount}
          >
            <Text style={styles.discountButtonText}>İndirim Uygula</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 20 }} />

      {/* Apply Discount Modal */}
      {order && (
        <ApplyDiscountModal
          visible={showDiscountModal}
          orderId={order.id}
          items={order.items}
          originalTotal={order.originalTotal}
          onClose={() => setShowDiscountModal(false)}
          onSuccess={handleDiscountSuccess}
        />
      )}
    </ScrollView>
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
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemShape: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  itemSpecs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  itemSpec: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  discountValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  discountButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  discountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
