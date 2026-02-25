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
import { collection, query, limit, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCartStore } from '../stores/cartStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useCompareStore } from '../stores/compareStore';
import StoneDetailModal from '../components/StoneDetailModal';
import FilterSheet, { Filters, FilterSheetRef } from '../components/FilterSheet';

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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [allStones, setAllStones] = useState<Stone[]>([]); // Tüm taşlar
  const [stones, setStones] = useState<Stone[]>([]); // Gösterilen taşlar
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadStones();
    loadCart();
    loadFavorites();
  }, [filters, searchQuery]);

  useEffect(() => {
    // Sayfa değiştiğinde gösterilen taşları güncelle
    paginateStones();
  }, [currentPage, allStones]);

  const paginateStones = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setStones(allStones.slice(startIndex, endIndex));
  };

  const loadStones = async () => {
    try {
      setLoading(true);
      const stonesRef = collection(db, 'stones');

      // Build query constraints
      const constraints: any[] = [];

      // Shape filter
      if (filters.shape.length > 0) {
        constraints.push(where('shape', 'in', filters.shape));
      }

      // Color filter
      if (filters.color.length > 0) {
        constraints.push(where('color', 'in', filters.color));
      }

      // Clarity filter
      if (filters.clarity.length > 0) {
        constraints.push(where('clarity', 'in', filters.clarity));
      }

      // Sort order
      const sortField = filters.sortBy.includes('price') ? 'totalPrice' :
                       filters.sortBy.includes('carat') ? 'carat' : 'createdAt';
      const sortDirection = filters.sortBy.includes('desc') ? 'desc' : 'asc';
      constraints.push(orderBy(sortField, sortDirection));

      // Limit - artık daha fazla taş getiriyoruz
      constraints.push(limit(1000));

      const q = query(stonesRef, ...constraints);
      const snapshot = await getDocs(q);
      let stonesData: Stone[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        stonesData.push({
          id: doc.id,
          stoneId: data.stoneId || data.stockId || 'N/A',
          carat: data.carat || 0,
          shape: data.shape || 'Unknown',
          color: data.color || 'N/A',
          clarity: data.clarity || 'N/A',
          cut: data.cut,
          polish: data.polish,
          symmetry: data.symmetry,
          totalPrice: data.totalPrice || data.price || 0,
          pricePerCarat: data.pricePerCarat || 0,
          availability: data.availability || data.availability || 'available',
          supplierId: data.supplierId || '',
          supplierName: data.supplierName,
        });
      });

      // Filter out reserved stones
      stonesData = stonesData.filter(s => s.availability !== 'reserved');

      // Client-side filters (for carat range and search)
      if (filters.caratMin) {
        const minCarat = parseFloat(filters.caratMin);
        stonesData = stonesData.filter(s => s.carat >= minCarat);
      }

      if (filters.caratMax) {
        const maxCarat = parseFloat(filters.caratMax);
        stonesData = stonesData.filter(s => s.carat <= maxCarat);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        stonesData = stonesData.filter(s =>
          s.stoneId.toLowerCase().includes(query) ||
          s.supplierName?.toLowerCase().includes(query)
        );
      }

      setAllStones(stonesData);
      setCurrentPage(1); // Reset to first page when data changes
    } catch (error) {
      console.error('Error loading stones:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStones();
    setRefreshing(false);
  };

  const handleStonePress = (stone: Stone) => {
    // Navigate to DiamondDetail screen
    (navigation as any).navigate('DiamondDetail', { stoneId: stone.id });
  };

  const handleAddToCart = async (stone: Stone) => {
    if (stone.availability !== 'available') {
      Alert.alert('Uyarı', 'Bu taş müsait değil');
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
      Alert.alert('Başarılı', 'Taş sepete eklendi');
    } catch (error) {
      Alert.alert('Hata', 'Sepete eklenirken bir hata oluştu');
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
      Alert.alert('Hata', 'Favori işlemi başarısız');
    }
  };

  const renderStoneCard = ({ item }: { item: Stone }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleStonePress(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.stoneId}>💎 {item.stoneId}</Text>
        <View style={styles.cardHeaderRight}>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleToggleFavorite(item)}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorite(item.id) ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
          <Text style={[
            styles.availabilityBadge,
            item.availability === 'available' ? styles.availabilityAvailable : styles.availabilityReserved
          ]}>
            {item.availability === 'available' ? '✓ Mevcut' : '⏳ Rezerve'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
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

        {item.cut && (
          <View style={styles.row}>
            <Text style={styles.label}>Kesim:</Text>
            <Text style={styles.value}>{item.cut}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.priceLabel}>Toplam Fiyat</Text>
          <Text style={styles.price}>${item.totalPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.pricePerCaratContainer}>
          <Text style={styles.pricePerCaratLabel}>$/CT</Text>
          <Text style={styles.pricePerCarat}>${item.pricePerCarat.toLocaleString()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addToCartButton,
          item.availability !== 'available' && styles.addToCartButtonDisabled
        ]}
        onPress={() => handleAddToCart(item)}
        disabled={Boolean(item.availability !== 'available')}
      >
        <Text style={styles.addToCartButtonText}>
          {item.availability === 'available' ? '🛒 Sepete Ekle' : '⏳ Müsait Değil'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Taşlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Stock ID veya Tedarikçi Ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => filterSheetRef.current?.open()}
        >
          <Text style={styles.filterButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          📊 Toplam {allStones.length} Taş ({stones.length} gösteriliyor)
        </Text>
        <Text style={styles.statsText}>
          ✓ {allStones.filter(s => s.availability === 'available').length} Mevcut
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
            <Text style={styles.emptyText}>Henüz taş bulunmuyor</Text>
          </View>
        }
      />

      {/* Pagination Controls */}
      {allStones.length > ITEMS_PER_PAGE && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Text style={styles.pageButtonText}>←</Text>
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
                    <Text style={styles.ellipsis}>...</Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.pageButton,
                      currentPage === page && styles.pageButtonActive
                    ]}
                    onPress={() => setCurrentPage(page)}
                  >
                    <Text style={[
                      styles.pageButtonText,
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
              currentPage === Math.ceil(allStones.length / ITEMS_PER_PAGE) && styles.pageButtonDisabled
            ]}
            onPress={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === Math.ceil(allStones.length / ITEMS_PER_PAGE)}
          >
            <Text style={styles.pageButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {totalItems() > 0 && (
        <TouchableOpacity
          style={styles.floatingCartBadge}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.floatingCartText}>🛒 {totalItems()}</Text>
        </TouchableOpacity>
      )}

      {compareList.length > 0 && (
        <TouchableOpacity
          style={styles.floatingCompareBadge}
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
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  availabilityBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
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
  floatingCartBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingCartText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  pageButton: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
  },
  pageButtonActive: {
    backgroundColor: '#007AFF',
  },
  pageButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pageButtonTextActive: {
    color: 'white',
  },
  ellipsis: {
    fontSize: 16,
    color: '#999',
    paddingHorizontal: 4,
  },
});
