import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useMessagingStore } from '../stores/messagingStore';

interface OrderItem {
  stoneId: string;
  id: string;
  carat: number;
  shape: string;
  color: string;
  clarity: string;
  cut?: string;
  polish?: string;
  symmetry?: string;
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
  conversationId?: string; // For sending messages
  items: OrderItem[];
  originalTotal: number;
  finalTotal: number;
  totalDiscount: number;
  status: string;
  deliveryAddress: string;
  notes: string;
  paymentInfo?: {
    bankName: string;
    iban: string;
    accountHolder: string;
    amount: number;
  };
  cancellationReason?: string;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
}

export default function OrderDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = route.params as { orderId: string };

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({
    bankName: '',
    iban: '',
    accountHolder: '',
    amount: '',
  });

  const currentUserId = auth.currentUser?.uid;
  const { sendMessageById } = useMessagingStore();

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = { id: orderSnap.id, ...orderSnap.data() } as Order;
        setOrder(orderData);

        // 🐛 DEBUG: Log payment info status
        console.log('📦 [OrderDetail] Order loaded:', {
          orderId: orderData.orderId,
          status: orderData.status,
          hasPaymentInfo: !!orderData.paymentInfo,
          paymentInfo: orderData.paymentInfo,
          buyerId: orderData.buyerId,
          supplierId: orderData.supplierId,
          currentUserId,
        });
      } else {
        Alert.alert('Hata', 'Sipariş bulunamadı');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Hata', 'Sipariş yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDeal = async () => {
    if (!order) return;

    // Only supplier can accept deal and provide payment info
    const isSupplier = currentUserId === order.supplierId;
    if (!isSupplier) return;

    // Load user's saved bank info from profile
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId!));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Bank info is stored under paymentInfo object
        const paymentInfoData = userData.paymentInfo || {};
        setPaymentInfo({
          bankName: paymentInfoData.bankName || '',
          iban: paymentInfoData.iban || '',
          accountHolder: paymentInfoData.accountHolder || '',
          amount: order.finalTotal.toString(),
        });
      } else {
        // No saved data, use empty
        setPaymentInfo({
          bankName: '',
          iban: '',
          accountHolder: '',
          amount: order.finalTotal.toString(),
        });
      }
    } catch (error) {
      console.error('Error loading user bank info:', error);
      setPaymentInfo({
        bankName: '',
        iban: '',
        accountHolder: '',
        amount: order.finalTotal.toString(),
      });
    }
    setShowPaymentModal(true);
  };

  const handleSavePaymentInfo = async () => {
    if (!order) return;

    // Validate fields
    if (!paymentInfo.bankName.trim()) {
      Alert.alert('Hata', 'Banka adı gerekli');
      return;
    }
    if (!paymentInfo.iban.trim()) {
      Alert.alert('Hata', 'IBAN gerekli');
      return;
    }
    if (!paymentInfo.accountHolder.trim()) {
      Alert.alert('Hata', 'Hesap sahibi adı gerekli');
      return;
    }
    if (!paymentInfo.amount || parseFloat(paymentInfo.amount) <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    setActionLoading(true);
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'PENDING_PAYMENT',
        paymentInfo: {
          bankName: paymentInfo.bankName.trim(),
          iban: paymentInfo.iban.trim(),
          accountHolder: paymentInfo.accountHolder.trim(),
          amount: parseFloat(paymentInfo.amount),
        },
        updatedAt: serverTimestamp(),
      });

      // Send payment info message (matching web behavior)
      if (order.conversationId) {
        await sendMessageById(order.conversationId, {
          type: 'text',
          body: `✅ Anlaşma tamam! Ödeme bilgileri aşağıdadır:\n\n💰 ÖDEME BİLGİLERİ\n━━━━━━━━━━━━━━━━━━\n🏦 Banka: ${paymentInfo.bankName.trim()}\n💳 IBAN: ${paymentInfo.iban.trim()}\n👤 Hesap Sahibi: ${paymentInfo.accountHolder.trim()}\n💵 Tutar: $${order.finalTotal.toLocaleString()}\n\n⚠️ Ödeme yaptıktan sonra "Ödemeyi Yaptım" butonuna basınız.`
        });
      }

      setShowPaymentModal(false);
      Alert.alert('Başarılı', 'Ödeme bilgileri kaydedildi. Alıcı ödeme yapabilir.');
      await loadOrder();
    } catch (error) {
      console.error('Error saving payment info:', error);
      Alert.alert('Hata', 'Ödeme bilgileri kaydedilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    Alert.prompt(
      'Siparişi İptal Et',
      'İptal nedenini yazın:',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async (reason) => {
            setActionLoading(true);
            try {
              const isSupplier = currentUserId === order.supplierId;
              const orderRef = doc(db, 'orders', order.id);

              await updateDoc(orderRef, {
                status: isSupplier ? 'CANCELLED_BY_SUPPLIER' : 'CANCELLED_BY_BUYER',
                cancellationReason: reason || 'Neden belirtilmedi',
                updatedAt: serverTimestamp(),
              });

              // Update stones back to available
              for (const item of order.items) {
                const stoneRef = doc(db, 'stones', item.id);
                await updateDoc(stoneRef, {
                  status: 'available',
                  reservedBy: null,
                  reservedAt: null,
                  orderId: null,
                });
              }

              Alert.alert('Başarılı', 'Sipariş iptal edildi.');
              await loadOrder();
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Hata', 'İptal işlemi gerçekleştirilemedi');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleClaimPayment = async () => {
    if (!order) return;

    Alert.alert(
      'Ödeme Bildirimi',
      'Ödemeyi yaptığınızı onaylıyor musunuz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            setActionLoading(true);
            try {
              const orderRef = doc(db, 'orders', order.id);
              await updateDoc(orderRef, {
                status: 'PAYMENT_CLAIMED',
                updatedAt: serverTimestamp(),
              });

              // Send notification message (matching web behavior)
              if (order.conversationId) {
                await sendMessageById(order.conversationId, {
                  type: 'text',
                  body: '💳 Alıcı ödemeyi yaptığını bildirdi. Lütfen bankayı kontrol edin ve onaylayın.'
                });
              }

              Alert.alert('Başarılı', 'Ödeme bildirimi yapıldı. Tedarikçi onayı bekleniyor.');
              await loadOrder();
            } catch (error) {
              console.error('Error claiming payment:', error);
              Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmPayment = async () => {
    if (!order) return;

    Alert.alert(
      'Ödemeyi Onayla',
      'Ödemeyi aldığınızı onaylıyor musunuz? Sipariş tamamlanacak.',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            setActionLoading(true);
            try {
              const orderRef = doc(db, 'orders', order.id);
              await updateDoc(orderRef, {
                status: 'COMPLETED',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              // Update stones to sold
              for (const item of order.items) {
                const stoneRef = doc(db, 'stones', item.id);
                await updateDoc(stoneRef, {
                  status: 'sold',
                });
              }

              Alert.alert('Tebrikler! 🎉', 'Sipariş tamamlandı.');
              await loadOrder();
            } catch (error) {
              console.error('Error confirming payment:', error);
              Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: { text: string; color: string; bgColor: string } } = {
      NEGOTIATING: { text: 'Pazarlık Aşaması', color: '#FFA500', bgColor: '#FFF3E0' },
      PENDING_PAYMENT: { text: 'Ödeme Bekleniyor', color: '#1E90FF', bgColor: '#E3F2FD' },
      PAYMENT_CLAIMED: { text: 'Ödeme Onayı Bekleniyor', color: '#9370DB', bgColor: '#F3E5F5' },
      COMPLETED: { text: 'Tamamlandı', color: '#32CD32', bgColor: '#E8F5E9' },
      CANCELLED_BY_SUPPLIER: { text: 'Tedarikçi İptal Etti', color: '#DC143C', bgColor: '#FFEBEE' },
      CANCELLED_BY_BUYER: { text: 'Alıcı İptal Etti', color: '#DC143C', bgColor: '#FFEBEE' },
    };
    return labels[status] || { text: status, color: '#999', bgColor: '#F5F5F5' };
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate PDF for order (matches web format)
  const generateOrderPDF = async () => {
    if (!order) return;

    try {
      console.log('[PDF] 📄 Generating PDF for order:', order.orderId);

      // Validate order data
      if (!order.items || order.items.length === 0) {
        Alert.alert('Hata', 'Sipariş ürünleri bulunamadı!');
        return;
      }

      // Create HTML template matching web PDF format
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .header h1 {
              font-size: 24px;
              color: #333;
              margin: 0 0 20px 0;
            }
            .order-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              font-size: 12px;
              color: #666;
            }
            .parties-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .party {
              flex: 1;
            }
            .party h3 {
              font-size: 14px;
              margin: 0 0 10px 0;
              color: #333;
            }
            .party p {
              margin: 5px 0;
              font-size: 12px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background-color: #667eea;
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-size: 11px;
              font-weight: 600;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e0e0e0;
              font-size: 11px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .totals {
              margin-top: 30px;
              text-align: right;
            }
            .totals-row {
              margin: 8px 0;
              font-size: 12px;
            }
            .totals-row.discount {
              color: #f44336;
            }
            .totals-row.final {
              font-size: 16px;
              font-weight: bold;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px solid #333;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              font-size: 10px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SİPARİŞ FATURASI</h1>
          </div>

          <div class="order-info">
            <div>Sipariş No: ${order.orderId || 'N/A'}</div>
            <div>Tarih: ${formatDate(order.completedAt || order.createdAt)}</div>
          </div>

          <div class="parties-section">
            <div class="party">
              <h3>Tedarikçi:</h3>
              <p>${order.supplierName || 'N/A'}</p>
            </div>
            <div class="party">
              <h3>Alıcı:</h3>
              <p>${order.buyerEmail || 'N/A'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center">#</th>
                <th>Taş</th>
                <th>Renk/Saflık</th>
                <th>Kesim</th>
                <th>Orijinal</th>
                <th class="text-right">Fiyat</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, index) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>${item.shape || 'N/A'} ${item.carat || 0}ct</td>
                  <td>${item.color || 'N/A'}/${item.clarity || 'N/A'}</td>
                  <td>${item.cut || 'N/A'}</td>
                  <td>${item.discount ? `$${item.originalPrice?.toLocaleString()}` : '-'}</td>
                  <td class="text-right"><strong>$${item.finalPrice?.toLocaleString()}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            ${order.totalDiscount > 0 ? `
              <div class="totals-row">
                Ara Toplam: $${order.originalTotal?.toLocaleString()}
              </div>
              <div class="totals-row discount">
                İndirim: -$${order.totalDiscount?.toLocaleString()}
              </div>
            ` : ''}
            <div class="totals-row final">
              TOPLAM: $${order.finalTotal?.toLocaleString()}
            </div>
          </div>

          <div class="footer">
            Bu belge elektronik olarak oluşturulmuştur.
          </div>
        </body>
        </html>
      `;

      console.log('[PDF] ✅ HTML template created');

      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      console.log('[PDF] ✅ PDF generated at:', uri);

      // Share/Save PDF
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Sipariş ${order.orderId.substring(4, 16)}`,
          UTI: 'com.adobe.pdf',
        });
        console.log('[PDF] ✅ PDF shared successfully');
      } else {
        Alert.alert('Başarılı', `PDF oluşturuldu:\n${uri}`);
        console.log('[PDF] ⚠️ Sharing not available, PDF saved at:', uri);
      }

    } catch (error: any) {
      console.error('[PDF] ❌ Error generating PDF:', error);
      Alert.alert('Hata', 'PDF oluşturulurken hata oluştu: ' + error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Sipariş yükleniyor...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sipariş bulunamadı</Text>
      </View>
    );
  }

  const isSupplier = currentUserId === order.supplierId;
  const isBuyer = currentUserId === order.buyerId;
  const statusInfo = getStatusLabel(order.status);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Order Header */}
        <View style={[styles.header, { borderLeftColor: statusInfo.color }]}>
          <View style={styles.headerTop}>
            <Text style={styles.orderId}>📦 {order.orderId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Özet</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ürün Sayısı:</Text>
              <Text style={styles.summaryValue}>{order.items.length} taş</Text>
            </View>
            {order.totalDiscount > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Orijinal Toplam:</Text>
                  <Text style={styles.summaryValueStrike}>
                    ${order.originalTotal.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>İndirim:</Text>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    -${order.totalDiscount.toLocaleString()}
                  </Text>
                </View>
              </>
            )}
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={styles.summaryLabelTotal}>Toplam:</Text>
              <Text style={styles.summaryValueTotal}>
                ${order.finalTotal.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taraflar</Text>
          <View style={styles.partiesBox}>
            <View style={styles.partyInfo}>
              <Text style={styles.partyLabel}>Tedarikçi:</Text>
              <Text style={styles.partyValue}>{order.supplierName}</Text>
            </View>
            <View style={styles.partyInfo}>
              <Text style={styles.partyLabel}>Alıcı:</Text>
              <Text style={styles.partyValue}>{order.buyerEmail}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Address */}
        {order.deliveryAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Teslimat Adresi</Text>
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          </View>
        )}

        {/* Payment Info (PENDING_PAYMENT stage for buyer) */}
        {order.status === 'PENDING_PAYMENT' && isBuyer && order.paymentInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Ödeme Bilgileri</Text>
            <View style={styles.paymentInfoBox}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Banka:</Text>
                <Text style={styles.paymentValue}>{order.paymentInfo.bankName}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>IBAN:</Text>
                <Text style={styles.paymentValue}>{order.paymentInfo.iban}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Hesap Sahibi:</Text>
                <Text style={styles.paymentValue}>{order.paymentInfo.accountHolder}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Tutar:</Text>
                <Text style={styles.paymentValue}>
                  ${(order.paymentInfo.amount || order.finalTotal).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.sectionTitle}>Ürünler ({order.items.length})</Text>
            <Text style={styles.toggleIcon}>{showDetails ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {showDetails && (
            <View style={styles.itemsList}>
              {order.items.map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>
                      {item.shape} {item.carat}ct {item.color}/{item.clarity}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      {item.cut} • {item.polish} • {item.symmetry}
                    </Text>
                  </View>
                  <View style={styles.itemPrice}>
                    {item.discount && (
                      <Text style={styles.itemPriceOriginal}>
                        ${item.originalPrice.toLocaleString()}
                      </Text>
                    )}
                    <Text style={styles.itemPriceFinal}>
                      ${item.finalPrice.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Cancellation Reason */}
        {order.cancellationReason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İptal Nedeni</Text>
            <View style={styles.cancellationBox}>
              <Text style={styles.cancellationText}>{order.cancellationReason}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      {!actionLoading && (
        <View style={styles.actionBar}>
          {/* NEGOTIATING */}
          {order.status === 'NEGOTIATING' && (
            <>
              {isSupplier && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={handleAcceptDeal}
                  >
                    <Text style={styles.actionButtonText}>✓ Fiyatı Onayla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={handleCancelOrder}
                  >
                    <Text style={styles.actionButtonText}>✕ İptal Et</Text>
                  </TouchableOpacity>
                </>
              )}
              {isBuyer && (
                <View style={styles.waitingBox}>
                  <Text style={styles.waitingText}>⏳ Tedarikçi anlaşmayı onaylıyor...</Text>
                </View>
              )}
            </>
          )}

          {/* PENDING_PAYMENT */}
          {order.status === 'PENDING_PAYMENT' && (
            <>
              {isSupplier && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton, { flex: 1 }]}
                  onPress={handleCancelOrder}
                >
                  <Text style={styles.actionButtonText}>✕ Siparişi İptal Et</Text>
                </TouchableOpacity>
              )}
              {isBuyer && order.paymentInfo && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.paymentButton, { flex: 1 }]}
                  onPress={handleClaimPayment}
                >
                  <Text style={styles.actionButtonText}>💳 Ödemeyi Yaptım</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* PAYMENT_CLAIMED */}
          {order.status === 'PAYMENT_CLAIMED' && (
            <>
              {isSupplier && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton, { flex: 1 }]}
                  onPress={handleConfirmPayment}
                >
                  <Text style={styles.actionButtonText}>✓ Ödemeyi Aldım</Text>
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
            <>
              <View style={styles.completedBox}>
                <Text style={styles.completedText}>✅ Sipariş Tamamlandı</Text>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, styles.pdfButton]}
                onPress={generateOrderPDF}
              >
                <Text style={styles.actionButtonText}>📄 PDF İndir</Text>
              </TouchableOpacity>
            </>
          )}

          {/* CANCELLED */}
          {(order.status === 'CANCELLED_BY_SUPPLIER' ||
            order.status === 'CANCELLED_BY_BUYER') && (
            <View style={styles.cancelledBox}>
              <Text style={styles.cancelledText}>❌ Sipariş İptal Edildi</Text>
            </View>
          )}
        </View>
      )}

      {actionLoading && (
        <View style={styles.actionBar}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      {/* Payment Info Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Ödeme Bilgileri</Text>
            <Text style={styles.modalSubtitle}>
              Alıcının ödeme yapabileceği banka bilgilerinizi girin
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Banka Adı (ör: Ziraat Bankası)"
              value={paymentInfo.bankName}
              onChangeText={(text) => setPaymentInfo({ ...paymentInfo, bankName: text })}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="IBAN (TR ile başlayan)"
              value={paymentInfo.iban}
              onChangeText={(text) => setPaymentInfo({ ...paymentInfo, iban: text })}
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Hesap Sahibi Adı"
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
                <Text style={styles.modalButtonTextSave}>Kaydet ve Onayla</Text>
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
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  toggleIcon: {
    fontSize: 14,
    color: '#666',
  },
  summaryBox: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryRowTotal: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryValueStrike: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  partiesBox: {
    gap: 12,
  },
  partyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  partyLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  partyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  addressBox: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  notesBox: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  paymentInfoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    alignItems: 'flex-end',
  },
  itemPriceOriginal: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  itemPriceFinal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  cancellationBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  cancellationText: {
    fontSize: 14,
    color: '#C62828',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  pdfButton: {
    backgroundColor: '#667eea',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  waitingBox: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBox: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    color: '#2E7D32',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelledBox: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledText: {
    color: '#C62828',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonSave: {
    backgroundColor: '#4CAF50',
  },
  modalButtonTextCancel: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
