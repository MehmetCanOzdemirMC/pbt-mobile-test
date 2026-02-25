import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Stone {
  id: string;
  pbStockCode?: string;
  stoneId?: string;
  customerRef?: string;
  certificateNumber?: string;
  stockId?: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  cut?: string;
  totalPrice?: number;
}

interface Discount {
  id: string;
  customerName?: string;
  companyName?: string;
  discountPercent: number;
  startDate?: string;
  endDate?: string;
  stoneIds?: string[];
  createdAt: any;
}

interface ViewDiscountModalProps {
  visible: boolean;
  discount: Discount | null;
  onClose: () => void;
}

export default function ViewDiscountModal({ visible, discount, onClose }: ViewDiscountModalProps) {
  const [stones, setStones] = useState<Stone[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStones = async () => {
      if (!discount?.stoneIds || discount.stoneIds.length === 0) {
        setStones([]);
        return;
      }

      setLoading(true);
      try {
        // Firestore 'in' query limit is 10 items, so we need to batch
        const stoneIds = discount.stoneIds;
        const chunks: string[][] = [];
        for (let i = 0; i < stoneIds.length; i += 10) {
          chunks.push(stoneIds.slice(i, i + 10));
        }

        const allStones: Stone[] = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, 'stones'),
            where(documentId(), 'in', chunk)
          );
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            allStones.push({ id: doc.id, ...doc.data() } as Stone);
          });
        }

        setStones(allStones);
      } catch (error) {
        console.error('Error fetching stones:', error);
      } finally {
        setLoading(false);
      }
    };

    if (visible && discount) {
      fetchStones();
    }
  }, [visible, discount]);

  if (!discount) return null;

  const renderStoneItem = ({ item }: { item: Stone }) => {
    const originalPrice = item.totalPrice || 0;
    const discountedPrice = originalPrice * (1 - discount.discountPercent / 100);
    const pbStockCode = item.pbStockCode || 'Beklemede';
    const supplierStockCode = item.stoneId || item.customerRef || '-';

    return (
      <View style={styles.stoneCard}>
        <View style={styles.stoneHeader}>
          <View style={styles.stockCodes}>
            <Text style={styles.pbStockId}>PB: {pbStockCode}</Text>
            <Text style={styles.supplierStockId}>Stok: {supplierStockCode}</Text>
          </View>
          <Text style={styles.stoneShape}>{item.shape}</Text>
        </View>

        <View style={styles.stoneSpecs}>
          <Text style={styles.stoneSpec}>{item.carat} ct</Text>
          <Text style={styles.stoneSpec}>{item.color}</Text>
          <Text style={styles.stoneSpec}>{item.clarity}</Text>
          {item.cut && <Text style={styles.stoneSpec}>{item.cut}</Text>}
        </View>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Orijinal</Text>
            <Text style={styles.originalPrice}>${originalPrice.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRight}>
            <Text style={styles.priceLabel}>İndirimli</Text>
            <Text style={styles.discountedPrice}>${discountedPrice.toFixed(0).toLocaleString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>İndirim Detayı</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Müşteri</Text>
                <Text style={styles.infoValue}>{discount.customerName || '-'}</Text>
              </View>
              {discount.companyName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Firma</Text>
                  <Text style={styles.infoValue}>{discount.companyName}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>İndirim Oranı</Text>
                <Text style={styles.discountPercent}>%{discount.discountPercent}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Geçerlilik</Text>
                <Text style={styles.infoValue}>
                  {discount.startDate && discount.endDate
                    ? `${discount.startDate} — ${discount.endDate}`
                    : discount.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || '-'}
                </Text>
              </View>
            </View>

            {/* Scope Section */}
            <View style={styles.scopeSection}>
              <Text style={styles.sectionTitle}>Kapsam</Text>
              {!discount.stoneIds || discount.stoneIds.length === 0 ? (
                <View style={[styles.scopeBadge, styles.globalScope]}>
                  <Text style={styles.scopeText}>🏢 Tüm Stok (Global İndirim)</Text>
                </View>
              ) : (
                <View style={[styles.scopeBadge, styles.specificScope]}>
                  <Text style={styles.scopeText}>💎 {discount.stoneIds.length} Adet Seçili Taş</Text>
                </View>
              )}
            </View>

            {/* Stones List */}
            {discount.stoneIds && discount.stoneIds.length > 0 && (
              <View style={styles.stonesSection}>
                <Text style={styles.sectionTitle}>Taşlar</Text>
                {loading ? (
                  <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                ) : stones.length > 0 ? (
                  <FlatList
                    data={stones}
                    keyExtractor={(item) => item.id}
                    renderItem={renderStoneItem}
                    scrollEnabled={false}
                  />
                ) : (
                  <Text style={styles.emptyText}>Taş bilgisi bulunamadı</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  discountPercent: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  scopeSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scopeBadge: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  globalScope: {
    backgroundColor: '#E3F2FD',
  },
  specificScope: {
    backgroundColor: '#F3E5F5',
  },
  scopeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stonesSection: {
    marginBottom: 20,
  },
  stoneCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockCodes: {
    gap: 4,
  },
  pbStockId: {
    fontSize: 11,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '600',
  },
  supplierStockId: {
    fontSize: 11,
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '600',
  },
  stoneShape: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stoneSpecs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  stoneSpec: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  priceLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
