import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useMessagingStore, Conversation } from '../stores/messagingStore';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

type RootStackParamList = {
  MainTabs: undefined;
  Conversation: { conversationId: string };
};

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { conversations, loading, startConversation } = useMessagingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState<{ [userId: string]: string | null }>({});

  // Note: loadConversations is already called in App.tsx (MainTabs)
  // No need to call it here again to avoid duplicate listeners

  // Debug: Log conversations to see what we're getting
  useEffect(() => {
    console.log('Conversations in MessagesScreen:', conversations);
    console.log('Is array?', Array.isArray(conversations));
    console.log('Length:', conversations?.length);
  }, [conversations]);

  // Fetch profile photos for conversation participants
  useEffect(() => {
    const fetchProfilePhotos = async () => {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId || !Array.isArray(conversations)) return;

      const photosToFetch: { [userId: string]: string | null } = {};

      // Collect all participant IDs that need photos
      for (const conv of conversations) {
        if (!conv.participants || !Array.isArray(conv.participants)) continue;

        for (const participantId of conv.participants) {
          if (participantId === currentUserId) continue; // Skip current user
          if (profilePhotos[participantId] !== undefined) continue; // Already fetched

          // Check if conversation already has the photo
          const hasPhoto = conv.participantPhotos?.[participantId];
          if (hasPhoto) {
            photosToFetch[participantId] = hasPhoto;
          } else {
            // Fetch from users collection
            try {
              const userDoc = await getDoc(doc(db, 'users', participantId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                photosToFetch[participantId] = userData.photoURL || null;
              }
            } catch (error) {
              console.error('Error fetching profile photo for', participantId, error);
              photosToFetch[participantId] = null;
            }
          }
        }
      }

      // Update state with fetched photos
      if (Object.keys(photosToFetch).length > 0) {
        setProfilePhotos(prev => ({ ...prev, ...photosToFetch }));
      }
    };

    fetchProfilePhotos();
  }, [conversations]);

  const onRefresh = () => {
    setRefreshing(true);
    // Real-time listener is already active in App.tsx
    // Just show refresh animation briefly
    setTimeout(() => setRefreshing(false), 500);
  };

  const getOtherUserName = (conversation: Conversation) => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return t('messages.unknown');

      if (!conversation.participants || !Array.isArray(conversation.participants)) {
        return t('messages.unknown');
      }

      const otherUserId = conversation.participants.find(id => id !== currentUserId);
      if (!otherUserId) return t('messages.unknown');

      const name = conversation.participantNames?.[otherUserId];
      return (typeof name === 'string' ? name : t('messages.unknown'));
    } catch (error) {
      console.error('Error getting other user name:', error);
      return t('messages.unknown');
    }
  };

  const formatTime = (timestamp: number) => {
    try {
      if (!timestamp || typeof timestamp !== 'number') return '';

      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (days > 7) {
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      } else if (days > 0) {
        return t('messages.daysAgo', { count: days });
      } else if (hours > 0) {
        return t('messages.hoursAgo', { count: hours });
      } else {
        return t('messages.justNow');
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    // Ensure item is a valid conversation object
    if (!item || typeof item !== 'object' || !item.id) {
      console.warn('Invalid conversation item:', item);
      return null;
    }

    const userName = getOtherUserName(item);
    const timeStr = formatTime(item.lastMessageTime);
    const lastMsg = typeof item.lastMessage === 'string' ? item.lastMessage : t('messages.noMessagesYet');
    const hasUnread = (item.unreadCount || 0) > 0;

    // Get other user's photo (try conversation first, then fetched cache)
    const currentUserId = auth.currentUser?.uid;
    const otherUserId = item.participants.find((id: string) => id !== currentUserId);
    const otherUserPhoto = otherUserId
      ? (item.participantPhotos?.[otherUserId] || profilePhotos[otherUserId] || null)
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border },
          hasUnread && { backgroundColor: theme.primary + '15' }
        ]}
        onPress={async () => {
          if (navigating) return; // Prevent double-tap
          setNavigating(true);

          try {
            console.log('🔍 [MessagesScreen] Original conversation:', {
              conversationId: item.id,
              participants: item.participants,
              userName,
              currentUser: auth.currentUser?.email
            });

            // Find the other participant
            const currentUserId = auth.currentUser?.uid;
            if (!currentUserId) {
              Alert.alert(t('messages.error'), t('messages.userSessionNotFound'));
              return;
            }

            const otherUserId = item.participants.find((id: string) => id !== currentUserId);
            if (!otherUserId) {
              Alert.alert(t('messages.error'), t('messages.otherUserNotFound'));
              return;
            }

            // Get name from participantNames mapping or use the userName from getOtherUserName
            const otherUserName = item.participantNames?.[otherUserId] || userName;
            const otherUserRole = 'verifiedRetailer'; // Default role, startConversation will handle this

            console.log('🔄 [MessagesScreen] Finding canonical conversation...');

            // Use startConversation to get the canonical conversation ID
            const canonicalConvId = await startConversation(otherUserId, otherUserRole, otherUserName);

            console.log('✅ [MessagesScreen] Canonical conversation:', {
              original: item.id,
              canonical: canonicalConvId,
              same: item.id === canonicalConvId
            });

            // Navigate to the canonical conversation
            navigation.navigate('Conversation', { conversationId: canonicalConvId });

            // Note: markConversationAsRead will be called in ConversationScreen
            // No need to call it here
          } catch (error) {
            console.error('❌ [MessagesScreen] Error finding conversation:', error);
            Alert.alert(t('messages.error'), t('messages.conversationOpenError'));
          } finally {
            setNavigating(false);
          }
        }}
        disabled={navigating}
      >
        {otherUserPhoto ? (
          <Image
            source={{ uri: otherUserPhoto }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[
              styles.conversationName,
              { color: theme.textPrimary },
              hasUnread && { fontWeight: 'bold' }
            ]}>{userName}</Text>
            <Text style={[styles.conversationTime, { color: theme.textDim }]}>{timeStr}</Text>
          </View>

          <Text style={[
            styles.lastMessage,
            { color: theme.textSecondary },
            hasUnread && { fontWeight: '600', color: theme.textPrimary }
          ]} numberOfLines={1}>
            {lastMsg}
          </Text>
        </View>

        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.error }]}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Safety check: Ensure conversations is an array and sort by last message time
  const conversationsArray = Array.isArray(conversations)
    ? [...conversations].sort((a, b) => {
        // Sort by lastMessageTime, newest first
        const timeA = a.lastMessageTime || 0;
        const timeB = b.lastMessageTime || 0;
        return timeB - timeA;
      })
    : [];

  if (loading && conversationsArray.length === 0) {
    return (
      <ScreenWrapper>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('messages.loadingMessages')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (conversationsArray.length === 0) {
    return (
      <ScreenWrapper>
        <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('messages.noMessagesYet')}</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('messages.startChatWithSuppliers')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={conversationsArray}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      </View>
    </ScreenWrapper>
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 0,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  conversationCardUnread: {
    backgroundColor: '#f0f7ff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  conversationNameUnread: {
    fontWeight: 'bold',
    color: '#000',
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
