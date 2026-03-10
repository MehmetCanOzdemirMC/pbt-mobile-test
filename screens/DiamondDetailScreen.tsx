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
  Modal,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../stores/cartStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import ImageViewing from 'react-native-image-viewing';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { fetchJtrMedia } from '../services/jtrService';
import { trackViewItem, trackAddToCart } from '../services/analyticsService';

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
  certificateUrl?: string;
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
  // Media fields
  video?: string;
  image?: string;
  JTRCertificateNo?: string;
  reportNo?: string;
}

interface MediaData {
  type: 'iframe' | 'image' | 'none';
  url: string;
}

export default function DiamondDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { stoneId } = route.params as { stoneId: string };

  const [stone, setStone] = useState<Stone | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [mediaData, setMediaData] = useState<MediaData>({ type: 'none', url: '' });
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  const { addToCart, isInCart } = useCartStore();
  const inCart = stone ? isInCart(stone.id) : false;

  useEffect(() => {
    loadStoneDetails();
  }, [stoneId]);

  // Load media (video/360°/image) when stone is loaded
  useEffect(() => {
    const loadMedia = async () => {
      if (!stone) return;

      setIsLoadingMedia(true);

      // Priority 1: Check CSV-uploaded video/image links first
      if (stone.video) {
        console.log('✅ Using CSV video link:', stone.video);
        setMediaData({ type: 'iframe', url: stone.video });
        setIsLoadingMedia(false);
        return;
      }

      if (stone.image) {
        console.log('✅ Using CSV image link:', stone.image);
        setMediaData({ type: 'image', url: stone.image });
        setIsLoadingMedia(false);
        return;
      }

      // Priority 2: JTR API (if no CSV media)
      const certNo = stone.JTRCertificateNo || stone.certificateNumber || stone.reportNo;

      if (certNo) {
        try {
          const apiResponse = await fetchJtrMedia([certNo]);
          const diamondMedia = apiResponse[certNo];

          // If Jtr360SmCdn exists, use Jtr360Cdn (HD version) for detail screen
          if (diamondMedia && diamondMedia.Jtr360SmCdn) {
            // Use Jtr360Cdn if available, otherwise fallback to Jtr360SmCdn
            const hdUrl = diamondMedia.Jtr360Cdn || diamondMedia.Jtr360SmCdn;
            console.log('✅ Using HD 360 view (Jtr360Cdn):', hdUrl);
            setMediaData({ type: 'iframe', url: hdUrl });
          }
          // StillImageUrl (image)
          else if (diamondMedia && diamondMedia.StillImageUrl) {
            console.log('✅ Using StillImageUrl (image)');
            setMediaData({ type: 'image', url: diamondMedia.StillImageUrl });
          }
          // No media from API - show default
          else {
            console.log('⚠️ No media from API, showing default');
            setMediaData({ type: 'none', url: '' });
          }
        } catch (error) {
          console.error('❌ Error loading JTR media:', error);
          // On error, show default
          setMediaData({ type: 'none', url: '' });
        }
      } else {
        // No certificate number - show default
        setMediaData({ type: 'none', url: '' });
      }

      setIsLoadingMedia(false);
    };

    loadMedia();
  }, [stone]);

  const loadStoneDetails = async () => {
    try {
      setLoading(true);
      const stoneDoc = await getDoc(doc(db, 'stones', stoneId));

      if (stoneDoc.exists()) {
        const data = stoneDoc.data();

        // Use 'status' field from Firestore, default to 'available' (same logic as marketplaceStore)
        const status = data.status || 'available';

        const stoneData = {
          id: stoneDoc.id,
          ...data,
          availability: status, // Use 'status' field, ignore 'availability' field
        };

        console.log('📊 Stone loaded:', stoneId, 'Status:', status);

        setStone(stoneData as Stone);

        // Track product view in analytics
        trackViewItem({
          item_id: stoneDoc.id,
          item_name: `${data.shape} ${data.carat}ct ${data.color} ${data.clarity}`,
          item_category: 'Diamond',
          price: data.totalPrice || data.pricePerCarat * data.carat,
          currency: 'USD',
        });
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
        supplierId: stone.supplier || '',
        supplierName: stone.supplierName,
        addedAt: Date.now(),
      });
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!stone) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Taş bulunamadı</Text>
      </View>
    );
  }

  const hasDiscount = stone.availability === 'available';
  const displayPrice = stone.totalPrice;
  const displayPricePerCarat = stone.pricePerCarat;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Media Viewer (Video/360°/Image) */}
        <View style={[styles.mediaContainer, { backgroundColor: theme.backgroundCard }]}>
          {isLoadingMedia ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Medya yükleniyor...</Text>
            </View>
          ) : mediaData.type === 'iframe' ? (
            <WebView
              source={{ uri: mediaData.url }}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              )}
              allowsFullscreenVideo={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          ) : mediaData.type === 'image' ? (
            <TouchableOpacity
              onPress={() => setImageViewerVisible(true)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: mediaData.url }}
                style={styles.image}
                resizeMode="contain"
              />
              <View style={styles.zoomHint}>
                <Text style={styles.zoomHintText}>🔍 Yakınlaştırmak için tıkla</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: theme.backgroundCard }]}>
              <Text style={styles.placeholderText}>💎</Text>
              <Text style={[styles.placeholderSubtext, { color: theme.textDim }]}>Medya Yok</Text>
            </View>
          )}
        </View>

        {/* Stone ID & Status */}
        <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.stoneId, { color: theme.textPrimary }]}>{stone.stoneId}</Text>
          <View style={[
            styles.statusBadge,
            (stone.availability === 'available' || stone.availability === 'inCart') && styles.statusAvailable,
            stone.availability === 'reserved' && styles.statusReserved,
            stone.availability === 'sold' && styles.statusSold,
          ]}>
            <Text style={styles.statusText}>
              {(stone.availability === 'available' || stone.availability === 'inCart') ? 'Mevcut' :
               stone.availability === 'reserved' ? 'Rezerve' : 'Satıldı'}
            </Text>
          </View>
        </View>

        {/* Main Specs */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Ana Özellikler</Text>
          <View style={styles.specsGrid}>
            <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Şekil</Text>
              <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.shape}</Text>
            </View>
            <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Karat</Text>
              <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.carat} CT</Text>
            </View>
            <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Renk</Text>
              <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.color}</Text>
            </View>
            <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Saflık</Text>
              <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.clarity}</Text>
            </View>
            {stone.cut && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Kesim</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.cut}</Text>
              </View>
            )}
            {stone.polish && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Cila</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.polish}</Text>
              </View>
            )}
            {stone.symmetry && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Simetri</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.symmetry}</Text>
              </View>
            )}
            {stone.fluorescence && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Floresans</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.fluorescence}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Certification */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Sertifika</Text>
          <View style={[styles.certBox, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[styles.certLab, { color: theme.textPrimary }]}>{stone.certification}</Text>
            {stone.certificateNumber && (
              <Text style={[styles.certNumber, { color: theme.textSecondary }]}>{stone.certificateNumber}</Text>
            )}
            {stone.certificateUrl && (
              <TouchableOpacity
                style={[styles.viewCertButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  if (stone.certificateUrl?.startsWith('http')) {
                    setPdfViewerVisible(true);
                  } else {
                    Alert.alert('Bilgi', 'Sertifika URL\'i geçersiz');
                  }
                }}
              >
                <Text style={styles.viewCertButtonText}>📄 Sertifikayı Görüntüle</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Measurements */}
        {stone.measurements && (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Ölçüler</Text>
            <Text style={[styles.measurements, { color: theme.textSecondary }]}>{stone.measurements}</Text>
          </View>
        )}

        {/* Supplier */}
        {stone.supplierName && (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Tedarikçi</Text>
            <Text style={[styles.supplierName, { color: theme.primary }]}>{stone.supplierName}</Text>
          </View>
        )}

        {/* Description */}
        {stone.description && (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Açıklama</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>{stone.description}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Price & Add to Cart */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: theme.borderLight, backgroundColor: theme.backgroundCard }]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Toplam Fiyat</Text>
          <Text style={[styles.priceValue, { color: theme.textPrimary }]}>${displayPrice.toLocaleString()}</Text>
          <Text style={[styles.pricePerCarat, { color: theme.textDim }]}>${displayPricePerCarat.toLocaleString()}/CT</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: theme.primary },
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

      {/* Full Screen Image Viewer */}
      {mediaData.type === 'image' && mediaData.url && (
        <ImageViewing
          images={[{ uri: mediaData.url }]}
          imageIndex={0}
          visible={imageViewerVisible}
          onRequestClose={() => setImageViewerVisible(false)}
        />
      )}

      {/* PDF Certificate Viewer */}
      {stone.certificateUrl && (
        <Modal
          visible={pdfViewerVisible}
          animationType="slide"
          onRequestClose={() => setPdfViewerVisible(false)}
        >
          <View style={[styles.pdfModalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.pdfModalHeader, { borderBottomColor: theme.border, backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.pdfModalTitle, { color: theme.textPrimary }]}>Sertifika</Text>
              <TouchableOpacity
                style={[styles.pdfCloseButton, { backgroundColor: theme.background }]}
                onPress={() => setPdfViewerVisible(false)}
              >
                <Text style={[styles.pdfCloseButtonText, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <WebView
              source={{ uri: stone.certificateUrl }}
              style={styles.pdfWebView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={[styles.pdfLoadingContainer, { backgroundColor: theme.background }]}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.pdfLoadingText, { color: theme.textSecondary }]}>Sertifika yükleniyor...</Text>
                </View>
              )}
            />
            <TouchableOpacity
              style={[styles.pdfOpenBrowserButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (stone.certificateUrl) {
                  Linking.openURL(stone.certificateUrl);
                }
              }}
            >
              <Text style={styles.pdfOpenBrowserButtonText}>
                🌐 Tarayıcıda Aç
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
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
  mediaContainer: {
    width: width,
    height: width,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  webView: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  zoomHint: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zoomHintText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
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
    marginBottom: 12,
  },
  viewCertButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  viewCertButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  pdfModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  pdfModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pdfCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  pdfCloseButtonText: {
    fontSize: 20,
    color: '#666',
  },
  pdfWebView: {
    flex: 1,
  },
  pdfLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  pdfLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  pdfOpenBrowserButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  pdfOpenBrowserButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
