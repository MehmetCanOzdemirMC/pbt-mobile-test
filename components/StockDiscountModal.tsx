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
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Customer {
  id: string;
  name: string;
  email: string;
  company?: string;
  PBcustomerID?: string;
}

interface Stone {
  id: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  cut?: string;
  totalPrice?: number;
  availability: 'available' | 'reserved' | 'sold';
}

interface StockDiscountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockDiscountModal({ visible, onClose, onSuccess }: StockDiscountModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [percentage, setPercentage] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [stones, setStones] = useState<Stone[]>([]);
  const [loadingStones, setLoadingStones] = useState(false);
  const [selectedStoneIds, setSelectedStoneIds] = useState<Set<string>>(new Set());
  const [showStoneSelection, setShowStoneSelection] = useState(false);

  // Filter states
  const [filterCarat, setFilterCarat] = useState('');
  const [filterShape, setFilterShape] = useState('');

  // Load customers
  useEffect(() => {
    if (visible) {
      loadCustomers();
    }
  }, [visible]);

  // Load supplier's stones
  useEffect(() => {
    if (!visible || !auth.currentUser) return;

    setLoadingStones(true);
    const q = query(
      collection(db, 'stones'),
      where('supplierId', '==', auth.currentUser.uid),
      where('availability', '==', 'available')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stonesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Stone[];

      // Sort on client side (newest first)
      stonesData.sort((a, b) => {
        const aTime = (a as any).createdAt?.toMillis?.() || 0;
        const bTime = (b as any).createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setStones(stonesData);
      setLoadingStones(false);
    });

    return () => unsubscribe();
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
        PBcustomerID: doc.data().PBcustomerID,
      }));

      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Hata', 'Müşteriler yüklenemedi');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCreate = async () => {
    // Validation
    if (!selectedCustomer) {
      Alert.alert('Hata', 'Lütfen bir müşteri seçin');
      return;
    }

    const percentageNum = parseFloat(percentage);
    if (!percentage || isNaN(percentageNum) || percentageNum <= 0 || percentageNum > 100) {
      Alert.alert('Hata', 'Lütfen geçerli bir indirim yüzdesi girin (1-100)');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Hata', 'Bitiş tarihi başlangıç tarihinden sonra olmalı');
      return;
    }

    if (selectedStoneIds.size === 0) {
      Alert.alert('Hata', 'Lütfen en az bir taş seçin');
      return;
    }

    setLoading(true);
    try {
      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      // Create discount document
      await addDoc(collection(db, 'discounts'), {
        supplierId: auth.currentUser!.uid,
        assignedBy: auth.currentUser!.uid,
        assignedByName: 'Supplier',
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        companyName: selectedCustomer.company || selectedCustomer.name,
        PBcustomerID: selectedCustomer.PBcustomerID || null,
        discountPercent: percentageNum,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        scope: 'selection',
        stoneIds: Array.from(selectedStoneIds),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Başarılı', 'İndirim oluşturuldu!');
      onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating discount:', error);
      Alert.alert('Hata', 'İndirim oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setPercentage('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setSelectedStoneIds(new Set());
    setShowStoneSelection(false);
    setFilterCarat('');
    setFilterShape('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleStone = (stoneId: string) => {
    const newSet = new Set(selectedStoneIds);
    if (newSet.has(stoneId)) {
      newSet.delete(stoneId);
    } else {
      newSet.add(stoneId);
    }
    setSelectedStoneIds(newSet);
  };

  const toggleAllStones = () => {
    if (selectedStoneIds.size === filteredStones.length) {
      setSelectedStoneIds(new Set());
    } else {
      setSelectedStoneIds(new Set(filteredStones.map(s => s.id)));
    }
  };

  // Filter stones based on criteria
  const filteredStones = stones.filter(stone => {
    if (filterCarat && !stone.carat.toString().includes(filterCarat)) return false;
    if (filterShape && !stone.shape.toLowerCase().includes(filterShape.toLowerCase())) return false;
    return true;
  });

  const renderStoneItem = ({ item }: { item: Stone }) => (
    <TouchableOpacity
      style={styles.stoneItem}
      onPress={() => toggleStone(item.id)}
    >
      <View style={styles.checkbox}>
        {selectedStoneIds.has(item.id) && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
      <View style={styles.stoneInfo}>
        <Text style={styles.stoneText}>
          {item.shape} {item.carat}ct {item.color}/{item.clarity}
        </Text>
        <Text style={styles.stonePrice}>
          ${item.totalPrice?.toLocaleString() || 0}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
            <Text style={styles.title}>Stok İndirimi Oluştur</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {!showStoneSelection ? (
              <>
                {/* Customer Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Müşteri *</Text>
                  {loadingCustomers ? (
                    <Text style={styles.loadingText}>Müşteriler yükleniyor...</Text>
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
                        <Text style={styles.emptyText}>Müşteri bulunamadı</Text>
                      )}
                    </ScrollView>
                  )}
                </View>

                {/* Discount Percentage */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>İndirim Yüzdesi (%) *</Text>
                  <TextInput
                    style={styles.input}
                    value={percentage}
                    onChangeText={setPercentage}
                    placeholder="Örn: 5"
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  {percentage && (parseFloat(percentage) > 100 || parseFloat(percentage) <= 0) && (
                    <Text style={styles.errorText}>1-100 arası bir değer girin</Text>
                  )}
                </View>

                {/* Start Date */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Başlangıç Tarihi *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.dateText}>
                      {startDate.toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        setShowStartDatePicker(Platform.OS === 'ios');
                        if (date) setStartDate(date);
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                </View>

                {/* End Date */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bitiş Tarihi *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={styles.dateText}>
                      {endDate.toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        setShowEndDatePicker(Platform.OS === 'ios');
                        if (date) setEndDate(date);
                      }}
                      minimumDate={startDate}
                    />
                  )}
                </View>

                {/* Selected Stones Count */}
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionText}>
                    {selectedStoneIds.size} taş seçildi
                  </Text>
                  <TouchableOpacity
                    style={styles.selectStonesButton}
                    onPress={() => setShowStoneSelection(true)}
                  >
                    <Text style={styles.selectStonesButtonText}>
                      {selectedStoneIds.size > 0 ? 'Taşları Düzenle' : 'Taş Seç'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Stone Selection View */}
                <View style={styles.stoneSelectionHeader}>
                  <Text style={styles.sectionTitle}>Taş Seçimi</Text>
                  <TouchableOpacity onPress={() => setShowStoneSelection(false)}>
                    <Text style={styles.backButton}>← Geri</Text>
                  </TouchableOpacity>
                </View>

                {/* Filters */}
                <View style={styles.filtersRow}>
                  <TextInput
                    style={[styles.input, styles.filterInput]}
                    value={filterCarat}
                    onChangeText={(text) => setFilterCarat(text.replace(',', '.'))}
                    placeholder="Karat ara..."
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, styles.filterInput]}
                    value={filterShape}
                    onChangeText={setFilterShape}
                    placeholder="Şekil ara..."
                  />
                </View>

                {/* Toggle All */}
                <View style={styles.toggleAllRow}>
                  <Text style={styles.resultCount}>
                    {filteredStones.length} taş bulundu
                  </Text>
                  <TouchableOpacity onPress={toggleAllStones}>
                    <Text style={styles.toggleAllButton}>
                      {selectedStoneIds.size === filteredStones.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Stone List */}
                {loadingStones ? (
                  <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                ) : (
                  <FlatList
                    data={filteredStones}
                    keyExtractor={(item) => item.id}
                    renderItem={renderStoneItem}
                    style={styles.stoneList}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>Taş bulunamadı</Text>
                    }
                  />
                )}
              </>
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
              style={[styles.button, styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading || !selectedCustomer || !percentage || selectedStoneIds.size === 0}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Oluşturuluyor...' : 'Oluştur'}
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
  selectionInfo: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  selectStonesButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  selectStonesButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stoneSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterInput: {
    flex: 1,
  },
  toggleAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
  },
  toggleAllButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  stoneList: {
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  stoneItem: {
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
  stoneInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stoneText: {
    fontSize: 14,
    color: '#333',
  },
  stonePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  loader: {
    marginTop: 40,
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
