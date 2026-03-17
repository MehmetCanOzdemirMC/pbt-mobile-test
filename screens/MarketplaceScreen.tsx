import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Heart, Check, Clock, SlidersHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../stores/cartStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useCompareStore } from '../stores/compareStore';
import { useMarketplaceStore } from '../stores/marketplaceStore';
import StoneDetailModal from '../components/StoneDetailModal';
import FilterSheet, { Filters, FilterSheetRef } from '../components/FilterSheet';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { parseSearchWithGemini, applyGeminiFilters } from '../utils/geminiSearch';

type RootStackParamList = {
  Home: undefined;
  Marketplace: undefined;
  Cart: undefined;
  Messages: undefined;
  Profile: undefined;
  DiamondDetail: { stoneId: string };
  Conversation: { conversationId: string };
};

interface Stone {
  id: string;
  stoneId: string;
  carat: number;
  shape: string;
  color: string;
  clarity: string;
  cut?: string;
  polish?: string;
  symmetry?: string;
  totalPrice: number;
  pricePerCarat: number;
  availability: string;
  supplierId: string;
  supplierName?: string;
}

export default function MarketplaceScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStone, setSelectedStone] = useState<Stone | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    shape: [],
    caratMin: '',
    caratMax: '',
    color: [],
    clarity: [],
    sortBy: 'date_desc',
  });

  const ITEMS_PER_PAGE = 20;

  const filterSheetRef = useRef<FilterSheetRef>(null);
  const { addToCart, totalItems, loadCart } = useCartStore();
  const { addToFavorites, removeFromFavorites, isFavorite, loadFavorites } = useFavoritesStore();
  const { compareList } = useCompareStore();

  // Use marketplace store for real-time updates
  const {
    diamonds,
    filteredDiamonds,
    loading,
    loadDiamonds,
    applyFilters: applyMarketplaceFilters,
  } = useMarketplaceStore();

  // Load diamonds on mount
  useEffect(() => {
    console.log('📱 MarketplaceScreen: Loading diamonds...');
    loadDiamonds();
    loadCart();
    loadFavorites();
  }, []);

  // Apply filters when they change (with Gemini AI support)
  useEffect(() => {
    const applyFiltersAsync = async () => {
      console.log('🔍 MarketplaceScreen: Applying filters...', filters);

      // Convert Filters to MarketplaceFilters format
      const marketplaceFilters: any = {};

      if (filters.shape.length > 0) {
        marketplaceFilters.shape = filters.shape;
      }

      if (filters.color.length > 0) {
        marketplaceFilters.color = filters.color;
      }

      if (filters.clarity.length > 0) {
        marketplaceFilters.clarity = filters.clarity;
      }

      if (filters.caratMin) {
        marketplaceFilters.caratMin = parseFloat(filters.caratMin);
      }

      if (filters.caratMax) {
        marketplaceFilters.caratMax = parseFloat(filters.caratMax);
      }

      // Try Gemini AI parsing for natural language search
      if (searchQuery.trim()) {
        try {
          const geminiFilters = await parseSearchWithGemini(searchQuery);
          if (geminiFilters) {
            console.log('🤖 Using Gemini AI filters:', geminiFilters);
            // Merge Gemini filters with marketplace filters
            if (geminiFilters.carat) marketplaceFilters.carat = geminiFilters.carat;
            if (geminiFilters.caratMin) marketplaceFilters.caratMin = geminiFilters.caratMin;
            if (geminiFilters.caratMax) marketplaceFilters.caratMax = geminiFilters.caratMax;
            if (geminiFilters.shape) marketplaceFilters.shape = [geminiFilters.shape];
            if (geminiFilters.color) marketplaceFilters.color = [geminiFilters.color];
            if (geminiFilters.clarity) marketplaceFilters.clarity = [geminiFilters.clarity];
          } else {
            // Fallback to regular search query
            marketplaceFilters.searchQuery = searchQuery;
          }
        } catch (error) {
          console.log('⚠️ Gemini parsing failed, using fallback search:', error);
          marketplaceFilters.searchQuery = searchQuery;
        }
      }

      applyMarketplaceFilters(marketplaceFilters);
    };

    applyFiltersAsync();
  }, [filters, searchQuery]);

  // Convert marketplace diamonds to Stone format
  const allStones: Stone[] = filteredDiamonds.map(d => ({
    id: d.id,
    stoneId: d.stoneId || d.certificateNo || d.JTRCertificateNo || d.id.slice(0, 8),
    carat: d.carat,
    shape: d.shape,
    color: d.color,
    clarity: d.clarity,
    cut: d.cut,
    polish: d.polish,
    symmetry: d.symmetry,
    totalPrice: d.totalPrice,
    pricePerCarat: d.pricePerCarat,
    availability: d.status === 'available' ? 'available' : 'reserved',
    supplierId: d.ownerId,
    supplierName: d.ownerName || d.companyName,
  }));

  // Pagination
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const stones = allStones.slice(startIndex, endIndex);

  const onRefresh = async () => {
    setRefreshing(true);
    loadDiamonds();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStonePress = (stone: Stone) => {
    // Navigate to DiamondDetail screen
    (navigation as any).navigate('DiamondDetail', { stoneId: stone.id });
  };

  const handleAddToCart = async (stone: Stone) => {
    if (stone.availability !== 'available') {
      Alert.alert(t('common.error'), t('marketplace.notAvailable'));
      return;
    }

    try {
      await addToCart({
        id: stone.id,
        stoneId: stone.stoneId,
        carat: stone.carat,
        shape: stone.shape,
        color: stone.color,
        clarity: stone.clarity,
        cut: stone.cut,
        polish: stone.polish,
        symmetry: stone.symmetry,
        totalPrice: stone.totalPrice,
        pricePerCarat: stone.pricePerCarat,
        supplierId: stone.supplierId,
        supplierName: stone.supplierName,
        addedAt: Date.now(),
      });
      Alert.alert(t('common.success'), t('marketplace.addToCartSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('marketplace.addToCartError'));
    }
  };

  const handleToggleFavorite = async (stone: Stone) => {
    try {
      if (isFavorite(stone.id)) {
        await removeFromFavorites(stone.id);
      } else {
        await addToFavorites({
          id: stone.id,
          stoneId: stone.stoneId,
          carat: stone.carat,
          shape: stone.shape,
          color: stone.color,
          clarity: stone.clarity,
          totalPrice: stone.totalPrice,
          pricePerCarat: stone.pricePerCarat,
          supplierId: stone.supplierId,
          supplierName: stone.supplierName,
          addedAt: Date.now(),
        });
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('marketplace.favoriteError'));
    }
  };

  const renderStoneCard = ({ item }: { item: Stone }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.backgroundCard }]} onPress={() => handleStonePress(item)}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.borderLight }]}>
        <Text style={[styles.stoneId, { color: theme.textPrimary }]}>💎 {item.stoneId}</Text>
        <View style={styles.cardHeaderRight}>
          <TouchableOpacity
            style={[
              styles.favoriteButton,
              { backgroundColor: isFavorite(item.id) ? theme.error + '15' : theme.border }
            ]}
            onPress={() => handleToggleFavorite(item)}
          >
            <Heart
              size={16}
              color={isFavorite(item.id) ? theme.error : theme.textDim}
              fill={isFavorite(item.id) ? theme.error : 'transparent'}
            />
          </TouchableOpacity>
          <View style={[
            styles.availabilityBadge,
            {
              backgroundColor: item.availability === 'available' ? theme.success + '20' : theme.warning + '20'
            }
          ]}>
            {item.availability === 'available' ? (
              <Check size={12} color={theme.success} strokeWidth={3} />
            ) : (
              <Clock size={12} color={theme.warning} strokeWidth={2.5} />
            )}
            <Text style={[
              styles.availabilityText,
              { color: item.availability === 'available' ? theme.success : theme.warning }
            ]}>
              {item.availability === 'available' ? t('marketplace.available') : t('marketplace.reserved')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('marketplace.shape')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.shape}</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('marketplace.carat')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.carat.toFixed(2)} CT</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('marketplace.color')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.color}</Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('marketplace.clarity')}:</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{item.clarity}</Text>
        </View>

        {item.cut && (
          <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('marketplace.cut')}:</Text>
            <Text style={[styles.value, { color: theme.textPrimary }]}>{item.cut}</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardFooter, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('marketplace.totalPrice')}</Text>
          <Text style={[styles.price, { color: theme.primary }]}>${item.totalPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.pricePerCaratContainer}>
          <Text style={[styles.pricePerCaratLabel, { color: theme.textDim }]}>$/CT</Text>
          <Text style={[styles.pricePerCarat, { color: theme.textSecondary }]}>${item.pricePerCarat.toLocaleString()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addToCartButton,
          { backgroundColor: theme.primary },
          item.availability !== 'available' && styles.addToCartButtonDisabled
        ]}
        onPress={() => handleAddToCart(item)}
        disabled={Boolean(item.availability !== 'available')}
      >
        <Text style={styles.addToCartButtonText}>
          {item.availability === 'available' ? `🛒 ${t('marketplace.addToCart')}` : `⏳ ${t('marketplace.notAvailableButton')}`}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('marketplace.loading')}</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.background, color: theme.textPrimary }]}
          placeholder={t('marketplace.searchPlaceholderStockId')}
          placeholderTextColor={theme.textDim}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.primary }]}
          onPress={() => filterSheetRef.current?.open()}
        >
          <SlidersHorizontal size={20} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={[styles.statsBar, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          📊 {t('marketplace.total', { count: allStones.length, showing: stones.length })}
        </Text>
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          ✓ {t('marketplace.availableCount', { count: allStones.filter(s => s.availability === 'available').length })}
        </Text>
      </View>

      <FlatList
        data={stones}
        renderItem={renderStoneCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textDim }]}>{t('marketplace.emptyMessage')}</Text>
          </View>
        }
      />

      {/* Pagination Controls */}
      {allStones.length > ITEMS_PER_PAGE && (
        <View style={[styles.paginationContainer, { backgroundColor: theme.backgroundCard, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.pageButton, { backgroundColor: theme.background }, currentPage === 1 && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Text style={[styles.pageButtonText, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>

          {Array.from({ length: Math.ceil(allStones.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
            .filter(page => {
              // Show first, last, current, and adjacent pages
              const totalPages = Math.ceil(allStones.length / ITEMS_PER_PAGE);
              return (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1
              );
            })
            .map((page, index, array) => {
              const prevPage = array[index - 1];
              const showEllipsis = prevPage && page - prevPage > 1;

              return (
                <React.Fragment key={page}>
                  {showEllipsis && (
                    <Text style={[styles.ellipsis, { color: theme.textDim }]}>...</Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.pageButton,
                      { backgroundColor: theme.background },
                      currentPage === page && [styles.pageButtonActive, { backgroundColor: theme.primary }]
                    ]}
                    onPress={() => setCurrentPage(page)}
                  >
                    <Text style={[
                      styles.pageButtonText,
                      { color: theme.textPrimary },
                      currentPage === page && styles.pageButtonTextActive
                    ]}>
                      {page}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}

          <TouchableOpacity
            style={[
              styles.pageButton,
              { backgroundColor: theme.background },
              currentPage === Math.ceil(allStones.length / ITEMS_PER_PAGE) && styles.pageButtonDisabled
            ]}
            onPress={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === Math.ceil(allStones.length / ITEMS_PER_PAGE)}
          >
            <Text style={[styles.pageButtonText, { color: theme.textPrimary }]}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {compareList.length > 0 && (
        <TouchableOpacity
          style={[styles.floatingCompareBadge, { backgroundColor: theme.success }]}
          onPress={() => (navigation as any).navigate('Compare')}
        >
          <Text style={styles.floatingCompareText}>⚖️ {compareList.length}</Text>
        </TouchableOpacity>
      )}

      <StoneDetailModal
        visible={modalVisible}
        stone={selectedStone}
        onClose={() => {
          setModalVisible(false);
          setSelectedStone(null);
        }}
      />

      <FilterSheet
        filters={filters}
        onApplyFilters={setFilters}
        ref={filterSheetRef}
      />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 20,
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
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stoneId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  favoriteButton: {
    padding: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  availabilityAvailable: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  availabilityReserved: {
    backgroundColor: '#fff3e0',
    color: '#f57c00',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  floatingCompareBadge: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#34C759',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingCompareText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 6,
  },
  pageButton: {
    minWidth: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
  },
  pageButtonActive: {
    backgroundColor: '#007AFF',
  },
  pageButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  pageButtonTextActive: {
    color: 'white',
  },
  ellipsis: {
    fontSize: 11,
    color: '#999',
    paddingHorizontal: 4,
  },
});
