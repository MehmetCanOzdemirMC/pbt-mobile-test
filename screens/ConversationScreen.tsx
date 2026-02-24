import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActionSheetIOS,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useMessagingStore, Message } from '../stores/messagingStore';
import { auth, db, storage } from '../config/firebase';
import { collection, query, where, onSnapshot, or, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import OrderCard from '../components/OrderCard';

interface Order {
  id: string;
  orderId: string;
  buyerId: string;
  buyerEmail: string;
  supplierId: string;
  supplierName: string;
  items: any[];
  originalTotal: number;
  finalTotal: number;
  totalDiscount: number;
  status: string;
  paymentInfo?: any;
  cancellationReason?: string;
  createdAt?: any;
}

export default function ConversationScreen() {
  const route = useRoute();
  const { conversationId } = route.params as { conversationId: string };

  const { messages, loadMessages, sendMessage } = useMessagingStore();
  const [messageText, setMessageText] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [uploading, setUploading] = useState(false);
  const [otherParticipantId, setOtherParticipantId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const conversationMessages = messages[conversationId] || [];
  const prevMessageCountRef = useRef(0);

  const currentUserId = auth.currentUser?.uid;

  // Load conversation document to get participants
  useEffect(() => {
    const loadConversationParticipants = async () => {
      try {
        const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
        if (conversationDoc.exists()) {
          const data = conversationDoc.data();
          const participantIds = data.participantIds || [];

          // Find the other participant (not current user)
          const otherUserId = participantIds.find((id: string) => id !== currentUserId);

          console.log('[ConversationScreen] Loaded participants:', {
            conversationId,
            currentUserId,
            participantIds,
            otherParticipantId: otherUserId
          });

          setOtherParticipantId(otherUserId || null);
        }
      } catch (error) {
        console.error('[ConversationScreen] Error loading conversation:', error);
      }
    };

    if (conversationId && currentUserId) {
      loadConversationParticipants();
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    console.log('Loading messages for conversation:', conversationId);
    if (conversationId) {
      const unsubscribe = loadMessages(conversationId);
      // Return cleanup function
      return unsubscribe;
    }
  }, [conversationId]);

  // Load orders for this conversation
  useEffect(() => {
    if (!currentUserId || !otherParticipantId) return;

    console.log('Loading orders between:', currentUserId, 'and', otherParticipantId);

    // Query orders where these two users are involved
    const ordersQuery = query(
      collection(db, 'orders'),
      or(
        where('supplierId', '==', currentUserId),
        where('buyerId', '==', currentUserId)
      )
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData: Order[] = [];
      const allOrders: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        allOrders.push({ id: doc.id, ...data });

        // Only include orders between these two participants
        if (
          (data.supplierId === currentUserId && data.buyerId === otherParticipantId) ||
          (data.buyerId === currentUserId && data.supplierId === otherParticipantId)
        ) {
          ordersData.push({ id: doc.id, ...data } as Order);
        }
      });

      // Sort by creation date
      ordersData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });

      console.log('📦 [Order Query] All orders for currentUser:', allOrders.length);
      console.log('📦 [Order Query] Filtered orders (matching participants):', ordersData.length);
      console.log('📦 [Order Query] Looking for orders between:', {
        currentUserId,
        otherParticipantId
      });

      if (allOrders.length > 0 && ordersData.length === 0) {
        console.log('⚠️ [Order Query] Orders exist but NONE match participants!');
        console.log('⚠️ [Order Query] Sample order participants:', {
          sampleOrderId: allOrders[0].orderId,
          supplierId: allOrders[0].supplierId,
          buyerId: allOrders[0].buyerId,
          conversationId: allOrders[0].conversationId
        });
      }

      setOrders(ordersData);
    });

    return unsubscribe;
  }, [currentUserId, otherParticipantId]);

  useEffect(() => {
    // Only auto-scroll when NEW messages arrive (count increases)
    // Don't scroll on re-sorts or updates to existing messages
    const currentCount = conversationMessages.length;
    const prevCount = prevMessageCountRef.current;

    if (currentCount > prevCount && currentCount > 0) {
      console.log('📩 New message arrived, scrolling to bottom');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }

    prevMessageCountRef.current = currentCount;
  }, [conversationMessages.length]); // Only trigger on count change

  const handleSend = async () => {
    if (!messageText.trim()) return;

    console.log('📤 [ConversationScreen] Sending message:', {
      conversationId,
      currentUserId,
      otherParticipantId,
      messagePreview: messageText.substring(0, 30)
    });

    try {
      await sendMessage(conversationId, messageText);
      setMessageText('');
      console.log('✅ [ConversationScreen] Message sent successfully');
    } catch (error) {
      console.error('❌ [ConversationScreen] Error sending message:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi: ' + (error as Error).message);
    }
  };

  // Upload file to Firebase Storage
  const uploadToFirebase = async (uri: string, fileName: string, mimeType: string) => {
    try {
      console.log('[Upload] Starting upload:', { uri, fileName, mimeType });

      // Fetch the file as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(storage, `messages/${conversationId}/${Date.now()}_${fileName}`);

      // Upload file
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      console.log('[Upload] ✅ Upload complete:', downloadURL);
      return downloadURL;
    } catch (error: any) {
      console.error('[Upload] ❌ Error uploading file:', error);
      throw error;
    }
  };

  // Handle image picker
  const handleImagePick = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişim izni gereklidir.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7, // Compress to reduce size
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploading(true);

        try {
          // Upload to Firebase
          const downloadURL = await uploadToFirebase(
            asset.uri,
            asset.fileName || 'image.jpg',
            asset.mimeType || 'image/jpeg'
          );

          // Send message with image
          await sendMessage(conversationId, '', {
            type: 'image',
            imageUrl: downloadURL,
            fileName: asset.fileName || 'image.jpg',
          });

          console.log('[Image] ✅ Image sent successfully');
        } catch (error) {
          Alert.alert('Hata', 'Resim yüklenirken hata oluştu');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('[Image] Error picking image:', error);
      Alert.alert('Hata', 'Resim seçilirken hata oluştu');
    }
  };

  // Handle document picker
  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size (max 25MB)
        if (asset.size && asset.size > 25 * 1024 * 1024) {
          Alert.alert('Hata', 'Dosya boyutu 25MB\'dan küçük olmalıdır.');
          return;
        }

        setUploading(true);

        try {
          // Upload to Firebase
          const downloadURL = await uploadToFirebase(
            asset.uri,
            asset.name,
            asset.mimeType || 'application/octet-stream'
          );

          // Send message with file
          await sendMessage(conversationId, '', {
            type: 'file',
            fileUrl: downloadURL,
            fileName: asset.name,
            fileSize: asset.size,
            mimeType: asset.mimeType,
          });

          console.log('[File] ✅ File sent successfully');
        } catch (error) {
          Alert.alert('Hata', 'Dosya yüklenirken hata oluştu');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('[File] Error picking document:', error);
      Alert.alert('Hata', 'Dosya seçilirken hata oluştu');
    }
  };

  // Handle attachment button
  const handleAttachment = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['İptal', '📷 Resim Seç', '📎 Dosya Seç'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleImagePick();
          } else if (buttonIndex === 2) {
            handleDocumentPick();
          }
        }
      );
    } else {
      // Android: Show simple alert
      Alert.alert(
        'Dosya Ekle',
        'Hangi türde dosya eklemek istersiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: '📷 Resim', onPress: handleImagePick },
          { text: '📎 Dosya', onPress: handleDocumentPick },
        ]
      );
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === auth.currentUser?.uid;

    // Ensure text is a string (defensive check)
    const messageText = typeof item.text === 'string' ? item.text : '';
    const senderName = typeof item.senderName === 'string' ? item.senderName : 'Unknown';
    const timeStr = typeof item.createdAt === 'number' ? formatTime(item.createdAt) : '';

    const messageType = item.content?.type || 'text';
    const imageUrl = item.content?.imageUrl;
    const fileUrl = item.content?.fileUrl;
    const fileName = item.content?.fileName;

    // Handle order messages (render as OrderCard)
    if (messageType === 'order' && item.content?.metadata) {
      const orderData = item.content.metadata;

      // Find the full order from the orders array
      const fullOrder = orders.find(o => o.orderId === orderData.orderId);

      if (fullOrder) {
        return (
          <View style={styles.orderMessageContainer}>
            <OrderCard
              order={fullOrder}
              onOrderUpdate={() => {
                console.log('Order updated');
              }}
            />
          </View>
        );
      }

      // Fallback: Show order message as text if full order not found
      return (
        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft
        ]}>
          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft
          ]}>
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.messageTextRight : styles.messageTextLeft
            ]}>
              {item.content?.body || messageText}
            </Text>
          </View>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.messageTimeRight : styles.messageTimeLeft
          ]}>
            {timeStr}
          </Text>
        </View>
      );
    }

    if (!messageText && !imageUrl && !fileUrl) {
      console.warn('Invalid message item:', item);
      return null;
    }

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft
      ]}>
        {!isCurrentUser && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}

        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft
        ]}>
          {/* Image message */}
          {messageType === 'image' && imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {/* File message */}
          {messageType === 'file' && fileUrl && (
            <TouchableOpacity
              style={styles.fileContainer}
              onPress={() => Alert.alert('Dosya', fileName || 'Dosya')}
            >
              <Text style={styles.fileIcon}>📎</Text>
              <Text style={[
                styles.fileName,
                isCurrentUser ? styles.fileNameRight : styles.fileNameLeft
              ]}>
                {fileName || 'File'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Text message (or caption for image/file) */}
          {messageText && messageType === 'text' && (
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.messageTextRight : styles.messageTextLeft
            ]}>
              {messageText}
            </Text>
          )}
        </View>

        <Text style={[
          styles.messageTime,
          isCurrentUser ? styles.messageTimeRight : styles.messageTimeLeft
        ]}>
          {timeStr}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListHeaderComponent={
          <>
            {/* Empty messages prompt - show ONLY if no messages */}
            {conversationMessages.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz mesaj yok</Text>
                <Text style={styles.emptySubtext}>İlk mesajı gönderin</Text>
              </View>
            )}
          </>
        }
      />

      <View style={styles.inputContainer}>
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.uploadingText}>Yükleniyor...</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachment}
          disabled={uploading}
        >
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Mesajınızı yazın..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
          editable={!uploading}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || uploading) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={Boolean(!messageText.trim() || uploading)}
        >
          <Text style={styles.sendButtonText}>📤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    padding: 16,
  },
  ordersContainer: {
    marginBottom: 16,
  },
  ordersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  orderMessageContainer: {
    marginBottom: 16,
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  messageContainerLeft: {
    alignSelf: 'flex-start',
  },
  messageContainerRight: {
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  messageBubbleLeft: {
    backgroundColor: 'white',
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#007AFF',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: '#333',
  },
  messageTextRight: {
    color: 'white',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    gap: 8,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileNameLeft: {
    color: '#333',
  },
  fileNameRight: {
    color: 'white',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
  },
  messageTimeLeft: {
    marginLeft: 12,
  },
  messageTimeRight: {
    marginRight: 12,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
    position: 'relative',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    fontSize: 20,
  },
});
