import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Customer {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface CreateDiscountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateDiscountModal({ visible, onClose, onSuccess }: CreateDiscountModalProps) {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [percentage, setPercentage] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCustomers();
    }
  }, [visible]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      // Get all verified retailers (customers)
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['verifiedRetailer', 'retailer'])
      );

      const snapshot = await getDocs(q);
      const customersList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().email,
        email: doc.data().email,
        company: doc.data().company,
      }));

      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert(t('createDiscountModal.error'), t('createDiscountModal.loadCustomersError'));
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCreate = async () => {
    // Validation
    if (!selectedCustomer) {
      Alert.alert(t('createDiscountModal.error'), t('createDiscountModal.selectCustomer'));
      return;
    }

    const percentageNum = parseFloat(percentage);
    if (!percentage || isNaN(percentageNum) || percentageNum <= 0 || percentageNum > 100) {
      Alert.alert(t('createDiscountModal.error'), t('createDiscountModal.validPercentage'));
      return;
    }

    if (expiryDate <= new Date()) {
      Alert.alert(t('createDiscountModal.error'), t('createDiscountModal.futureDate'));
      return;
    }

    setLoading(true);
    try {
      // Create discount document
      await addDoc(collection(db, 'discounts'), {
        supplierId: auth.currentUser!.uid,
        supplierName: auth.currentUser!.displayName || auth.currentUser!.email,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerEmail: selectedCustomer.email,
        percentage: percentageNum,
        expiresAt: expiryDate,
        used: false,
        createdAt: serverTimestamp(),
      });

      Alert.alert(t('createDiscountModal.success'), t('createDiscountModal.discountCreated'));
      onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating discount:', error);
      Alert.alert(t('createDiscountModal.error'), t('createDiscountModal.createError'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setPercentage('');
    setExpiryDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
            <Text style={styles.title}>{t('createDiscountModal.title')}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Customer Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('createDiscountModal.customer')} {t('createDiscountModal.required')}</Text>
              {loadingCustomers ? (
                <Text style={styles.loadingText}>{t('createDiscountModal.loadingCustomers')}</Text>
              ) : (
                <ScrollView style={styles.customerList} nestedScrollEnabled>
                  {customers.map((customer) => (
                    <TouchableOpacity
                      key={customer.id}
                      style={[
                        styles.customerItem,
                        selectedCustomer?.id === customer.id && styles.customerItemSelected,
                      ]}
                      onPress={() => setSelectedCustomer(customer)}
                    >
                      <Text style={styles.customerName}>{customer.name}</Text>
                      {customer.company && (
                        <Text style={styles.customerCompany}>{customer.company}</Text>
                      )}
                      <Text style={styles.customerEmail}>{customer.email}</Text>
                    </TouchableOpacity>
                  ))}
                  {customers.length === 0 && (
                    <Text style={styles.emptyText}>{t('createDiscountModal.noCustomers')}</Text>
                  )}
                </ScrollView>
              )}
            </View>

            {/* Discount Percentage */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('createDiscountModal.discountPercentage')} {t('createDiscountModal.required')}</Text>
              <TextInput
                style={styles.input}
                value={percentage}
                onChangeText={setPercentage}
                placeholder={t('createDiscountModal.percentagePlaceholder')}
                keyboardType="numeric"
                maxLength={3}
              />
              {percentage && (parseFloat(percentage) > 100 || parseFloat(percentage) <= 0) && (
                <Text style={styles.errorText}>{t('createDiscountModal.percentageError')}</Text>
              )}
            </View>

            {/* Expiry Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('createDiscountModal.expiryDate')} {t('createDiscountModal.required')}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {expiryDate.toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={expiryDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setExpiryDate(date);
                  }}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Summary */}
            {selectedCustomer && percentage && (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>{t('createDiscountModal.summary')}</Text>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>{t('createDiscountModal.summaryCustomer')}: </Text>
                  {selectedCustomer.name}
                </Text>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>{t('createDiscountModal.summaryDiscount')}: </Text>
                  %{percentage}
                </Text>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>{t('createDiscountModal.summaryValidity')}: </Text>
                  {expiryDate.toLocaleDateString('tr-TR')}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{t('createDiscountModal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>
                {loading ? t('createDiscountModal.creating') : t('createDiscountModal.create')}
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  customerList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerCompany: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  summary: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryLabel: {
    fontWeight: '600',
    color: '#333',
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
  createButton: {
    backgroundColor: '#4CAF50',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
