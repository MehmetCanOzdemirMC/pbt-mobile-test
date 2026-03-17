/**
 * Mounting Detail Screen
 * Displays 3D viewer and mounting details
 * Port from: web/src/components/custom-design/CustomizerView.jsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Sparkles, DollarSign, Info } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import IJewelWebView from '../components/custom-design/IJewelWebView';
import MetalColorPicker from '../components/custom-design/MetalColorPicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MountingDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { mounting } = route.params;

  // State
  const [selectedMetal, setSelectedMetal] = useState(
    mounting.defaultMetals?.[0] || mounting.availableMetals?.[0] || 'white_gold'
  );

  const handleSelectStone = () => {
    // Navigate to Custom Design wizard with this mounting pre-selected
    navigation.navigate('CustomDesign', {
      preSelectedMounting: mounting,
      preSelectedMetal: selectedMetal,
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header - Fixed */}
        <View style={[
          styles.header,
          {
            backgroundColor: theme.backgroundCard,
            borderBottomColor: theme.border,
            paddingTop: insets.top > 0 ? insets.top : 16
          }
        ]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Mounting Details
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 3D Viewer - Fixed (No Scroll) */}
        <View style={styles.viewerContainer}>
          <IJewelWebView
            iJewelUrl={mounting.iJewelUrl}
            modelUrl={mounting.modelFiles?.glb}
            selectedMetal={selectedMetal}
          />
        </View>

        {/* Scrollable Content - Only below 3D viewer */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: 150 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Metal Selector */}
          <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
            <MetalColorPicker
              selectedMetal={selectedMetal}
              availableMetals={mounting.availableMetals}
              onMetalChange={setSelectedMetal}
            />
          </View>

          {/* Mounting Info */}
          <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
            <View style={styles.infoHeader}>
              <Sparkles size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {mounting.name}
              </Text>
            </View>

            <Text style={[styles.category, { color: theme.textSecondary }]}>
              {mounting.category.charAt(0).toUpperCase() + mounting.category.slice(1)}
            </Text>

            {mounting.description && (
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {mounting.description}
              </Text>
            )}

            {/* Supplier Info */}
            {mounting.supplierName && (
              <View style={styles.supplierRow}>
                <Text style={[styles.supplierLabel, { color: theme.textSecondary }]}>
                  Supplier:
                </Text>
                <Text style={[styles.supplierName, { color: theme.textPrimary }]}>
                  {mounting.supplierName}
                </Text>
              </View>
            )}
          </View>

          {/* Pricing */}
          <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
            <View style={styles.infoHeader}>
              <DollarSign size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Pricing
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
                Base Price
              </Text>
              <Text style={[styles.priceValue, { color: theme.textPrimary }]}>
                ${mounting.basePrice}
              </Text>
            </View>

            {mounting.settingFee && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
                  Setting Fee
                </Text>
                <Text style={[styles.priceValue, { color: theme.textPrimary }]}>
                  ${mounting.settingFee}
                </Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.priceRow}>
              <Text style={[styles.totalLabel, { color: theme.textPrimary }]}>
                Mounting Total
              </Text>
              <Text style={[styles.totalValue, { color: theme.primary }]}>
                ${mounting.basePrice + (mounting.settingFee || 0)}
              </Text>
            </View>

            <View style={[styles.infoBox, { backgroundColor: theme.background }]}>
              <Info size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Final price will include the stone cost
              </Text>
            </View>
          </View>

          {/* Compatible Stones Info */}
          {mounting.compatibleStone && (
            <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Compatible Stones
              </Text>

              {mounting.compatibleStone.shapes && (
                <View style={styles.compatibleRow}>
                  <Text style={[styles.compatibleLabel, { color: theme.textSecondary }]}>
                    Shapes:
                  </Text>
                  <Text style={[styles.compatibleValue, { color: theme.textPrimary }]}>
                    {mounting.compatibleStone.shapes.join(', ')}
                  </Text>
                </View>
              )}

              {mounting.compatibleStone.caratRange && (
                <View style={styles.compatibleRow}>
                  <Text style={[styles.compatibleLabel, { color: theme.textSecondary }]}>
                    Carat Range:
                  </Text>
                  <Text style={[styles.compatibleValue, { color: theme.textPrimary }]}>
                    {mounting.compatibleStone.caratRange.min} - {mounting.compatibleStone.caratRange.max} ct
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Gallery Images */}
          {mounting.galleryUrls && mounting.galleryUrls.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Gallery
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gallery}
              >
                {mounting.galleryUrls.map((imageUrl: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[
          styles.bottomBar,
          {
            backgroundColor: theme.backgroundCard,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 16)
          }
        ]}>
          <View style={styles.bottomLeft}>
            <Text style={[styles.bottomPrice, { color: theme.primary }]}>
              ${mounting.basePrice + (mounting.settingFee || 0)}
            </Text>
            <Text style={[styles.bottomLabel, { color: theme.textSecondary }]}>
              + Stone Price
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: theme.primary }]}
            onPress={handleSelectStone}
          >
            <Sparkles size={20} color="#fff" />
            <Text style={styles.selectButtonText}>
              Select Stone
            </Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75, // Fixed height - no scroll
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1, // Takes remaining space
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  category: {
    fontSize: 14,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  supplierLabel: {
    fontSize: 13,
  },
  supplierName: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  compatibleRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  compatibleLabel: {
    fontSize: 14,
    width: 100,
  },
  compatibleValue: {
    fontSize: 14,
    flex: 1,
  },
  gallery: {
    gap: 12,
    paddingVertical: 8,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  bottomLeft: {
    flex: 1,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  bottomLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
