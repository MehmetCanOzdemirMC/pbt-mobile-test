import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../stores/cartStore';
import { useTheme } from '../context/ThemeContext';

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
  fluorescence?: string;
  depth?: number;
  table?: number;
  measurements?: string;
  totalPrice: number;
  pricePerCarat: number;
  status: string;
  supplierId: string;
  supplierName?: string;
  certificate?: string;
  certificateNumber?: string;
}

interface StoneDetailModalProps {
  visible: boolean;
  stone: Stone | null;
  onClose: () => void;
}

export default function StoneDetailModal({ visible, stone, onClose }: StoneDetailModalProps) {
  const { addToCart } = useCartStore();
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (!stone) return null;

  const handleAddToCart = async () => {
    if (stone.status !== 'available') {
      Alert.alert(t('stoneDetailModal.warning'), t('stoneDetailModal.notAvailableMessage'));
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
      Alert.alert(t('stoneDetailModal.success'), t('stoneDetailModal.addedToCart'));
      onClose();
    } catch (error) {
      Alert.alert(t('stoneDetailModal.error'), t('stoneDetailModal.addToCartError'));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>💎 {t('stoneDetailModal.title')}</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.background }]}>
            <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.titleSection, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[styles.stoneId, { color: theme.textPrimary }]}>{stone.stoneId}</Text>
            <View style={[
              styles.statusBadge,
              stone.status === 'available' ? styles.statusAvailable : styles.statusReserved
            ]}>
              <Text style={[
                styles.statusText,
                stone.status === 'available' ? styles.statusAvailableText : styles.statusReservedText
              ]}>
                {stone.status === 'available' ? '✓ ' + t('stoneDetailModal.available') : '⏳ ' + t('stoneDetailModal.reserved')}
              </Text>
            </View>
          </View>

          <View style={styles.priceSection}>
            <View style={[styles.priceCard, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.totalPrice')}</Text>
              <Text style={[styles.price, { color: theme.primary }]}>${stone.totalPrice.toLocaleString()}</Text>
            </View>
            <View style={[styles.priceCard, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.pricePerCarat')}</Text>
              <Text style={[styles.pricePerCarat, { color: theme.textSecondary }]}>${stone.pricePerCarat.toLocaleString()}/CT</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetailModal.basicFeatures')}</Text>

            <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.shape')}:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.shape}</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.carat')}:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.carat.toFixed(2)} CT</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.color')}:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.color}</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.clarity')}:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.clarity}</Text>
            </View>

            {stone.cut && (
              <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.cut')}:</Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.cut}</Text>
              </View>
            )}

            {stone.polish && (
              <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.polish')}:</Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.polish}</Text>
              </View>
            )}

            {stone.symmetry && (
              <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.symmetry')}:</Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.symmetry}</Text>
              </View>
            )}

            {stone.fluorescence && (
              <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.fluorescence')}:</Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.fluorescence}</Text>
              </View>
            )}
          </View>

          {(stone.depth || stone.table || stone.measurements) && (
            <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetailModal.measurements')}</Text>

              {stone.measurements && (
                <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.dimensions')}:</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.measurements} mm</Text>
                </View>
              )}

              {stone.depth && (
                <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.depth')}:</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.depth}%</Text>
                </View>
              )}

              {stone.table && (
                <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.table')}:</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.table}%</Text>
                </View>
              )}
            </View>
          )}

          {(stone.certificate || stone.certificateNumber) && (
            <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetailModal.certificate')}</Text>

              {stone.certificate && (
                <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.certificateType')}:</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.certificate}</Text>
                </View>
              )}

              {stone.certificateNumber && (
                <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{t('stoneDetailModal.certificateNumber')}:</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{stone.certificateNumber}</Text>
                </View>
              )}
            </View>
          )}

          {stone.supplierName && (
            <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stoneDetailModal.supplier')}</Text>
              <View style={[styles.supplierCard, { backgroundColor: theme.background }]}>
                <Text style={[styles.supplierName, { color: theme.textPrimary }]}>🏢 {stone.supplierName}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.backgroundCard, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              { backgroundColor: theme.primary },
              stone.status !== 'available' && styles.addToCartButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={Boolean(stone.status !== 'available')}
          >
            <Text style={styles.addToCartButtonText}>
              {stone.status === 'available' ? '🛒 ' + t('stoneDetailModal.addToCart') : '⏳ ' + t('stoneDetailModal.notAvailable')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  titleSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stoneId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusAvailable: {
    backgroundColor: '#e8f5e9',
  },
  statusReserved: {
    backgroundColor: '#fff3e0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusAvailableText: {
    color: '#2e7d32',
  },
  statusReservedText: {
    color: '#f57c00',
  },
  priceSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  priceCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pricePerCarat: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  supplierCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  supplierName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
