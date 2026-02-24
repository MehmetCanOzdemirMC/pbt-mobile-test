import { create } from 'zustand';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  addDoc,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
  read: boolean;
  content?: {
    type: 'text' | 'image' | 'file' | 'order';
    body?: string;
    imageUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: {
      orderId?: string;
      orderStatus?: string;
      totalAmount?: number;
      itemCount?: number;
      items?: any[];
    };
  };
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

interface MessagingState {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  loading: boolean;
  activeConversationId: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => (() => void) | undefined;
  sendMessage: (conversationId: string, text: string, attachment?: any) => Promise<void>;
  createConversation: (otherUserId: string, otherUserName: string) => Promise<string>;
  setActiveConversation: (conversationId: string | null) => void;
  startConversation: (recipientId: string, recipientRole: string, recipientName: string) => Promise<string>;
  sendMessageById: (conversationId: string, content: any) => Promise<void>;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  conversations: [],
  messages: {},
  loading: false,
  activeConversationId: null,

  // Load user's conversations
  loadConversations: async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      set({ loading: true });

      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participantIds', 'array-contains', user.uid), // Use participantIds (web format)
        limit(50)
      );

      const snapshot = await getDocs(q);
      console.log('Conversations found:', snapshot.size);
      const conversationsData: Conversation[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Extract participant names from web format
        const participantNames: { [key: string]: string } = {};
        if (data.participants && Array.isArray(data.participants)) {
          data.participants.forEach((p: any) => {
            if (p.userId && p.displayName) {
              participantNames[p.userId] = p.displayName;
            }
          });
        }

        // Handle lastMessage - it might be a string or an object
        let lastMessageText = '';
        if (typeof data.lastMessage === 'string') {
          lastMessageText = data.lastMessage;
        } else if (data.lastMessage && typeof data.lastMessage === 'object') {
          // If lastMessage is an object, extract content/text field
          lastMessageText = data.lastMessage.content || data.lastMessage.text || '';
        }

        conversationsData.push({
          id: doc.id,
          participants: data.participantIds || [],
          participantNames,
          lastMessage: lastMessageText,
          lastMessageTime: data.lastMessageTime?.toMillis() || 0,
          unreadCount: 0,
        });
      });

      // DEDUPLICATE: Remove duplicate conversations with same participants
      const uniqueConversations: Conversation[] = [];
      const seenParticipantSets = new Set<string>();

      conversationsData.forEach((conv) => {
        // Create a sorted key from participants to identify duplicates
        const participantKey = [...conv.participants].sort().join('_');

        if (!seenParticipantSets.has(participantKey)) {
          seenParticipantSets.add(participantKey);
          uniqueConversations.push(conv);
        } else {
          console.warn('🚨 Duplicate conversation detected:', conv.id, 'Participants:', conv.participants);
        }
      });

      console.log(`Conversations: ${conversationsData.length} total, ${uniqueConversations.length} unique`);

      set({ conversations: uniqueConversations });
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      set({ loading: false });
    }
  },

  // Load messages for a conversation with real-time listener
  loadMessages: (conversationId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    // Use 'messages' collection (not subcollection) to match web app
    const messagesRef = collection(db, 'messages');
    // Remove orderBy to avoid composite index requirement
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      limit(100)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Messages snapshot size:', snapshot.size);
      const messagesData: Message[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Extract text content safely
        let textContent = '';
        if (typeof data.content === 'string') {
          textContent = data.content;
        } else if (typeof data.text === 'string') {
          textContent = data.text;
        } else if (data.content && typeof data.content === 'object') {
          // Handle different message types
          if (data.content.type === 'file') {
            // File message (PDF, images, etc.)
            textContent = `📎 ${data.content.fileName || 'Dosya'}`;
          } else if (data.content.type === 'image') {
            // Image message
            textContent = data.content.body || '🖼️ Resim';
          } else if (data.content.type === 'order') {
            // Order message
            textContent = data.content.body || '📦 Sipariş';
          } else if (data.content.type === 'inventory_card') {
            // Inventory card message
            textContent = `📦 ${data.content.body || 'Stok Kartı'}`;
          } else if (data.content.type === 'trade_proposal') {
            // Trade proposal message
            textContent = `💰 ${data.content.body || 'Ticaret Teklifi'}`;
          } else {
            // Regular text message
            textContent = data.content.body || data.content.text || '';
          }
        } else if (data.text && typeof data.text === 'object') {
          textContent = data.text.body || data.text.text || '';
        }

        // Extract timestamp - web uses 'timestamp', mobile uses 'createdAt'
        let timestamp = 0;
        if (data.timestamp?.toMillis) {
          timestamp = data.timestamp.toMillis();
        } else if (data.createdAt?.toMillis) {
          timestamp = data.createdAt.toMillis();
        } else if (typeof data.timestamp === 'number') {
          timestamp = data.timestamp;
        } else if (typeof data.createdAt === 'number') {
          timestamp = data.createdAt;
        }

        // Warn about invalid timestamps
        if (timestamp === 0 || !timestamp) {
          console.warn('⚠️ Message with invalid timestamp (0):', doc.id, textContent.substring(0, 40));
        }
        const currentTime = Date.now();
        if (timestamp > currentTime + 86400000) { // More than 1 day in the future
          console.warn('⚠️ Message with future timestamp:', doc.id, new Date(timestamp).toLocaleString(), textContent.substring(0, 40));
        }

        // Get sender name from message or fallback to conversation participants
        let senderDisplayName = data.senderName || '';

        // If senderName is missing/empty, try to get it from current conversation participants
        if (!senderDisplayName && data.senderId) {
          const currentConversation = get().conversations.find(c => c.id === conversationId);
          if (currentConversation && currentConversation.participantNames) {
            senderDisplayName = currentConversation.participantNames[data.senderId] || 'Unknown';
          } else {
            senderDisplayName = 'Unknown';
          }
        }

        messagesData.push({
          id: doc.id,
          conversationId,
          senderId: data.senderId || '',
          senderName: senderDisplayName || 'Unknown',
          text: textContent,
          createdAt: timestamp,
          read: data.read || false,
          content: typeof data.content === 'object' ? data.content : undefined,
        });
      });

      console.log('Processed messages:', messagesData.length);

      // Sort by createdAt (client-side) - oldest first
      messagesData.sort((a, b) => a.createdAt - b.createdAt);

      // Debug: Show first and last message timestamps
      if (messagesData.length > 0) {
        console.log('First message (oldest):', new Date(messagesData[0].createdAt).toLocaleString(), messagesData[0].text?.substring(0, 30));
        console.log('Last message (newest):', new Date(messagesData[messagesData.length - 1].createdAt).toLocaleString(), messagesData[messagesData.length - 1].text?.substring(0, 30));

        // Debug: Show last 5 messages with timestamps to identify the problematic ones
        console.log('\n=== LAST 5 MESSAGES ===');
        messagesData.slice(-5).forEach((msg, idx) => {
          console.log(`[${idx}] ${new Date(msg.createdAt).toLocaleString()} (${msg.createdAt}) - ${msg.text?.substring(0, 40)}`);
        });
      }

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: messagesData,
        },
      }));
    });

    // Return unsubscribe function for cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  },

  // Send a message
  sendMessage: async (conversationId: string, text: string, attachment?: any) => {
    const user = auth.currentUser;
    if (!user || (!text.trim() && !attachment)) return;

    console.log('📨 [messagingStore] sendMessage called:', {
      conversationId,
      userId: user.uid,
      userEmail: user.email,
      textPreview: text.substring(0, 30),
      hasAttachment: !!attachment
    });

    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const senderName = userData?.name || userData?.email || 'Unknown';
      const senderRole = userData?.role || 'unverified';

      console.log('👤 [messagingStore] Sender info:', { senderName, senderRole });

      // Use 'messages' collection (match web app format EXACTLY)
      const messagesRef = collection(db, 'messages');

      // Build content object
      let content: any;
      if (attachment) {
        // Image or file attachment
        content = {
          type: attachment.type || 'text',
          body: text.trim() || (attachment.fileName || 'File'),
          ...(attachment.imageUrl && { imageUrl: attachment.imageUrl }),
          ...(attachment.fileUrl && { fileUrl: attachment.fileUrl }),
          ...(attachment.fileName && { fileName: attachment.fileName }),
          ...(attachment.fileSize && { fileSize: attachment.fileSize }),
          ...(attachment.mimeType && { mimeType: attachment.mimeType }),
        };
      } else {
        // Text only
        content = {
          type: 'text',
          body: text.trim()
        };
      }

      // MATCH WEB FORMAT: content is an object with type and body
      console.log('📝 [messagingStore] Creating message document:', {
        conversationId,
        senderId: user.uid,
        contentType: content.type
      });

      const messageDoc = await addDoc(messagesRef, {
        conversationId,
        senderId: user.uid,
        senderName,
        senderRole,
        content,
        channel: 'internal',
        status: 'sent',
        timestamp: Timestamp.now(), // Web uses 'timestamp' not 'createdAt'
        readBy: [],
        flags: {
          isUrgent: false,
          requiresResponse: false
        }
      });

      console.log('✅ [messagingStore] Message created with ID:', messageDoc.id);

      // Update conversation's last message
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: {
          content,
          senderId: user.uid,
          senderRole,
          timestamp: Timestamp.now()
        },
        lastMessageAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log('✅ [messagingStore] Conversation lastMessage updated');

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Create a new conversation
  createConversation: async (otherUserId: string, otherUserName: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
      // Get current user's name
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentUserName = userData?.name || userData?.email || 'Unknown';

      // Check if conversation already exists
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participantIds', 'array-contains', user.uid) // Use participantIds (web format)
      );

      const snapshot = await getDocs(q);
      let existingConversationId: string | null = null;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participantIds && data.participantIds.includes(otherUserId)) {
          existingConversationId = doc.id;
        }
      });

      if (existingConversationId) {
        return existingConversationId;
      }

      // Create new conversation (match web format)
      const newConversation = await addDoc(conversationsRef, {
        participantIds: [user.uid, otherUserId],
        participants: [
          { userId: user.uid, displayName: currentUserName },
          { userId: otherUserId, displayName: otherUserName }
        ],
        lastMessage: '',
        lastMessageTime: Timestamp.now(),
        createdAt: Timestamp.now(),
        type: 'direct',
      });

      return newConversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  // Set active conversation
  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversationId: conversationId });
  },

  // Start conversation (create or get existing) - matches web pattern
  startConversation: async (recipientId: string, recipientRole: string, recipientName: string) => {
    console.log('[Mobile] 🔐 Checking auth state...');
    const user = auth.currentUser;

    if (!user) {
      console.error('❌ User not authenticated - auth.currentUser is null');
      throw new Error('Not authenticated');
    }

    console.log('[Mobile] ✅ User authenticated:', {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous
    });

    try {
      console.log('[Mobile] 🚀 Starting conversation with:', {
        currentUserId: user.uid,
        recipientId,
        recipientRole,
        recipientName
      });

      // CRITICAL: Use deterministic conversation ID (sorted user IDs) like web
      const participants = [user.uid, recipientId].sort();
      const deterministicId = participants.join('_');

      console.log('[Mobile] 📝 Deterministic conversation ID:', deterministicId);
      console.log('[Mobile] 👥 Participants (sorted):', participants);

      // STEP 1: Check if deterministic ID conversation exists
      const deterministicRef = doc(db, 'conversations', deterministicId);
      const deterministicSnap = await getDoc(deterministicRef);

      if (deterministicSnap.exists()) {
        console.log('[Mobile] ✅ Found conversation by deterministic ID:', deterministicId);
        return deterministicId;
      }

      // STEP 2: Query for ANY conversation with these participants (handles web-created random IDs)
      console.log('[Mobile] 🔍 Searching for existing conversation by participants...');
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participantIds', 'array-contains', user.uid)
      );

      const querySnapshot = await getDocs(q);
      let existingConvId: string | null = null;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const convParticipants = data.participantIds || [];

        // Check if this conversation has EXACTLY these two participants
        if (
          convParticipants.length === 2 &&
          convParticipants.includes(user.uid) &&
          convParticipants.includes(recipientId)
        ) {
          existingConvId = docSnap.id;
          console.log('[Mobile] ✅ Found existing conversation:', existingConvId);
        }
      });

      if (existingConvId) {
        console.log('[Mobile] 🔄 Using existing conversation (not deterministic ID):', existingConvId);
        return existingConvId;
      }

      console.log('[Mobile] 🆕 Creating new conversation with deterministic ID...');

      // Get current user's data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentUserName = userData?.name || userData?.email || 'Unknown';
      const currentUserRole = userData?.role || 'verifiedRetailer';

      console.log('[Mobile] 👤 Current user data:', {
        name: currentUserName,
        role: currentUserRole
      });

      const conversationData = {
        type: 'direct',
        participantIds: participants,
        participants: [
          { userId: user.uid, displayName: currentUserName, role: currentUserRole },
          { userId: recipientId, displayName: recipientName, role: recipientRole }
        ],
        status: 'active',
        lastMessage: '',
        lastMessageAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messageCount: 0,
        unreadCounts: {
          [user.uid]: 0,
          [recipientId]: 0
        }
      };

      console.log('[Mobile] 📝 Conversation data to create:', JSON.stringify(conversationData, null, 2));

      // CRITICAL: Verify user is in participantIds before calling setDoc
      const userIsInParticipants = conversationData.participantIds.includes(user.uid);
      console.log('[Mobile] 🔍 Verification before setDoc:', {
        userUid: user.uid,
        participantIds: conversationData.participantIds,
        userIsInParticipants: userIsInParticipants
      });

      if (!userIsInParticipants) {
        throw new Error(`User ${user.uid} is NOT in participantIds array!`);
      }

      console.log('[Mobile] ✅ User verified in participantIds, calling setDoc...');

      // Create new conversation with deterministic ID
      const newConversationRef = doc(db, 'conversations', deterministicId);
      await setDoc(newConversationRef, conversationData);

      console.log('[Mobile] ✅ setDoc completed successfully');

      // Verify conversation was created
      const verifySnap = await getDoc(newConversationRef);
      if (verifySnap.exists()) {
        console.log('[Mobile] ✅ Conversation verified in Firestore:', deterministicId);
      } else {
        console.error('[Mobile] ❌ Conversation NOT found after setDoc!');
      }

      return deterministicId;
    } catch (error: any) {
      console.error('❌ [Mobile] Error starting conversation:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  },

  // Send message by conversation ID with metadata support - matches web pattern
  sendMessageById: async (conversationId: string, content: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
      console.log('[Mobile] 🔍 Verifying conversation exists:', conversationId);

      // Get conversation to find recipient
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (!conversationSnap.exists()) {
        console.error('❌ Conversation not found:', conversationId);
        throw new Error('Conversation not found');
      }

      const conversationData = conversationSnap.data();
      console.log('[Mobile] ✅ Conversation data:', {
        participantIds: conversationData.participantIds,
        currentUserId: user.uid,
        isParticipant: conversationData.participantIds?.includes(user.uid)
      });

      // Verify current user is in participantIds
      if (!conversationData.participantIds?.includes(user.uid)) {
        console.error('❌ User not in conversation participants');
        throw new Error('User not authorized for this conversation');
      }

      const recipient = conversationData.participants?.find((p: any) => p.userId !== user.uid);

      if (!recipient) {
        console.error('❌ Recipient not found in conversation');
        throw new Error('Recipient not found');
      }

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const senderName = userData?.name || userData?.email || 'Unknown';
      const senderRole = userData?.role || 'unverified';

      console.log('[Mobile] 📤 Sending message as:', { senderId: user.uid, senderName, senderRole });

      // Normalize content to object if it's a string
      const messagePayload = typeof content === 'string'
        ? { type: 'text', body: content }
        : content;

      // Use 'messages' collection (match web app format EXACTLY)
      const messagesRef = collection(db, 'messages');

      // Create message with web format
      const messageData = {
        conversationId,
        senderId: user.uid,
        senderName,
        senderRole,
        content: messagePayload,
        channel: 'internal',
        status: 'sent',
        timestamp: Timestamp.now(),
        readBy: [],
        flags: {
          isUrgent: messagePayload.isUrgent || false,
          requiresResponse: messagePayload.requiresResponse || false
        }
      };

      console.log('[Mobile] 📝 Message data to send:', JSON.stringify(messageData, null, 2));

      await addDoc(messagesRef, messageData);

      console.log('[Mobile] ✅ Message created in Firestore');

      // Update conversation's last message
      await updateDoc(conversationRef, {
        lastMessage: {
          senderId: user.uid,
          senderRole,
          content: messagePayload,
          timestamp: Timestamp.now()
        },
        lastMessageAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log('[Mobile] ✅ Conversation updated with last message');
      console.log('[Mobile] 🎉 Message sent successfully to conversation:', conversationId);
    } catch (error: any) {
      console.error('❌ [Mobile] Error sending message by ID:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  },
}));
