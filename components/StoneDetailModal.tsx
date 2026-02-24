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
import { useCartStore } from '../stores/cartStore';

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

  if (!stone) return null;

  const handleAddToCart = async () => {
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
      onClose();
    } catch (error) {
      Alert.alert('Hata', 'Sepete eklenirken bir hata oluştu');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💎 Taş Detayı</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.stoneId}>{stone.stoneId}</Text>
            <View style={[
              styles.statusBadge,
              stone.status === 'available' ? styles.statusAvailable : styles.statusReserved
            ]}>
              <Text style={[
                styles.statusText,
                stone.status === 'available' ? styles.statusAvailableText : styles.statusReservedText
              ]}>
                {stone.status === 'available' ? '✓ Mevcut' : '⏳ Rezerve'}
              </Text>
            </View>
          </View>

          <View style={styles.priceSection}>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Toplam Fiyat</Text>
              <Text style={styles.price}>${stone.totalPrice.toLocaleString()}</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Karat Fiyatı</Text>
              <Text style={styles.pricePerCarat}>${stone.pricePerCarat.toLocaleString()}/CT</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Temel Özellikler</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Şekil:</Text>
              <Text style={styles.detailValue}>{stone.shape}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Karat:</Text>
              <Text style={styles.detailValue}>{stone.carat.toFixed(2)} CT</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Renk:</Text>
              <Text style={styles.detailValue}>{stone.color}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Berraklık:</Text>
              <Text style={styles.detailValue}>{stone.clarity}</Text>
            </View>

            {stone.cut && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kesim:</Text>
                <Text style={styles.detailValue}>{stone.cut}</Text>
              </View>
            )}

            {stone.polish && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cila:</Text>
                <Text style={styles.detailValue}>{stone.polish}</Text>
              </View>
            )}

            {stone.symmetry && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Simetri:</Text>
                <Text style={styles.detailValue}>{stone.symmetry}</Text>
              </View>
            )}

            {stone.fluorescence && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Floresans:</Text>
                <Text style={styles.detailValue}>{stone.fluorescence}</Text>
              </View>
            )}
          </View>

          {(stone.depth || stone.table || stone.measurements) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ölçüler</Text>

              {stone.measurements && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Boyutlar:</Text>
                  <Text style={styles.detailValue}>{stone.measurements} mm</Text>
                </View>
              )}

              {stone.depth && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Derinlik:</Text>
                  <Text style={styles.detailValue}>{stone.depth}%</Text>
                </View>
              )}

              {stone.table && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tablo:</Text>
                  <Text style={styles.detailValue}>{stone.table}%</Text>
                </View>
              )}
            </View>
          )}

          {(stone.certificate || stone.certificateNumber) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sertifika</Text>

              {stone.certificate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sertifika Tipi:</Text>
                  <Text style={styles.detailValue}>{stone.certificate}</Text>
                </View>
              )}

              {stone.certificateNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sertifika No:</Text>
                  <Text style={styles.detailValue}>{stone.certificateNumber}</Text>
                </View>
              )}
            </View>
          )}

          {stone.supplierName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tedarikçi</Text>
              <View style={styles.supplierCard}>
                <Text style={styles.supplierName}>🏢 {stone.supplierName}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              stone.status !== 'available' && styles.addToCartButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={Boolean(stone.status !== 'available')}
          >
            <Text style={styles.addToCartButtonText}>
              {stone.status === 'available' ? '🛒 Sepete Ekle' : '⏳ Müsait Değil'}
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
