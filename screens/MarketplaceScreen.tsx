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
  status: string;
  supplierId: string;
  supplierName?: string;
}

export default function MarketplaceScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [stones, setStones] = useState<Stone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStone, setSelectedStone] = useState<Stone | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    shape: [],
    caratMin: '',
    caratMax: '',
    color: [],
    clarity: [],
    sortBy: 'date_desc',
  });

  const filterSheetRef = useRef<FilterSheetRef>(null);
  const { addToCart, totalItems, loadCart } = useCartStore();

  useEffect(() => {
    loadStones();
    loadCart();
  }, [filters, searchQuery]);

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

      // Limit
      constraints.push(limit(200));

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
          status: data.status || 'available',
          supplierId: data.supplierId || '',
          supplierName: data.supplierName,
        });
      });

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

      setStones(stonesData);
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
    if (stone.status !== 'available') {
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

  const renderStoneCard = ({ item }: { item: Stone }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleStonePress(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.stoneId}>💎 {item.stoneId}</Text>
        <Text style={[
          styles.statusBadge,
          item.status === 'available' ? styles.statusAvailable : styles.statusReserved
        ]}>
          {item.status === 'available' ? '✓ Mevcut' : '⏳ Rezerve'}
        </Text>
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
          item.status !== 'available' && styles.addToCartButtonDisabled
        ]}
        onPress={() => handleAddToCart(item)}
        disabled={Boolean(item.status !== 'available')}
      >
        <Text style={styles.addToCartButtonText}>
          {item.status === 'available' ? '🛒 Sepete Ekle' : '⏳ Müsait Değil'}
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
        <Text style={styles.statsText}>📊 {stones.length} Taş</Text>
        <Text style={styles.statsText}>
          ✓ {stones.filter(s => s.status === 'available').length} Mevcut
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

      {totalItems() > 0 && (
        <TouchableOpacity
          style={styles.floatingCartBadge}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.floatingCartText}>🛒 {totalItems()}</Text>
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
  stoneId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusAvailable: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  statusReserved: {
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
});
