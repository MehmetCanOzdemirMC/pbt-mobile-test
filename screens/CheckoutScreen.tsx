import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCartStore } from '../stores/cartStore';
import { useMessagingStore } from '../stores/messagingStore';
import { auth, db } from '../config/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export default function CheckoutScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { items: cart, totalPrice: getTotalPrice, clearCart } = useCartStore();
  const { startConversation, sendMessageById } = useMessagingStore();
  const totalPrice = getTotalPrice();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Hata', 'Lütfen teslimat adresi girin');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Hata', 'Sepetiniz boş');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
      return;
    }

    Alert.alert(
      'Sipariş Onayı',
      `Toplam ${cart.length} ürün için $${totalPrice.toLocaleString()} tutarında sipariş oluşturulacak. Onaylıyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Onayla', onPress: () => createOrder() },
      ]
    );
  };

  const createOrder = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Fetch buyer's company name from profile
      let buyerCompany = '';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          buyerCompany = userDoc.data().companyName || '';
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }

      // Group items by supplier
      const supplierGroups: { [supplierId: string]: any[] } = {};
      cart.forEach(item => {
        console.log('Cart item:', { id: item.id, supplierId: item.supplierId, supplierName: item.supplierName });

        // Check if supplierId exists
        if (!item.supplierId || item.supplierId === '') {
          console.error('⚠️ HATA: Item supplierId boş!', item);
          Alert.alert('Hata', `Taş ${item.stoneId} için tedarikçi bilgisi eksik. Lütfen bu taşı sepetten çıkarıp tekrar ekleyin.`);
          throw new Error('Supplier ID missing');
        }

        if (!supplierGroups[item.supplierId]) {
          supplierGroups[item.supplierId] = [];
        }
        supplierGroups[item.supplierId].push(item);
      });

      console.log('Supplier groups:', Object.keys(supplierGroups));

      // Show debug alert
      const supplierIds = Object.keys(supplierGroups);
      console.log('📊 Sipariş özeti:', {
        totalSuppliers: supplierIds.length,
        suppliers: supplierIds,
        totalItems: cart.length
      });

      // STEP 1: Create all orders first
      const orderPromises = Object.entries(supplierGroups).map(async ([supplierId, items]) => {
        const orderTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

        console.log('Creating order for supplier:', supplierId, 'with', items.length, 'items');

        // Create order document
        const orderData = {
          orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buyerId: user.uid,
          buyerEmail: user.email,
          buyerCompany: buyerCompany, // Company name from user profile
          supplierId: supplierId,
          supplierName: items[0].supplierName || 'Unknown Supplier',
          items: items.map(item => ({
            stoneId: item.id, // Use Firestore document ID, not numeric stoneId
            id: item.stoneId, // Store numeric ID as "id" field
            carat: item.carat,
            shape: item.shape,
            color: item.color,
            clarity: item.clarity,
            cut: item.cut,
            polish: item.polish,
            symmetry: item.symmetry,
            originalPrice: item.totalPrice,
            finalPrice: item.totalPrice,
            finalPricePerCarat: item.pricePerCarat,
          })),
          originalTotal: orderTotal,
          finalTotal: orderTotal,
          totalDiscount: 0,
          status: 'NEGOTIATING',
          deliveryAddress: deliveryAddress.trim(),
          notes: notes.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const orderRef = await addDoc(collection(db, 'orders'), orderData);
        console.log('✅ Order created:', orderRef.id, 'for supplier:', supplierId);

        // Verify the order was saved correctly
        const savedOrder = await getDoc(doc(db, 'orders', orderRef.id));
        if (savedOrder.exists()) {
          const data = savedOrder.data();
          console.log('✅ Order verification:', {
            orderId: orderRef.id,
            supplierId: data.supplierId,
            buyerId: data.buyerId,
            itemCount: data.items.length
          });

          if (data.supplierId !== supplierId) {
            console.error('⚠️ HATA: SupplierId eşleşmiyor!', {
              expected: supplierId,
              actual: data.supplierId
            });
          }
        }

        return { orderId: orderRef.id, supplierId, items };
      });

      const results = await Promise.all(orderPromises);
      console.log('All orders created successfully');

      // STEP 2: Update stones to reserved (one by one, not in batch)
      const unavailableStones: string[] = [];

      for (const { orderId, items } of results) {
        for (const item of items) {
          try {
            // item.stoneId now contains Firestore document ID (after our fix)
            // item.id now contains numeric ID
            const stoneRef = doc(db, 'stones', item.stoneId);

            // First, check current stone status
            const stoneDoc = await getDoc(stoneRef);
            if (!stoneDoc.exists()) {
              console.error('Stone not found:', item.stoneId);
              unavailableStones.push(item.id); // Show numeric ID to user
              continue; // Skip this stone
            }

            const currentStatus = stoneDoc.data()?.status || 'unknown';
            console.log('Stone current status before reserve:', item.stoneId, currentStatus);

            // Check if stone is available
            if (currentStatus !== 'available') {
              console.warn('Stone not available:', item.stoneId, 'Status:', currentStatus);
              unavailableStones.push(item.id); // Show numeric ID to user
              continue; // Skip this stone, don't try to reserve it
            }

            // Try to reserve the stone
            await updateDoc(stoneRef, {
              status: 'reserved',
              reservedBy: user.uid,
              reservedAt: serverTimestamp(),
              orderId: orderId,
            });
            console.log('✅ Stone reserved successfully:', item.stoneId);

          } catch (error: any) {
            console.error('❌ Error reserving stone:', item.stoneId, error.message);
            unavailableStones.push(item.id); // Show numeric ID to user
            // Continue with other stones instead of stopping
          }
        }
      }

      // Show warning if some stones couldn't be reserved
      if (unavailableStones.length > 0) {
        Alert.alert(
          'Uyarı',
          `Bazı taşlar artık mevcut değil ve siparişe eklenemedi:\n${unavailableStones.join(', ')}\n\nDiğer taşlar için sipariş oluşturuldu.`
        );
      }

      // STEP 3: Clear cart fields (only for successfully reserved stones)
      for (const { items } of results) {
        for (const item of items) {
          // Skip if this stone was unavailable (item.id is numeric ID)
          if (unavailableStones.includes(item.id)) {
            console.log('Skipping cart clear for unavailable stone:', item.id);
            continue;
          }

          try {
            // item.stoneId is now Firestore document ID
            const stoneRef = doc(db, 'stones', item.stoneId);
            await updateDoc(stoneRef, {
              inCarts: [],
              cartCount: 0,
              cartDetails: {},
            });
            console.log('✅ Cart fields cleared:', item.stoneId);
          } catch (error) {
            console.error('❌ Error clearing cart fields:', item.stoneId, error);
          }
        }
      }

      // STEP 4: Clear cart
      await clearCart();

      // STEP 5: Create conversations and send order messages (EXACT WEB PATTERN)
      console.log('🚀 STEP 5: Creating conversations and sending order messages');

      // Verify auth token is still valid
      const currentAuthUser = auth.currentUser;
      if (!currentAuthUser) {
        throw new Error('Auth state lost during checkout');
      }

      // Get fresh auth token
      const token = await currentAuthUser.getIdToken(true);
      console.log('✅ Auth token refreshed, length:', token.length);

      const conversationIds: string[] = [];

      for (const { orderId, supplierId, items } of results) {
        try {
          console.log(`\n📦 Processing order ${orderId} for supplier ${supplierId}`);

          // Get supplier info
          const supplierDoc = await getDoc(doc(db, 'users', supplierId));
          const supplierData = supplierDoc.data();
          const supplierName = supplierData?.name || supplierData?.email || 'Unknown Supplier';
          const supplierRole = supplierData?.role || 'supplierLocal';

          console.log('👤 Supplier info:', { supplierName, supplierRole });

          // Create or get conversation (matches web's startConversation)
          console.log('🔄 Creating/getting conversation...');
          const conversationId = await startConversation(supplierId, supplierRole, supplierName);
          conversationIds.push(conversationId);

          console.log('✅ Conversation ready:', conversationId);

          // Get order document to retrieve orderId and data
          const orderDoc = await getDoc(doc(db, 'orders', orderId));
          const orderData = orderDoc.data();

          if (!orderData) {
            console.error('❌ Order data not found for:', orderId);
            continue;
          }

          // Update order with conversationId (CRITICAL - matches web)
          await updateDoc(doc(db, 'orders', orderId), {
            conversationId: conversationId,
          });
          console.log('✅ Order updated with conversationId:', orderId);

          // Send order message (EXACT WEB FORMAT)
          const orderTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

          console.log('📤 Sending order message...');
          await sendMessageById(conversationId, {
            type: 'order',
            body: `📦 Yeni sipariş oluşturuldu: ${orderData.orderId}\n\n${items.length} ürün\nToplam: $${orderTotal.toLocaleString()}`,
            metadata: {
              orderId: orderData.orderId,
              orderStatus: 'NEGOTIATING',
              itemCount: items.length,
              totalAmount: orderTotal,
              items: orderData.items
            }
          });

          console.log('✅ Order message sent to conversation:', conversationId);

        } catch (error: any) {
          console.error('❌ Error creating conversation or sending message:', error);
          console.error('❌ Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
          });
          // Continue with other orders even if one fails
        }
      }

      console.log('🎉 Sipariş başarıyla tamamlandı!');

      // Navigate to conversation with first supplier
      const firstConversationId = conversationIds[0];

      Alert.alert(
        'Başarılı! 🎉',
        `Siparişiniz oluşturuldu.\n\n${results.length} sipariş oluşturuldu.\n\nTedarikçi ile görüşmek için mesajlaşma ekranına yönlendiriliyorsunuz.`,
        [
          {
            text: 'Mesajlaşmaya Git',
            onPress: () => {
              if (firstConversationId) {
                navigation.navigate('Conversation' as never, { conversationId: firstConversationId } as never);
              } else {
                navigation.navigate('MainTabs' as never);
              }
            }
          },
          { text: 'Ana Sayfa', onPress: () => navigation.navigate('MainTabs' as never), style: 'cancel' },
        ]
      );
    } catch (error: any) {
      console.error('Order creation error:', error);
      Alert.alert('Hata', error.message || 'Sipariş oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Sepetiniz Boş</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Önce sepete ürün ekleyin</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.scrollView}>
        {/* Order Summary */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Sipariş Özeti</Text>
          <View style={[styles.summaryBox, { backgroundColor: theme.backgroundCard }]}>
            <View style={[styles.summaryRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Ürün Sayısı:</Text>
              <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>{cart.length} adet</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Toplam Karat:</Text>
              <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>
                {cart.reduce((sum, item) => sum + item.carat, 0).toFixed(2)} CT
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={[styles.summaryLabelTotal, { color: theme.textPrimary }]}>Toplam Tutar:</Text>
              <Text style={[styles.summaryValueTotal, { color: theme.primary }]}>${totalPrice.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Ürünler ({cart.length})</Text>
          {cart.map((item) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.backgroundCard }]}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemStoneId, { color: theme.textPrimary }]}>💎 {item.stoneId}</Text>
                <Text style={[styles.itemPrice, { color: theme.primary }]}>${item.totalPrice.toLocaleString()}</Text>
              </View>
              <Text style={[styles.itemSpecs, { color: theme.textSecondary }]}>
                {item.carat} CT • {item.shape} • {item.color}/{item.clarity}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Teslimat Adresi *</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.backgroundCard, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Tam adresinizi yazın..."
            placeholderTextColor={theme.textDim}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Notes */}
        <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Notlar (Opsiyonel)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.backgroundCard, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Tedarikçiye notunuz..."
            placeholderTextColor={theme.textDim}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { borderTopColor: theme.borderLight, backgroundColor: theme.backgroundCard }]}>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Toplam</Text>
          <Text style={[styles.totalValue, { color: theme.textPrimary }]}>${totalPrice.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.orderButton, { backgroundColor: theme.success }, loading && styles.orderButtonDisabled]}
          onPress={handleCreateOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.orderButtonText}>Sipariş Oluştur</Text>
          )}
        </TouchableOpacity>
      </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  summaryBox: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
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
  itemCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemStoneId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  itemSpecs: {
    fontSize: 12,
    color: '#666',
  },
  textArea: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 12,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  orderButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  orderButtonDisabled: {
    backgroundColor: '#ccc',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
