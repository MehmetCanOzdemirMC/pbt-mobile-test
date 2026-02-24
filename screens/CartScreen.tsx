import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCartStore, CartItem } from '../stores/cartStore';

export default function CartScreen() {
  const navigation = useNavigation();
  const { items, loading, loadCart, removeFromCart, clearCart, totalPrice, checkExpiry } = useCartStore();

  useEffect(() => {
    loadCart();
    checkExpiry();
  }, []);

  const handleRemoveItem = async (stoneId: string) => {
    Alert.alert(
      'Sepetten Çıkar',
      'Bu taşı sepetten çıkarmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromCart(stoneId);
              Alert.alert('Başarılı', 'Taş sepetten çıkarıldı');
            } catch (error) {
              Alert.alert('Hata', 'Taş çıkarılırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleClearCart = async () => {
    Alert.alert(
      'Sepeti Temizle',
      'Sepetteki tüm ürünleri silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCart();
              Alert.alert('Başarılı', 'Sepet temizlendi');
            } catch (error) {
              Alert.alert('Hata', 'Sepet temizlenirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const formatTimeRemaining = (addedAt: number) => {
    const now = Date.now();
    const elapsed = now - addedAt;
    const oneHour = 60 * 60 * 1000;
    const remaining = oneHour - elapsed;

    if (remaining <= 0) {
      return 'Süresi dolmuş';
    }

    const minutes = Math.floor(remaining / 60000);
    return `${minutes} dk kaldı`;
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.stoneId}>💎 {item.stoneId}</Text>
        <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
          <Text style={styles.removeButton}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.itemBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Şekil:</Text>
          <Text style={styles.value}>{item.shape}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Karat:</Text>
          <Text style={styles.value}>{item.carat.toFixed(2)} CT</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Renk:</Text>
          <Text style={styles.value}>{item.color}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Berraklık:</Text>
          <Text style={styles.value}>{item.clarity}</Text>
        </View>

        {item.supplierName && (
          <View style={styles.row}>
            <Text style={styles.label}>Tedarikçi:</Text>
            <Text style={styles.value}>{item.supplierName}</Text>
          </View>
        )}
      </View>

      <View style={styles.itemFooter}>
        <View>
          <Text style={styles.priceLabel}>Fiyat</Text>
          <Text style={styles.price}>${item.totalPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.expiryContainer}>
          <Text style={styles.expiryText}>⏱️ {formatTimeRemaining(item.addedAt)}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Sepet yükleniyor...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Sepetiniz Boş</Text>
        <Text style={styles.emptyText}>Marketplace'den taş ekleyerek başlayın</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 Sepetim ({items.length} Taş)</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearButton}>Temizle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Toplam:</Text>
          <Text style={styles.summaryValue}>${totalPrice().toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('Checkout' as never)}
        >
          <Text style={styles.checkoutButtonText}>Sipariş Ver 🚀</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          ℹ️ Sepetteki ürünler 1 saat sonra otomatik olarak silinir
        </Text>
      </View>
    </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stoneId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    fontSize: 20,
  },
  itemBody: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  expiryContainer: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  expiryText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  checkoutButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
