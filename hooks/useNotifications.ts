import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { auth } from '../config/firebase';
import {
  registerForPushNotificationsAsync,
  saveFCMTokenToFirestore,
  removeFCMTokenFromFirestore,
  setupNotificationListeners,
} from '../services/notificationService';

/**
 * Custom hook to handle push notifications
 * - Registers for push notifications
 * - Saves FCM token to Firestore
 * - Handles notification taps (deep linking)
 *
 * NOTE: Push notifications only work in development/production builds.
 * Expo Go does not support FCM push notifications (SDK 53+).
 */
export function useNotifications() {
  const navigation = useNavigation();

  useEffect(() => {
    // Only register if user is logged in
    const user = auth.currentUser;
    if (!user) {
      console.log('⏭️  Skipping notification registration (no user)');
      return;
    }

    // Try to register for push notifications
    // Will fail gracefully in Expo Go (SDK 53+)
    let cleanup: (() => void) | undefined;

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          console.log('✅ FCM token received');
          saveFCMTokenToFirestore(token);
        }
      })
      .catch((error) => {
        // Expected error in Expo Go - just log and continue
        console.log('⏭️  Push notifications not available (Expo Go or permission denied)');
        console.log('   Use development build for full FCM support');
      });

    // Setup notification listeners (safe in all environments)
    try {
      cleanup = setupNotificationListeners(
        // Notification received (foreground)
        (notification) => {
          console.log('📩 Foreground notification:', notification.request.content.title);
        },
        // Notification tapped
        (response) => {
          handleNotificationTap(response);
        }
      );
    } catch (error) {
      console.log('⏭️  Notification listeners not available');
    }

    // Cleanup on unmount
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  const handleNotificationTap = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    console.log('👆 Notification data:', data);

    try {
      // Navigate based on notification type
      if (data.type === 'message' && data.conversationId) {
        // Navigate to conversation
        navigation.navigate('Conversation' as never, {
          conversationId: data.conversationId,
        } as never);
      } else if (data.type === 'order' && data.orderId) {
        // Navigate to order detail
        navigation.navigate('OrderDetail' as never, {
          orderId: data.orderId,
        } as never);
      } else {
        // Default: Navigate to messages/orders screen
        navigation.navigate('MainTabs' as never);
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  };

  /**
   * Remove FCM token on logout
   */
  const clearNotifications = async () => {
    await removeFCMTokenFromFirestore();
  };

  return {
    clearNotifications,
  };
}
