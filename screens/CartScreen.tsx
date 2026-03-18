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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useCartStore, CartItem } from '../stores/cartStore';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { trackScreenView } from '../services/analyticsService';

export default function CartScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { items, loading, loadCart, removeFromCart, clearCart, totalPrice, checkExpiry } = useCartStore();

  useEffect(() => {
    loadCart();
    checkExpiry();
  }, []);

  // Track screen view
  useFocusEffect(
    React.useCallback(() => {
      trackScreenView('Cart', 'CartScreen');
    }, [])
  );

  const handleRemoveItem = async (stoneId: string) => {
    Alert.alert(
      t('cart.removeFromCart'),
      t('cart.confirmRemove'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('cart.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromCart(stoneId);
              Alert.alert(t('common.success'), t('cart.stoneRemoved'));
            } catch (error) {
              Alert.alert(t('common.error'), t('cart.removeError'));
            }
          },
        },
      ]
    );
  };

  const handleClearCart = async () => {
    Alert.alert(
      t('cart.clearCart'),
      t('cart.confirmClearAll'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('cart.clear'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCart();
              Alert.alert(t('common.success'), t('cart.cartCleared'));
            } catch (error) {
              Alert.alert(t('common.error'), t('cart.clearError'));
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
      return t('cart.expired');
    }

    const minutes = Math.floor(remaining / 60000);
    return t('cart.timeRemaining', { minutes });
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={[styles.cartItem, { backgroundColor: theme.backgroundCard }]}>
      <View style={[styles.itemHeader, { borderBottomColor: theme.borderLight }]}>
        <Text style={[styles.stoneId, { color: theme.textPrimary }]}>💎 {item.stoneId}</Text>
        <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
          <Text style={styles.removeButton}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.itemBody}>
        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('cart.shape')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.shape}</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('cart.carat')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.carat.toFixed(2)} CT</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('cart.color')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.color}</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('cart.clarity')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.clarity}</Text>
        </View>

        {item.supplierName && (
          <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('cart.supplier')}:</Text>
            <Text style={[styles.value, { color: theme.textPrimary }]}>{item.supplierName}</Text>
          </View>
        )}
      </View>

      <View style={[styles.itemFooter, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('cart.price')}</Text>
          <Text style={[styles.price, { color: theme.primary }]}>${item.totalPrice.toLocaleString()}</Text>
        </View>
        <View style={[styles.expiryContainer, { backgroundColor: theme.warningLight + '20' }]}>
          <Text style={[styles.expiryText, { color: theme.warning }]}>⏱️ {formatTimeRemaining(item.addedAt)}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('cart.loading')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (items.length === 0) {
    return (
      <ScreenWrapper>
        <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('cart.emptyTitle')}</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('cart.emptyMessage')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>🛒 {t('cart.myCart', { count: items.length })}</Text>
          <TouchableOpacity onPress={handleClearCart}>
            <Text style={[styles.clearButton, { color: theme.error }]}>{t('cart.clear')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />

        <View style={[styles.summaryContainer, { backgroundColor: theme.backgroundCard, borderTopColor: theme.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textPrimary }]}>{t('cart.total')}:</Text>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>${totalPrice().toLocaleString()}</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkoutButton, { backgroundColor: theme.success }]}
            onPress={() => navigation.navigate('Checkout' as never)}
          >
            <Text style={styles.checkoutButtonText}>{t('cart.placeOrder')} 🚀</Text>
          </TouchableOpacity>

          <Text style={[styles.note, { color: theme.textDim }]}>
            ℹ️ {t('cart.expiryNote')}
          </Text>
        </View>
      </View>
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
