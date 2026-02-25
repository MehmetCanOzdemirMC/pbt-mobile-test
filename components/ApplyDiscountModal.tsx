import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface OrderItem {
  stoneId: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  cut?: string;
  originalPrice: number;
}

interface ApplyDiscountModalProps {
  visible: boolean;
  orderId: string;
  items: OrderItem[];
  originalTotal: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApplyDiscountModal({
  visible,
  orderId,
  items,
  originalTotal,
  onClose,
  onSuccess,
}: ApplyDiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>(items.map(item => item.stoneId));
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateNewTotal = () => {
    let newTotal = 0;
    items.forEach(item => {
      if (selectedItems.includes(item.stoneId)) {
        if (discountType === 'percentage') {
          newTotal += item.originalPrice * (1 - parseFloat(discountValue || '0') / 100);
        } else {
          newTotal += Math.max(0, item.originalPrice - parseFloat(discountValue || '0'));
        }
      } else {
        newTotal += item.originalPrice;
      }
    });
    return newTotal;
  };

  const handleApply = async () => {
    // Validation
    const discountNum = parseFloat(discountValue);
    if (!discountValue || isNaN(discountNum) || discountNum <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir indirim değeri girin');
      return;
    }

    if (discountType === 'percentage' && discountNum > 100) {
      Alert.alert('Hata', 'İndirim yüzdesi 100\'den fazla olamaz');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir taş seçin');
      return;
    }

    setLoading(true);
    try {
      const newTotal = calculateNewTotal();
      const totalDiscount = originalTotal - newTotal;

      // Update order in Firestore
      await updateDoc(doc(db, 'orders', orderId), {
        finalTotal: newTotal,
        totalDiscount: totalDiscount,
        discountType,
        discountValue: discountNum,
        discountedItems: selectedItems,
        discountReason: reason || null,
        updatedAt: new Date(),
      });

      Alert.alert('Başarılı', 'İndirim uygulandı!');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error applying discount:', error);
      Alert.alert('Hata', 'İndirim uygulanamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDiscountType('percentage');
    setDiscountValue('');
    setSelectedItems(items.map(item => item.stoneId));
    setReason('');
    onClose();
  };

  const toggleAllItems = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.stoneId));
    }
  };

  const toggleItem = (stoneId: string) => {
    if (selectedItems.includes(stoneId)) {
      setSelectedItems(selectedItems.filter(id => id !== stoneId));
    } else {
      setSelectedItems([...selectedItems, stoneId]);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>İndirim Uygula</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Discount Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>İndirim Tipi</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    discountType === 'percentage' && styles.typeButtonActive,
                  ]}
                  onPress={() => setDiscountType('percentage')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      discountType === 'percentage' && styles.typeButtonTextActive,
                    ]}
                  >
                    % Yüzde
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    discountType === 'fixed' && styles.typeButtonActive,
                  ]}
                  onPress={() => setDiscountType('fixed')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      discountType === 'fixed' && styles.typeButtonTextActive,
                    ]}
                  >
                    $ Sabit Tutar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Discount Value */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                İndirim Miktarı {discountType === 'percentage' ? '(%)' : '($)'}
              </Text>
              <TextInput
                style={styles.input}
                value={discountValue}
                onChangeText={setDiscountValue}
                placeholder={discountType === 'percentage' ? 'Örn: 5' : 'Örn: 500'}
                keyboardType="numeric"
              />
              {discountType === 'percentage' && discountValue && parseFloat(discountValue) > 100 && (
                <Text style={styles.errorText}>İndirim %100'den fazla olamaz</Text>
              )}
            </View>

            {/* Item Selection */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>İndirim Uygulanacak Taşlar</Text>
                <TouchableOpacity onPress={toggleAllItems}>
                  <Text style={styles.toggleButton}>
                    {selectedItems.length === items.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.itemList}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.stoneId}
                    style={styles.itemRow}
                    onPress={() => toggleItem(item.stoneId)}
                  >
                    <View style={styles.checkbox}>
                      {selectedItems.includes(item.stoneId) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemText}>
                        {item.shape} {item.carat}ct {item.color}/{item.clarity}
                      </Text>
                      <Text style={styles.itemPrice}>
                        ${item.originalPrice?.toLocaleString() || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reason */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Neden (Opsiyonel)</Text>
              <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="Örn: Toplu alım indirimi"
              />
            </View>

            {/* Summary */}
            {discountValue && selectedItems.length > 0 && (
              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Orijinal Toplam</Text>
                  <Text style={styles.summaryValue}>${originalTotal.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>İndirim</Text>
                  <Text style={styles.discountAmount}>
                    -${(originalTotal - calculateNewTotal()).toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Yeni Toplam</Text>
                  <Text style={styles.totalValue}>${calculateNewTotal().toLocaleString()}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton, loading && styles.buttonDisabled]}
              onPress={handleApply}
              disabled={loading || !discountValue || selectedItems.length === 0}
            >
              <Text style={styles.applyButtonText}>
                {loading ? 'Uygulanıyor...' : 'İndirimi Uygula'}
              </Text>
            </TouchableOpacity>
          </View>
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  itemList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  summary: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountAmount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 12,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
