/**
 * Mountings List Screen
 * Displays available mountings (jewelry bases)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

// Mock mountings data (will be replaced with Firestore data)
const MOCK_MOUNTINGS = [
  {
    id: '1',
    name: 'Solitaire Ring',
    category: 'ring',
    basePrice: 500,
    description: 'Classic single stone ring design',
    image: null,
  },
  {
    id: '2',
    name: 'Halo Ring',
    category: 'ring',
    basePrice: 800,
    description: 'Ring with surrounding diamond halo',
    image: null,
  },
  {
    id: '3',
    name: 'Three-Stone Ring',
    category: 'ring',
    basePrice: 1200,
    description: 'Past, present, future design',
    image: null,
  },
  {
    id: '4',
    name: 'Pendant Necklace',
    category: 'necklace',
    basePrice: 400,
    description: 'Elegant pendant setting',
    image: null,
  },
  {
    id: '5',
    name: 'Tennis Bracelet',
    category: 'bracelet',
    basePrice: 1500,
    description: 'Continuous line of stones',
    image: null,
  },
];

const CATEGORY_ICONS: any = {
  ring: '💍',
  necklace: '📿',
  bracelet: '💎',
  earring: '👂',
};

export default function MountingsListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mountings, setMountings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ['ring', 'necklace', 'bracelet'];

  // Fetch mountings from Firestore
  useEffect(() => {
    // SIMPLIFIED QUERY: Remove where/orderBy to avoid composite index requirement
    // This will fetch ALL mountings from Firestore
    const mountingsQuery = query(
      collection(db, 'mountings')
      // Removed: where('isActive', '==', true) - requires composite index with orderBy
      // Removed: orderBy('createdAt', 'desc') - requires composite index
      // We'll filter and sort client-side instead
    );

    console.log('[MountingsListScreen] Starting Firestore listener...');

    const unsubscribe = onSnapshot(
      mountingsQuery,
      (snapshot) => {
        console.log(`[MountingsListScreen] Received ${snapshot.docs.length} mountings from Firestore`);

        const mountingsData = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            console.log(`[MountingsListScreen] Mounting ${doc.id}:`, {
              name: data.name,
              category: data.category,
              basePrice: data.basePrice,
              isActive: data.isActive,
              status: data.status,
            });
            return {
              id: doc.id,
              ...data,
            };
          })
          // Client-side filtering: Only show active mountings
          .filter((m) => m.isActive === true || m.status === 'available')
          // Client-side sorting: Newest first (if createdAt exists)
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return b.createdAt?.seconds - a.createdAt?.seconds;
          });

        console.log(`[MountingsListScreen] After filtering: ${mountingsData.length} active mountings`);

        // If no data from Firestore, use mock data
        if (mountingsData.length > 0) {
          console.log('[MountingsListScreen] Using Firestore data');
          setMountings(mountingsData);
        } else {
          console.log('[MountingsListScreen] No Firestore data, using MOCK_MOUNTINGS');
          setMountings(MOCK_MOUNTINGS);
        }
        setLoading(false);
      },
      (error) => {
        console.error('[MountingsListScreen] Error fetching mountings:', error);
        console.error('[MountingsListScreen] Error details:', {
          code: error.code,
          message: error.message,
          name: error.name,
        });
        // Fallback to mock data on error
        setMountings(MOCK_MOUNTINGS);
        setLoading(false);
      }
    );

    return () => {
      console.log('[MountingsListScreen] Cleaning up Firestore listener');
      unsubscribe();
    };
  }, []);

  const filteredMountings = selectedCategory
    ? mountings.filter((m) => m.category === selectedCategory)
    : mountings;

  const handleMountingPress = (mounting: any) => {
    // Navigate to Mounting Detail screen (with 3D viewer)
    navigation.navigate('MountingDetail', { mounting });
  };

  const renderMounting = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.backgroundCard }]}
      onPress={() => handleMountingPress(item)}
    >
      {/* Mounting Image or Icon */}
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]}>
          <Text style={styles.categoryIcon}>
            {CATEGORY_ICONS[item.category] || '💎'}
          </Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.textPrimary }]}>
          {item.name}
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.primary }]}>
            ${item.basePrice}
          </Text>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
            {t('mountings.basePrice')}
          </Text>
        </View>
      </View>

      <ArrowRight size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.backgroundCard }]}>
          <Sparkles size={24} color={theme.primary} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {t('mountings.customMountings')}
          </Text>
        </View>

        {/* Category Filter */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedCategory ? theme.primary : theme.backgroundCard,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.filterText,
                { color: !selectedCategory ? '#fff' : theme.textPrimary },
              ]}
            >
              {t('mountings.all')}
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedCategory === cat ? theme.primary : theme.backgroundCard,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: selectedCategory === cat ? '#fff' : theme.textPrimary },
                ]}
              >
                {t(`mountings.${cat}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mountings List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              {t('mountings.loading')}
            </Text>
          </View>
        ) : filteredMountings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t('mountings.noMountings')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredMountings}
            renderItem={renderMounting}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: 16 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  priceLabel: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
