import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useTheme } from '../context/ThemeContext';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { favorites, loading, loadFavorites, removeFromFavorites } = useFavoritesStore();

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleStonePress = (stoneId: string) => {
    (navigation as any).navigate('DiamondDetail', { stoneId });
  };

  const handleRemoveFavorite = async (stoneId: string) => {
    Alert.alert(
      t('favorites.removeTitle'),
      t('favorites.removeConfirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('favorites.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromFavorites(stoneId);
            } catch (error) {
              Alert.alert(t('common.error'), t('favorites.removeFailed'));
            }
          },
        },
      ]
    );
  };

  const renderFavoriteCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.backgroundCard }]} onPress={() => handleStonePress(item.id)}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.borderLight }]}>
        <Text style={[styles.stoneId, { color: theme.textPrimary }]}>💎 {item.stoneId}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFavorite(item.id)}
        >
          <Text style={styles.removeIcon}>❌</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('common.shape')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.shape}</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('common.carat')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.carat.toFixed(2)} CT</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('common.color')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.color}</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('common.clarity')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.clarity}</Text>
        </View>
      </View>

      <View style={[styles.cardFooter, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('common.totalPrice')}</Text>
          <Text style={[styles.price, { color: theme.primary }]}>${item.totalPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.pricePerCaratContainer}>
          <Text style={[styles.pricePerCaratLabel, { color: theme.textDim }]}>$/CT</Text>
          <Text style={[styles.pricePerCarat, { color: theme.textSecondary }]}>${item.pricePerCarat.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('favorites.loading')}</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <Text style={styles.emptyIcon}>❤️</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('favorites.emptyTitle')}</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t('favorites.emptyMessage')}
        </Text>
        <TouchableOpacity
          style={[styles.browseButton, { backgroundColor: theme.primary }]}
          onPress={() => (navigation as any).navigate('Marketplace')}
        >
          <Text style={styles.browseButtonText}>{t('favorites.browseDiamonds')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>❤️ {t('favorites.title')}</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{favorites.length} {t('favorites.stonesCount')}</Text>
      </View>

      <FlatList
        data={favorites}
        renderItem={renderFavoriteCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
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
    padding: 32,
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
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
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
    padding: 4,
  },
  removeIcon: {
    fontSize: 18,
  },
  cardBody: {
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
  cardFooter: {
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pricePerCaratContainer: {
    alignItems: 'flex-end',
  },
  pricePerCaratLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  pricePerCarat: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
