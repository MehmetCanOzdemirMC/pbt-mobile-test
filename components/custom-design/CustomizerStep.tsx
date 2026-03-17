/**
 * Customizer Step
 *
 * 3D viewer + customization options (WebView placeholder)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { WebView } from 'react-native-webview';
import { Palette } from 'lucide-react-native';

const METAL_OPTIONS = [
  { id: '14k-white', name: '14K White Gold', hex: '#E5E4E2' },
  { id: '14k-yellow', name: '14K Yellow Gold', hex: '#FFD700' },
  { id: '14k-rose', name: '14K Rose Gold', hex: '#B76E79' },
  { id: '18k-white', name: '18K White Gold', hex: '#F0F0F0' },
  { id: 'platinum', name: 'Platinum', hex: '#E5E4E2' }
];

interface Props {
  mounting: any;
  stone: any;
  selectedMetal: string;
  onMetalChange: (metal: string) => void;
  theme: any;
}

export default function CustomizerStep({
  mounting,
  stone,
  selectedMetal,
  onMetalChange,
  theme
}: Props) {
  const { t } = useTranslation();
  const totalPrice = (mounting?.basePrice || 0) + (stone?.totalPrice || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{t('customDesign.customizeDesign')}</Text>

      {/* 3D Viewer Placeholder (WebView for iJewel) */}
      <View style={[styles.viewerContainer, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <Text style={[styles.viewerPlaceholder, { color: theme.textSecondary }]}>
          3D Viewer (WebView)
        </Text>
        <Text style={[styles.viewerHint, { color: theme.textSecondary }]}>
          iJewel integration coming soon
        </Text>
        {/* TODO: Replace with WebView when iJewel URL available
        <WebView
          source={{ uri: 'https://drive.ijewel.com/...' }}
          style={styles.webview}
        />
        */}
      </View>

      {/* Metal Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Palette size={20} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('customDesign.selectMetal')}</Text>
        </View>

        <View style={styles.metalGrid}>
          {METAL_OPTIONS.map((metal) => (
            <TouchableOpacity
              key={metal.id}
              style={[
                styles.metalOption,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: selectedMetal === metal.name ? theme.primary : theme.border,
                  borderWidth: selectedMetal === metal.name ? 2 : 1
                }
              ]}
              onPress={() => onMetalChange(metal.name)}
            >
              <View style={[styles.metalSwatch, { backgroundColor: metal.hex }]} />
              <Text style={[styles.metalText, { color: theme.textPrimary }]} numberOfLines={2}>
                {metal.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Price Summary */}
      <View style={[styles.summaryCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>{t('customDesign.priceSummary')}</Text>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('customDesign.mounting')}:</Text>
          <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>
            ${(mounting?.basePrice || 0).toLocaleString()}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('customDesign.stone')}:</Text>
          <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>
            ${(stone?.totalPrice || 0).toLocaleString()}
          </Text>
        </View>

        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={[styles.summaryLabel, styles.totalLabel, { color: theme.textPrimary }]}>
            {t('cart.total')}:
          </Text>
          <Text style={[styles.summaryValue, styles.totalValue, { color: theme.primary }]}>
            ${totalPrice.toLocaleString()}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    paddingBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  viewerContainer: {
    height: 300,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewerPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  viewerHint: {
    fontSize: 12
  },
  webview: {
    flex: 1,
    width: '100%'
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  metalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metalOption: {
    width: '30%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  metalSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  metalText: {
    fontSize: 11,
    textAlign: 'center'
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  summaryLabel: {
    fontSize: 14
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 16
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold'
  }
});
