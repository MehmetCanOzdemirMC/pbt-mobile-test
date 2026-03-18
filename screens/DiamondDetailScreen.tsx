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
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../stores/cartStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
// ImageViewing removed - using built-in Modal instead
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { fetchJtrMedia } from '../services/jtrService';
import { trackViewItem, trackAddToCart, trackScreenView } from '../services/analyticsService';
import { useTranslation } from 'react-i18next';

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
  // Basic fields (from web)
  lab?: string;
  pbStockCode?: string;
  customerRef?: string;
  inclusion?: string;
  keyToSymbol?: string;
  // Advanced fields
  milky?: string;
  eyeClean?: string;
  colorShade?: string;
  depthPercent?: number;
  tablePercent?: number;
  girdle?: string;
  // Advanced Gemology - Inclusion Details
  blackTable?: string;
  blackCrown?: string;
  whiteTable?: string;
  whiteCrown?: string;
  openTable?: string;
  openPavilion?: string;
  openCrown?: string;
  luster?: string;
  heartAndArrow?: string;
  // Advanced Gemology - Technical Measurements
  crownAngle?: number;
  crownHeight?: number;
  pavilionAngle?: number;
  pavilionHeight?: number;
  culet?: string;
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
  const { t } = useTranslation();
  const { stoneId } = route.params as { stoneId: string };

  const [stone, setStone] = useState<Stone | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [mediaData, setMediaData] = useState<MediaData>({ type: 'none', url: '' });
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showAdvancedGemology, setShowAdvancedGemology] = useState(false);

  const { addToCart, isInCart } = useCartStore();
  const inCart = stone ? isInCart(stone.id) : false;

  useEffect(() => {
    loadStoneDetails();
  }, [stoneId]);

  // Track screen view
  useFocusEffect(
    React.useCallback(() => {
      trackScreenView('Diamond Detail', 'DiamondDetailScreen');
    }, [])
  );

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
        Alert.alert(t('common.error'), t('stoneDetail.loadingError'));
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading stone:', error);
      Alert.alert(t('common.error'), t('stoneDetail.loadingMediaError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!stone) return;

    try {
      if (inCart) {
        Alert.alert(t('common.success'), t('stoneDetail.alreadyInCart'));
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

      // Track add to cart in analytics
      trackAddToCart({
        item_id: stone.id,
        item_name: `${stone.shape} ${stone.carat}ct ${stone.color} ${stone.clarity}`,
        item_category: 'Diamond',
        price: stone.totalPrice,
        quantity: 1,
        currency: 'USD',
      });

      Alert.alert(t('common.success'), t('stoneDetail.addToCartSuccess'), [
        { text: t('stoneDetail.goToCart'), onPress: () => navigation.navigate('Cart' as never) },
        { text: t('common.confirm'), style: 'cancel' },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('stoneDetail.addToCartError'));
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('stoneDetail.loading')}</Text>
      </View>
    );
  }

  if (!stone) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('stoneDetail.loadingError')}</Text>
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
            <View style={styles.mediaLoadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={[styles.mediaLoadingText, { color: theme.textSecondary }]}>{t('stoneDetail.loadingMedia')}</Text>
            </View>
          ) : mediaData.type === 'iframe' ? (
            <WebView
              source={{ uri: mediaData.url }}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.mediaLoadingContainer}>
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
                <Text style={styles.zoomHintText}>🔍 {t('stoneDetail.zoomToView')}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: theme.backgroundCard }]}>
              <Text style={styles.placeholderText}>💎</Text>
              <Text style={[styles.placeholderSubtext, { color: theme.textDim }]}>{t('stoneDetail.noMedia')}</Text>
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
              {(stone.availability === 'available' || stone.availability === 'inCart') ? t('stoneDetail.available') :
               stone.availability === 'reserved' ? t('stoneDetail.reserved') : t('stoneDetail.sold')}
            </Text>
          </View>
        </View>

        {/* Main Specs */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetail.mainFeatures')}</Text>
          <View style={styles.specsGrid}>
            <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.specLabel, { color: theme.textSecondary }]}>{t('stoneDetail.shape')}</Text>
              <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.shape}</Text>
            </View>
            <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.specLabel, { color: theme.textSecondary }]}>{t('marketplace.carat')}</Text>
              <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.carat} CT</Text>
            </View>
            <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.specLabel, { color: theme.textSecondary }]}>{t('stoneDetail.color')}</Text>
              <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.color}</Text>
            </View>
            <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.specLabel, { color: theme.textSecondary }]}>{t('stoneDetail.clarity')}</Text>
              <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.clarity}</Text>
            </View>
            {stone.cut && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>{t('stoneDetail.cut')}</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.cut}</Text>
              </View>
            )}
            {stone.polish && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>{t('stoneDetail.polish')}</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.polish}</Text>
              </View>
            )}
            {stone.symmetry && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>{t('stoneDetail.symmetry')}</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.symmetry}</Text>
              </View>
            )}
            {stone.fluorescence && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>{t('stoneDetail.fluorescence')}</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.fluorescence}</Text>
              </View>
            )}
            {(stone.lab || stone.certification) && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Lab</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.lab || stone.certification}</Text>
              </View>
            )}
            {stone.pbStockCode && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>PB Stock Code</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.pbStockCode}</Text>
              </View>
            )}
            {(stone.stoneId || stone.customerRef) && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Supplier Stone ID</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.stoneId || stone.customerRef}</Text>
              </View>
            )}
            {(stone.inclusion || stone.keyToSymbol) && (
              <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Inclusion</Text>
                <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.inclusion || stone.keyToSymbol}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Certification */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetail.certificateTitle')}</Text>
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
                    Alert.alert(t('common.success'), t('stoneDetail.invalidCertUrl'));
                  }
                }}
              >
                <Text style={styles.viewCertButtonText}>📄 {t('stoneDetail.viewCertificate')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* More Details Toggle Button */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <TouchableOpacity
            style={[styles.toggleButton, { borderColor: theme.primary + '40' }]}
            onPress={() => setShowMoreDetails(!showMoreDetails)}
          >
            <Text style={[styles.toggleButtonText, { color: theme.primary }]}>
              {showMoreDetails ? '▲ Show Less' : '▼ More Details'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Advanced Fields (More Details Expanded) */}
        {showMoreDetails && (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Advanced Details</Text>
            <View style={styles.specsGrid}>
              {stone.milky && (
                <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                  <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Milky</Text>
                  <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.milky}</Text>
                </View>
              )}
              {stone.eyeClean && (
                <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                  <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Eye Clean</Text>
                  <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.eyeClean}</Text>
                </View>
              )}
              {stone.colorShade && (
                <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                  <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Color Shade</Text>
                  <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.colorShade}</Text>
                </View>
              )}
              {stone.depthPercent && (
                <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                  <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Depth %</Text>
                  <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.depthPercent}%</Text>
                </View>
              )}
              {stone.tablePercent && (
                <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                  <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Table %</Text>
                  <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.tablePercent}%</Text>
                </View>
              )}
              {stone.girdle && (
                <View style={[styles.specItem, { backgroundColor: theme.backgroundCard }]}>
                  <Text style={[styles.specLabel, { color: theme.textSecondary }]}>Girdle</Text>
                  <Text style={[styles.specValue, { color: theme.textPrimary }]}>{stone.girdle}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Measurements */}
        {stone.measurements && (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetail.measurements')}</Text>
            <Text style={[styles.measurements, { color: theme.textSecondary }]}>{stone.measurements}</Text>
          </View>
        )}

        {/* Supplier */}
        {stone.supplierName && (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetail.supplier')}</Text>
            <Text style={[styles.supplierName, { color: theme.primary }]}>{stone.supplierName}</Text>
          </View>
        )}

        {/* Description */}
        {stone.description && (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetail.description')}</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>{stone.description}</Text>
          </View>
        )}

        {/* Advanced Gemology Toggle Button */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <TouchableOpacity
            style={[styles.toggleButton, styles.advancedGemologyButton]}
            onPress={() => setShowAdvancedGemology(!showAdvancedGemology)}
          >
            <Text style={[styles.toggleButtonText, styles.advancedGemologyButtonText]}>
              {showAdvancedGemology ? '▲ Hide Gemology' : '▼ Advanced Gemology'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Advanced Gemology Panel */}
        {showAdvancedGemology && (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <View style={styles.advancedGemologyPanel}>
              {/* Inclusion Details */}
              <Text style={styles.gemologySubtitle}>Inclusion Details</Text>
              <View style={styles.gemologyGrid}>
                {stone.blackTable && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Black Table</Text>
                    <Text style={styles.gemologyValue}>{stone.blackTable}</Text>
                  </View>
                )}
                {stone.blackCrown && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Black Crown</Text>
                    <Text style={styles.gemologyValue}>{stone.blackCrown}</Text>
                  </View>
                )}
                {stone.whiteTable && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>White Table</Text>
                    <Text style={styles.gemologyValue}>{stone.whiteTable}</Text>
                  </View>
                )}
                {stone.whiteCrown && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>White Crown</Text>
                    <Text style={styles.gemologyValue}>{stone.whiteCrown}</Text>
                  </View>
                )}
                {stone.openTable && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Open Table</Text>
                    <Text style={styles.gemologyValue}>{stone.openTable}</Text>
                  </View>
                )}
                {stone.openPavilion && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Open Pavilion</Text>
                    <Text style={styles.gemologyValue}>{stone.openPavilion}</Text>
                  </View>
                )}
                {stone.openCrown && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Open Crown</Text>
                    <Text style={styles.gemologyValue}>{stone.openCrown}</Text>
                  </View>
                )}
                {stone.luster && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Luster</Text>
                    <Text style={styles.gemologyValue}>{stone.luster}</Text>
                  </View>
                )}
                {stone.heartAndArrow && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Heart & Arrow</Text>
                    <Text style={styles.gemologyValue}>{stone.heartAndArrow}</Text>
                  </View>
                )}
              </View>

              {/* Technical Measurements */}
              <Text style={[styles.gemologySubtitle, { marginTop: 20 }]}>Technical Measurements</Text>
              <View style={styles.gemologyGrid}>
                {stone.crownAngle && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Crown Angle</Text>
                    <Text style={styles.gemologyValue}>{stone.crownAngle}°</Text>
                  </View>
                )}
                {stone.crownHeight && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Crown Height</Text>
                    <Text style={styles.gemologyValue}>{stone.crownHeight}%</Text>
                  </View>
                )}
                {stone.pavilionAngle && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Pavilion Angle</Text>
                    <Text style={styles.gemologyValue}>{stone.pavilionAngle}°</Text>
                  </View>
                )}
                {stone.pavilionHeight && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Pavilion Height</Text>
                    <Text style={styles.gemologyValue}>{stone.pavilionHeight}%</Text>
                  </View>
                )}
                {stone.culet && (
                  <View style={styles.gemologyItem}>
                    <Text style={styles.gemologyLabel}>Culet</Text>
                    <Text style={styles.gemologyValue}>{stone.culet}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Price & Add to Cart */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: theme.borderLight, backgroundColor: theme.backgroundCard }]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('stoneDetail.totalPrice')}</Text>
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
            {inCart ? `✓ ${t('stoneDetail.inCart')}` : stone.availability !== 'available' ? t('stoneDetail.notAvailable') : t('stoneDetail.addToCart')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full Screen Image Viewer */}
      {mediaData.type === 'image' && mediaData.url && (
        <Modal
          visible={imageViewerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageViewerVisible(false)}
        >
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setImageViewerVisible(false)}
            >
              <Text style={styles.imageViewerCloseText}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: mediaData.url }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
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
              <Text style={[styles.pdfModalTitle, { color: theme.textPrimary }]}>{t('stoneDetail.certificateTitle')}</Text>
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
                  <Text style={[styles.pdfLoadingText, { color: theme.textSecondary }]}>{t('stoneDetail.loadingCertificate')}</Text>
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
                🌐 {t('stoneDetail.openInBrowser')}
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
  mediaLoadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  mediaLoadingText: {
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
  // Image Viewer Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  // Toggle Button Styles
  toggleButton: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 169, 234, 0.3)',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06a9ea',
  },
  advancedGemologyButton: {
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  advancedGemologyButtonText: {
    color: '#9333ea',
  },
  // Advanced Gemology Panel Styles
  advancedGemologyPanel: {
    backgroundColor: 'rgba(147, 51, 234, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  gemologySubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9333ea',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  gemologyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gemologyItem: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
  },
  gemologyLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  gemologyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});
