import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useMessagingStore, Conversation } from '../stores/messagingStore';
import { auth } from '../config/firebase';
import { Alert } from 'react-native';

type RootStackParamList = {
  MainTabs: undefined;
  Conversation: { conversationId: string };
};

export default function MessagesScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { conversations, loading, loadConversations, startConversation } = useMessagingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  // Debug: Log conversations to see what we're getting
  useEffect(() => {
    console.log('Conversations in MessagesScreen:', conversations);
    console.log('Is array?', Array.isArray(conversations));
    console.log('Length:', conversations?.length);
  }, [conversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const getOtherUserName = (conversation: Conversation) => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return 'Unknown';

      if (!conversation.participants || !Array.isArray(conversation.participants)) {
        return 'Unknown';
      }

      const otherUserId = conversation.participants.find(id => id !== currentUserId);
      if (!otherUserId) return 'Unknown';

      const name = conversation.participantNames?.[otherUserId];
      return (typeof name === 'string' ? name : 'Unknown');
    } catch (error) {
      console.error('Error getting other user name:', error);
      return 'Unknown';
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
        return `${days} gün önce`;
      } else if (hours > 0) {
        return `${hours} saat önce`;
      } else {
        return 'Az önce';
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
    const lastMsg = typeof item.lastMessage === 'string' ? item.lastMessage : 'Henüz mesaj yok';

    return (
      <TouchableOpacity
        style={styles.conversationCard}
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
              Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı');
              return;
            }

            const otherUserId = item.participants.find((id: string) => id !== currentUserId);
            if (!otherUserId) {
              Alert.alert('Hata', 'Karşı kullanıcı bulunamadı');
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
          } catch (error) {
            console.error('❌ [MessagesScreen] Error finding conversation:', error);
            Alert.alert('Hata', 'Konuşma açılırken hata oluştu');
          } finally {
            setNavigating(false);
          }
        }}
        disabled={navigating}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName}>{userName}</Text>
            <Text style={styles.conversationTime}>{timeStr}</Text>
          </View>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMsg}
          </Text>
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Safety check: Ensure conversations is an array
  const conversationsArray = Array.isArray(conversations) ? conversations : [];

  if (loading && conversationsArray.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
      </View>
    );
  }

  if (conversationsArray.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyTitle}>Henüz Mesajınız Yok</Text>
        <Text style={styles.emptyText}>
          Tedarikçilerle veya müşterilerle sohbet başlatın
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversationsArray}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
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
  conversationTime: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
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
