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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessagingStore, Message } from '../stores/messagingStore';
import { auth, db, storage } from '../config/firebase';
import { collection, query, where, onSnapshot, or, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import OrderCard from '../components/OrderCard';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const route = useRoute();
  const { conversationId } = route.params as { conversationId: string };
  const insets = useSafeAreaInsets();

  const {
    messages,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    markConversationAsRead,
    hasMoreMessages,
    loadingMore
  } = useMessagingStore();
  const [messageText, setMessageText] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [uploading, setUploading] = useState(false);
  const [otherParticipantId, setOtherParticipantId] = useState<string | null>(null);
  const [otherParticipantData, setOtherParticipantData] = useState<any>(null);
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

          // Fetch other participant's user data (including photoURL)
          if (otherUserId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setOtherParticipantData({
                  name: userData.name || t('conversation.unknown'),
                  surname: userData.surname || '',
                  photoURL: userData.photoURL || null,
                  role: userData.role || 'user'
                });
              }
            } catch (error) {
              console.error('[ConversationScreen] Error loading user data:', error);
            }
          }

          // Mark conversation as read when opened
          markConversationAsRead(conversationId);
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

  // Update message count reference
  useEffect(() => {
    prevMessageCountRef.current = conversationMessages.length;
  }, [conversationMessages.length]);

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
      Alert.alert(t('conversation.error'), t('conversation.messageSendError') + ': ' + (error as Error).message);
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
        Alert.alert(t('conversation.permissionRequired'), t('conversation.galleryPermissionMessage'));
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
          Alert.alert(t('conversation.error'), t('conversation.imageUploadError'));
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('[Image] Error picking image:', error);
      Alert.alert(t('conversation.error'), t('conversation.imagePickError'));
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
          Alert.alert(t('conversation.error'), t('conversation.fileSizeError'));
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
          Alert.alert(t('conversation.error'), t('conversation.fileUploadError'));
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('[File] Error picking document:', error);
      Alert.alert(t('conversation.error'), t('conversation.filePickError'));
    }
  };

  // Handle attachment button
  const handleAttachment = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('conversation.cancel'), t('conversation.selectImage'), t('conversation.selectFile')],
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
        t('conversation.addFile'),
        t('conversation.addFilePrompt'),
        [
          { text: t('conversation.cancel'), style: 'cancel' },
          { text: t('conversation.image'), onPress: handleImagePick },
          { text: t('conversation.file'), onPress: handleDocumentPick },
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
            isCurrentUser
              ? [styles.messageBubbleRight, { backgroundColor: theme.primary }]
              : [styles.messageBubbleLeft, { backgroundColor: theme.backgroundCard }]
          ]}>
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.messageTextRight : { color: theme.textPrimary }
            ]}>
              {item.content?.body || messageText}
            </Text>
          </View>
          <Text style={[
            styles.messageTime,
            { color: theme.textDim },
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
          <Text style={[styles.senderName, { color: theme.textSecondary }]}>{senderName}</Text>
        )}

        <View style={[
          styles.messageBubble,
          isCurrentUser
            ? [styles.messageBubbleRight, { backgroundColor: theme.primary }]
            : [styles.messageBubbleLeft, { backgroundColor: theme.backgroundCard }]
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
              onPress={() => Alert.alert(t('conversation.file'), fileName || t('conversation.file'))}
            >
              <Text style={styles.fileIcon}>📎</Text>
              <Text style={[
                styles.fileName,
                isCurrentUser ? styles.fileNameRight : { color: theme.textPrimary }
              ]}>
                {fileName || t('conversation.file')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Text message (or caption for image/file) */}
          {messageText && messageType === 'text' && (
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.messageTextRight : { color: theme.textPrimary }
            ]}>
              {messageText}
            </Text>
          )}
        </View>

        <Text style={[
          styles.messageTime,
          { color: theme.textDim },
          isCurrentUser ? styles.messageTimeRight : styles.messageTimeLeft
        ]}>
          {timeStr}
        </Text>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 60}
      >
      {/* Chat Header with profile photo */}
      {otherParticipantData && (
        <View style={[styles.chatHeader, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
          {otherParticipantData.photoURL ? (
            <Image
              source={{ uri: otherParticipantData.photoURL }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.headerAvatarText}>
                {(otherParticipantData.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: theme.textPrimary }]}>
              {otherParticipantData.name} {otherParticipantData.surname}
            </Text>
            <Text style={[styles.headerStatus, { color: theme.success }]}>{t('conversation.online')}</Text>
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          // Only auto-scroll on first load or when new message arrives
          // Don't scroll when loading more old messages
          const currentCount = conversationMessages.length;
          const prevCount = prevMessageCountRef.current;
          const isLoadingMore = loadingMore[conversationId];

          if (currentCount > 0 && prevCount === 0) {
            // First load - scroll to bottom immediately
            flatListRef.current?.scrollToEnd({ animated: false });
          } else if (currentCount > prevCount && !isLoadingMore) {
            // New message arrived (not loading more) - scroll to bottom
            flatListRef.current?.scrollToEnd({ animated: true });
          }
          // If isLoadingMore = true, don't scroll (user is loading old messages)
        }}
        ListHeaderComponent={
          <>
            {/* Load More Button - show at top if there are more messages */}
            {hasMoreMessages[conversationId] && conversationMessages.length > 0 && (
              <View style={styles.loadMoreContainer}>
                <TouchableOpacity
                  style={[styles.loadMoreButton, { backgroundColor: theme.primary + '20' }]}
                  onPress={() => loadMoreMessages(conversationId)}
                  disabled={loadingMore[conversationId]}
                >
                  {loadingMore[conversationId] ? (
                    <>
                      <ActivityIndicator size="small" color={theme.primary} />
                      <Text style={[styles.loadMoreText, { color: theme.primary }]}>{t('conversation.loading')}</Text>
                    </>
                  ) : (
                    <Text style={[styles.loadMoreText, { color: theme.primary }]}>{t('conversation.loadOldMessages')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Empty messages prompt - show ONLY if no messages */}
            {conversationMessages.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('conversation.noMessages')}</Text>
                <Text style={[styles.emptySubtext, { color: theme.textDim }]}>{t('conversation.sendFirstMessage')}</Text>
              </View>
            )}
          </>
        }
      />

      <View style={[
        styles.inputContainer,
        { backgroundColor: theme.backgroundCard, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 8) }
      ]}>
        {uploading && (
          <View style={[styles.uploadingOverlay, { backgroundColor: theme.backgroundCard + 'F0' }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.uploadingText, { color: theme.primary }]}>{t('conversation.uploading')}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.attachButton, { backgroundColor: theme.background }]}
          onPress={handleAttachment}
          disabled={uploading}
        >
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.textPrimary }]}
          placeholder={t('conversation.typeMessage')}
          placeholderTextColor={theme.textDim}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
          editable={!uploading}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: theme.primary },
            (!messageText.trim() || uploading) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={Boolean(!messageText.trim() || uploading)}
        >
          <Text style={styles.sendButtonText}>📤</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerStatus: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  loadMoreText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
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
