import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useCartStore } from '../stores/cartStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width } = Dimensions.get('window');

interface Stone {
  id: string;
  stoneId: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  cut?: string;
  polish?: string;
  symmetry?: string;
  fluorescence?: string;
  certification: string;
  certificateNumber?: string;
  pricePerCarat: number;
  totalPrice: number;
  availability: string;
  supplier?: string;
  supplierName?: string;
  description?: string;
  measurements?: string;
  depth?: number;
  table?: number;
  images?: string[];
}

export default function DiamondDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { stoneId } = route.params as { stoneId: string };

  const [stone, setStone] = useState<Stone | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);

  const { addToCart, isInCart } = useCartStore();
  const inCart = stone ? isInCart(stone.id) : false;

  useEffect(() => {
    loadStoneDetails();
  }, [stoneId]);

  const loadStoneDetails = async () => {
    try {
      setLoading(true);
      const stoneDoc = await getDoc(doc(db, 'stones', stoneId));

      if (stoneDoc.exists()) {
        setStone({ id: stoneDoc.id, ...stoneDoc.data() } as Stone);
      } else {
        Alert.alert('Hata', 'Taş bulunamadı');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading stone:', error);
      Alert.alert('Hata', 'Taş yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!stone) return;

    try {
      if (inCart) {
        Alert.alert('Bilgi', 'Bu taş zaten sepetinizde');
        return;
      }

      await addToCart(stone);
      Alert.alert('Başarılı', 'Taş sepete eklendi', [
        { text: 'Sepete Git', onPress: () => navigation.navigate('Cart' as never) },
        { text: 'Tamam', style: 'cancel' },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Sepete eklenirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!stone) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Taş bulunamadı</Text>
      </View>
    );
  }

  const hasDiscount = stone.availability === 'available';
  const displayPrice = stone.totalPrice;
  const displayPricePerCarat = stone.pricePerCarat;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {stone.images && stone.images.length > 0 ? (
            <>
              <Image
                source={{ uri: stone.images[imageIndex] }}
                style={styles.image}
                resizeMode="contain"
              />
              {stone.images.length > 1 && (
                <View style={styles.imageDots}>
                  {stone.images.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dot,
                        imageIndex === index && styles.dotActive,
                      ]}
                      onPress={() => setImageIndex(index)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>💎</Text>
              <Text style={styles.placeholderSubtext}>Görsel Yok</Text>
            </View>
          )}
        </View>

        {/* Stone ID & Status */}
        <View style={styles.header}>
          <Text style={styles.stoneId}>{stone.stoneId}</Text>
          <View style={[
            styles.statusBadge,
            stone.availability === 'available' && styles.statusAvailable,
            stone.availability === 'reserved' && styles.statusReserved,
            stone.availability === 'sold' && styles.statusSold,
          ]}>
            <Text style={styles.statusText}>
              {stone.availability === 'available' ? 'Mevcut' :
               stone.availability === 'reserved' ? 'Rezerve' : 'Satıldı'}
            </Text>
          </View>
        </View>

        {/* Main Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ana Özellikler</Text>
          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Şekil</Text>
              <Text style={styles.specValue}>{stone.shape}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Karat</Text>
              <Text style={styles.specValue}>{stone.carat} CT</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Renk</Text>
              <Text style={styles.specValue}>{stone.color}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Saflık</Text>
              <Text style={styles.specValue}>{stone.clarity}</Text>
            </View>
            {stone.cut && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Kesim</Text>
                <Text style={styles.specValue}>{stone.cut}</Text>
              </View>
            )}
            {stone.polish && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Cila</Text>
                <Text style={styles.specValue}>{stone.polish}</Text>
              </View>
            )}
            {stone.symmetry && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Simetri</Text>
                <Text style={styles.specValue}>{stone.symmetry}</Text>
              </View>
            )}
            {stone.fluorescence && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Floresans</Text>
                <Text style={styles.specValue}>{stone.fluorescence}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Certification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sertifika</Text>
          <View style={styles.certBox}>
            <Text style={styles.certLab}>{stone.certification}</Text>
            {stone.certificateNumber && (
              <Text style={styles.certNumber}>{stone.certificateNumber}</Text>
            )}
          </View>
        </View>

        {/* Measurements */}
        {stone.measurements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ölçüler</Text>
            <Text style={styles.measurements}>{stone.measurements}</Text>
          </View>
        )}

        {/* Supplier */}
        {stone.supplierName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tedarikçi</Text>
            <Text style={styles.supplierName}>{stone.supplierName}</Text>
          </View>
        )}

        {/* Description */}
        {stone.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.description}>{stone.description}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Price & Add to Cart */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Toplam Fiyat</Text>
          <Text style={styles.priceValue}>${displayPrice.toLocaleString()}</Text>
          <Text style={styles.pricePerCarat}>${displayPricePerCarat.toLocaleString()}/CT</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            (stone.availability !== 'available' || inCart) && styles.addButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={stone.availability !== 'available' || inCart}
        >
          <Text style={styles.addButtonText}>
            {inCart ? '✓ Sepette' : stone.availability !== 'available' ? 'Mevcut Değil' : 'Sepete Ekle'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: width,
    height: width,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  placeholderText: {
    fontSize: 80,
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#999',
  },
  imageDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stoneId: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: '#4CAF50',
  },
  statusReserved: {
    backgroundColor: '#FF9800',
  },
  statusSold: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specItem: {
    width: '47%',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  specLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  certBox: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  certLab: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  certNumber: {
    fontSize: 14,
    color: '#666',
  },
  measurements: {
    fontSize: 14,
    color: '#666',
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 12,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  pricePerCarat: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
