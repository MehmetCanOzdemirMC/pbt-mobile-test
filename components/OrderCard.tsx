import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface OrderItem {
  stoneId: string;
  id: string;
  carat: number;
  shape: string;
  color: string;
  clarity: string;
  cut?: string;
  originalPrice: number;
  finalPrice: number;
  discount?: number;
}

interface Order {
  id: string;
  orderId: string;
  buyerId: string;
  buyerEmail: string;
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  originalTotal: number;
  finalTotal: number;
  totalDiscount: number;
  status: string;
  paymentInfo?: {
    bankName: string;
    iban: string;
    accountHolder: string;
    amount: number;
  };
  cancellationReason?: string;
}

interface OrderCardProps {
  order: Order;
  onOrderUpdate: () => void;
}

export default function OrderCard({ order, onOrderUpdate }: OrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({
    bankName: '',
    iban: '',
    accountHolder: '',
    amount: '',
  });

  const currentUserId = auth.currentUser?.uid;
  const isSupplier = currentUserId === order.supplierId;
  const isBuyer = currentUserId === order.buyerId;

  const getStatusInfo = () => {
    const statusLabels: { [key: string]: { text: string; color: string; bgColor: string } } = {
      NEGOTIATING: { text: 'Pazarlık Aşaması', color: '#FFA500', bgColor: '#FFF3E0' },
      PENDING_PAYMENT: { text: 'Ödeme Bekleniyor', color: '#1E90FF', bgColor: '#E3F2FD' },
      PAYMENT_CLAIMED: { text: 'Ödeme Onayı Bekleniyor', color: '#9370DB', bgColor: '#F3E5F5' },
      COMPLETED: { text: 'Tamamlandı', color: '#32CD32', bgColor: '#E8F5E9' },
      CANCELLED_BY_SUPPLIER: { text: 'Tedarikçi İptal Etti', color: '#DC143C', bgColor: '#FFEBEE' },
      CANCELLED_BY_BUYER: { text: 'Alıcı İptal Etti', color: '#DC143C', bgColor: '#FFEBEE' },
    };
    return statusLabels[order.status] || { text: order.status, color: '#999', bgColor: '#F5F5F5' };
  };

  const handleAcceptDeal = async () => {
    if (isSupplier) {
      // Load supplier's saved bank info
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId!));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const paymentInfoData = userData.paymentInfo || {};
          setPaymentInfo({
            bankName: paymentInfoData.bankName || '',
            iban: paymentInfoData.iban || '',
            accountHolder: paymentInfoData.accountHolder || '',
            amount: order.finalTotal.toString(),
          });
        }
      } catch (error) {
        console.error('Error loading bank info:', error);
      }
      setShowPaymentModal(true);
    } else {
      // Buyer accepts
      Alert.alert('Anlaşmayı Onayla', 'Fiyatı onaylıyor musunuz?', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            setActionLoading(true);
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                status: 'PENDING_PAYMENT',
                updatedAt: serverTimestamp(),
              });
              Alert.alert('Başarılı', 'Fiyat onaylandı!');
              onOrderUpdate();
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]);
    }
  };

  const handleSavePaymentInfo = async () => {
    if (!paymentInfo.bankName.trim() || !paymentInfo.iban.trim() || !paymentInfo.accountHolder.trim()) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }

    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'PENDING_PAYMENT',
        paymentInfo: {
          bankName: paymentInfo.bankName.trim(),
          iban: paymentInfo.iban.trim(),
          accountHolder: paymentInfo.accountHolder.trim(),
          amount: parseFloat(paymentInfo.amount),
        },
        updatedAt: serverTimestamp(),
      });
      setShowPaymentModal(false);
      Alert.alert('Başarılı', 'Ödeme bilgileri kaydedildi!');
      onOrderUpdate();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    Alert.prompt('İptal Nedeni', 'Neden iptal ediyorsunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async (reason) => {
          setActionLoading(true);
          try {
            await updateDoc(doc(db, 'orders', order.id), {
              status: isSupplier ? 'CANCELLED_BY_SUPPLIER' : 'CANCELLED_BY_BUYER',
              cancellationReason: reason || 'Belirtilmedi',
              updatedAt: serverTimestamp(),
            });

            // Update stones back to available
            for (const item of order.items) {
              await updateDoc(doc(db, 'stones', item.id), {
                status: 'available',
                reservedBy: null,
                reservedAt: null,
                orderId: null,
              });
            }

            Alert.alert('Başarılı', 'Sipariş iptal edildi');
            onOrderUpdate();
          } catch (error) {
            console.error('Error:', error);
            Alert.alert('Hata', 'İptal edilemedi');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleClaimPayment = async () => {
    Alert.alert('Ödeme Bildirimi', 'Ödemeyi yaptığınızı onaylıyor musunuz?', [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'Evet',
        onPress: async () => {
          setActionLoading(true);
          try {
            await updateDoc(doc(db, 'orders', order.id), {
              status: 'PAYMENT_CLAIMED',
              updatedAt: serverTimestamp(),
            });
            Alert.alert('Başarılı', 'Ödeme bildirimi yapıldı!');
            onOrderUpdate();
          } catch (error) {
            console.error('Error:', error);
            Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleConfirmPayment = async () => {
    Alert.alert('Ödemeyi Onayla', 'Ödemeyi aldığınızı onaylıyor musunuz?', [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'Evet',
        onPress: async () => {
          setActionLoading(true);
          try {
            await updateDoc(doc(db, 'orders', order.id), {
              status: 'COMPLETED',
              completedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            // Update stones to sold
            for (const item of order.items) {
              await updateDoc(doc(db, 'stones', item.id), {
                status: 'sold',
              });
            }

            Alert.alert('Tebrikler! 🎉', 'Sipariş tamamlandı!');
            onOrderUpdate();
          } catch (error) {
            console.error('Error:', error);
            Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.container, { borderLeftColor: statusInfo.color }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderIcon}>📦</Text>
          <Text style={styles.orderId}>#{order.orderId.substring(4, 16)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ürün Sayısı:</Text>
          <Text style={styles.summaryValue}>{order.items.length} taş</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Toplam Tutar:</Text>
          <Text style={styles.summaryPrice}>${order.finalTotal.toLocaleString()}</Text>
        </View>
        {order.totalDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>İndirim:</Text>
            <Text style={styles.summaryDiscount}>-${order.totalDiscount.toLocaleString()}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.toggleButton} onPress={() => setShowDetails(!showDetails)}>
        <Text style={styles.toggleButtonText}>
          {showDetails ? '▼ Detayları Gizle' : '▶ Detayları Göster'}
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.details}>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemTitle}>
                {item.shape} {item.carat}ct {item.color}/{item.clarity}
              </Text>
              <Text style={styles.itemPrice}>${item.finalPrice.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Payment Info (for buyer in PENDING_PAYMENT) */}
      {order.status === 'PENDING_PAYMENT' && isBuyer && order.paymentInfo && (
        <View style={styles.paymentInfoBox}>
          <Text style={styles.paymentInfoTitle}>💳 Ödeme Bilgileri</Text>
          <Text style={styles.paymentInfoText}>Banka: {order.paymentInfo.bankName}</Text>
          <Text style={styles.paymentInfoText}>IBAN: {order.paymentInfo.iban}</Text>
          <Text style={styles.paymentInfoText}>Hesap Sahibi: {order.paymentInfo.accountHolder}</Text>
          <Text style={styles.paymentInfoText}>
            Tutar: ${(order.paymentInfo.amount || order.finalTotal).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {!actionLoading && (
        <View style={styles.actions}>
          {/* NEGOTIATING */}
          {order.status === 'NEGOTIATING' && (
            <>
              {isSupplier && (
                <>
                  <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAcceptDeal}>
                    <Text style={styles.buttonText}>✓ Fiyatı Onayla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancelOrder}>
                    <Text style={styles.buttonText}>✕ İptal Et</Text>
                  </TouchableOpacity>
                </>
              )}
              {isBuyer && (
                <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAcceptDeal}>
                  <Text style={styles.buttonText}>✓ Anlaşmayı Kabul Et</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* PENDING_PAYMENT */}
          {order.status === 'PENDING_PAYMENT' && (
            <>
              {isSupplier && (
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancelOrder}>
                  <Text style={styles.buttonText}>✕ İptal Et</Text>
                </TouchableOpacity>
              )}
              {isBuyer && order.paymentInfo && (
                <TouchableOpacity style={[styles.button, styles.paymentButton]} onPress={handleClaimPayment}>
                  <Text style={styles.buttonText}>💳 Ödemeyi Yaptım</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* PAYMENT_CLAIMED */}
          {order.status === 'PAYMENT_CLAIMED' && (
            <>
              {isSupplier && (
                <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirmPayment}>
                  <Text style={styles.buttonText}>✓ Ödemeyi Aldım</Text>
                </TouchableOpacity>
              )}
              {isBuyer && (
                <View style={styles.waitingBox}>
                  <Text style={styles.waitingText}>⏳ Tedarikçi ödeme kontrolü yapıyor...</Text>
                </View>
              )}
            </>
          )}

          {/* COMPLETED */}
          {order.status === 'COMPLETED' && (
            <View style={styles.completedBox}>
              <Text style={styles.completedText}>✅ Sipariş Tamamlandı</Text>
            </View>
          )}

          {/* CANCELLED */}
          {(order.status === 'CANCELLED_BY_SUPPLIER' || order.status === 'CANCELLED_BY_BUYER') && (
            <View style={styles.cancelledBox}>
              <Text style={styles.cancelledText}>❌ Sipariş İptal Edildi</Text>
              {order.cancellationReason && (
                <Text style={styles.cancelledReason}>{order.cancellationReason}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {actionLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Ödeme Bilgileri</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Banka Adı"
              value={paymentInfo.bankName}
              onChangeText={(text) => setPaymentInfo({ ...paymentInfo, bankName: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="IBAN"
              value={paymentInfo.iban}
              onChangeText={(text) => setPaymentInfo({ ...paymentInfo, iban: text })}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Hesap Sahibi"
              value={paymentInfo.accountHolder}
              onChangeText={(text) => setPaymentInfo({ ...paymentInfo, accountHolder: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Tutar ($)"
              value={paymentInfo.amount}
              onChangeText={(text) => setPaymentInfo({ ...paymentInfo, amount: text })}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSavePaymentInfo}
              >
                <Text style={styles.modalButtonTextSave}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIcon: {
    fontSize: 18,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summary: {
    gap: 6,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  summaryDiscount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  toggleButton: {
    padding: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  toggleButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  details: {
    marginTop: 12,
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  itemTitle: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  paymentInfoBox: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 6,
  },
  paymentInfoText: {
    fontSize: 12,
    color: '#333',
    marginVertical: 2,
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  paymentButton: {
    backgroundColor: '#2196F3',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  waitingBox: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  waitingText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '600',
  },
  completedBox: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  completedText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelledBox: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelledText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelledReason: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  loadingBox: {
    padding: 12,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonSave: {
    backgroundColor: '#4CAF50',
  },
  modalButtonTextCancel: {
    color: '#666',
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: 'white',
    fontWeight: '700',
  },
});
