/**
 * View Discount Modal
 *
 * Displays discount details and affected stones
 * Port from: web/src/components/ViewDiscountModal.jsx
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { X, User, Building2, Percent, Calendar, Gem } from 'lucide-react-native';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';

interface Discount {
  customerName?: string;
  companyName?: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  stoneIds?: string[];
}

interface Stone {
  id: string;
  certificateNumber?: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  totalPrice: number;
}

interface Props {
  visible: boolean;
  discount: Discount | null;
  onClose: () => void;
}

export default function ViewDiscountModal({ visible, discount, onClose }: Props) {
  const { theme } = useTheme();
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
        // Firestore limits 'in' queries to 10 items, so batch fetch
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
        console.error('Error fetching discount stones:', error);
      } finally {
        setLoading(false);
      }
    };

    if (visible && discount) {
      fetchStones();
    }
  }, [visible, discount]);

  if (!visible || !discount) return null;

  const renderStoneItem = ({ item }: { item: Stone }) => {
    const originalPrice = item.totalPrice || 0;
    const discountedPrice = originalPrice * (1 - discount.discountPercent / 100);

    return (
      <View style={[styles.stoneRow, { borderBottomColor: theme.border }]}>
        <View style={styles.stoneInfo}>
          <Text style={[styles.stoneId, { color: theme.textPrimary }]}>
            {item.certificateNumber || item.id.substring(0, 6)}
          </Text>
          <Text style={[styles.stoneDetails, { color: theme.textSecondary }]}>
            {item.shape} {item.carat}ct {item.color}/{item.clarity}
          </Text>
        </View>
        <View style={styles.stonePrices}>
          <Text style={[styles.originalPrice, { color: theme.textSecondary }]}>
            ${originalPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.discountedPrice, { color: theme.success }]}>
            ${discountedPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.backgroundCard }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Discount Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.infoRow}>
                <User size={16} color={theme.primary} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Customer:</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                  {discount.customerName || '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Building2 size={16} color={theme.primary} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Company:</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                  {discount.companyName || '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Percent size={16} color={theme.primary} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Discount:</Text>
                <Text style={[styles.infoValue, styles.highlight, { color: theme.primary }]}>
                  {discount.discountPercent}%
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Calendar size={16} color={theme.primary} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Validity:</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                  {discount.startDate} — {discount.endDate}
                </Text>
              </View>
            </View>

            {/* Scope Section */}
            <View style={styles.scopeSection}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Scope</Text>
              {!discount.stoneIds || discount.stoneIds.length === 0 ? (
                <View style={[styles.scopeBadge, { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }]}>
                  <Building2 size={14} color={theme.primary} />
                  <Text style={[styles.scopeText, { color: theme.primary }]}>
                    All Inventory (Global Discount)
                  </Text>
                </View>
              ) : (
                <View style={[styles.scopeBadge, { backgroundColor: `${theme.success}20`, borderColor: theme.success }]}>
                  <Gem size={14} color={theme.success} />
                  <Text style={[styles.scopeText, { color: theme.success }]}>
                    {discount.stoneIds.length} Selected Stones
                  </Text>
                </View>
              )}
            </View>

            {/* Stone List */}
            {discount.stoneIds && discount.stoneIds.length > 0 && (
              <View style={styles.stonesSection}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Affected Stones</Text>

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                      Loading stones...
                    </Text>
                  </View>
                ) : stones.length > 0 ? (
                  <View style={[styles.stonesTable, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    {/* Table Header */}
                    <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Stone</Text>
                      <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Price</Text>
                    </View>

                    {/* Table Body */}
                    <FlatList
                      data={stones}
                      renderItem={renderStoneItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  </View>
                ) : (
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No stones found
                  </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modal: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeBtn: {
    padding: 4
  },
  scrollView: {
    padding: 16
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 80
  },
  infoValue: {
    flex: 1,
    fontSize: 14
  },
  highlight: {
    fontWeight: 'bold'
  },
  scopeSection: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  scopeText: {
    fontSize: 14,
    fontWeight: '600'
  },
  stonesSection: {
    marginBottom: 16
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 14
  },
  stonesTable: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  stoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1
  },
  stoneInfo: {
    flex: 1
  },
  stoneId: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  stoneDetails: {
    fontSize: 12
  },
  stonePrices: {
    alignItems: 'flex-end'
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginBottom: 2
  },
  discountedPrice: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20
  }
});
