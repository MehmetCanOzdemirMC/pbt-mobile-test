import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from './config/firebase';
import { initializeFirebaseAppCheck } from './config/appCheck';
import { initializeSentry, setSentryUser } from './config/sentry';
// import { useNotifications } from './hooks/useNotifications'; // Disabled for Expo Go
import OnboardingScreen from './screens/OnboardingScreen';

// Initialize security and monitoring on app startup
initializeSentry();
initializeFirebaseAppCheck();

// Screens
import HomeScreen from './screens/HomeScreen';
import MarketNavigator from './screens/MarketNavigator';
import CartScreen from './screens/CartScreen';
import MessagesScreen from './screens/MessagesScreen';
import ConversationScreen from './screens/ConversationScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProfileEditScreen from './screens/ProfileEditScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import SettingsScreen from './screens/SettingsScreen';
import CompareScreen from './screens/CompareScreen';
import DiamondDetailScreen from './screens/DiamondDetailScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderDetailScreen from './screens/supplier/OrderDetailScreen';
import OrdersScreen from './screens/OrdersScreen';
import SupplierDashboardScreen from './screens/SupplierDashboardScreen';
import { useCartStore } from './stores/cartStore';
import { useMessagingStore } from './stores/messagingStore';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useFonts } from './hooks/useFonts';
import { Home, Diamond, ShoppingCart, BarChart3, MessageCircle, Package, User, Shield } from 'lucide-react-native';
import FloatingCalculatorButton from './components/FloatingCalculatorButton';
import { isSupplierRole, isAdminRole, isRetailerRole, normalizeRole } from './constants/roles';

// New Screens (Port from Web)
import AnalyticsScreen from './screens/AnalyticsScreen';
import CalculatorScreen from './screens/CalculatorScreen';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import BulkImportScreen from './screens/BulkImportScreen';
import CertificateScreen from './screens/CertificateScreen';
import CustomDesignScreen from './screens/CustomDesignScreen';
import MountingDetailScreen from './screens/MountingDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Login Form Component (with translations)
function LoginForm({ email, setEmail, password, setPassword, handleLogin, loading }: any) {
  const { t } = useTranslation();

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.logo}>💎 {t('common.appName')}</Text>
      <Text style={styles.subtitle}>{t('auth.pleaseLogin')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('auth.login')}</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        ℹ️ {t('auth.testWithExistingAccount') || 'Test with your existing account'}
      </Text>
    </View>
  );
}

// App wrapper with notifications
function AppWithNotifications() {
  const { t } = useTranslation();
  // useNotifications(); // Disabled for Expo Go (requires development build)

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{
          title: t('messages.title'),
          headerBackTitle: t('common.back')
        }}
      />
      <Stack.Screen
        name="DiamondDetail"
        component={DiamondDetailScreen}
        options={{
          title: t('stoneDetail.title'),
          headerBackTitle: t('common.back')
        }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{
          title: t('cart.checkout'),
          headerBackTitle: t('common.back')
        }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{
          title: t('orders.orderDetails'),
          headerBackTitle: t('common.back')
        }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{
          title: t('profile.editProfile'),
          headerBackTitle: t('common.back')
        }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: t('marketplace.favorite'),
          headerBackTitle: t('common.back')
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          headerBackTitle: t('common.back')
        }}
      />
      <Stack.Screen
        name="Compare"
        component={CompareScreen}
        options={{
          title: t('marketplace.compare'),
          headerBackTitle: t('common.back')
        }}
      />
      {/* New Screens (Port from Web) */}
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{
          title: 'Price Calculator',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Admin Dashboard',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen
        name="BulkImport"
        component={BulkImportScreen}
        options={{
          title: 'Bulk Import',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen
        name="Certificate"
        component={CertificateScreen}
        options={{
          title: 'Certificate Verification',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen
        name="MountingDetail"
        component={MountingDetailScreen}
        options={{
          headerShown: false // Custom header in MountingDetailScreen
        }}
      />
      <Stack.Screen
        name="CustomDesign"
        component={CustomDesignScreen}
        options={{
          title: t('customDesign.title'),
          headerBackTitle: t('common.back'),
          headerShown: false // Custom header in CustomDesignScreen
        }}
      />
    </Stack.Navigator>
  );
}

// Tab Navigator Component
function MainTabs() {
  const [userData, setUserData] = useState<any>(null);
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { totalItems } = useCartStore();
  const { conversations, loadConversations, stopListeningToConversations } = useMessagingStore();
  const cartCount = totalItems();

  // Calculate total unread messages
  const unreadCount = Array.isArray(conversations)
    ? conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)
    : 0;

  // Debug: Log badge info
  useEffect(() => {
    console.log('🔔 [App] Badge Debug:', {
      conversationsCount: conversations.length,
      conversations: conversations.map(c => ({
        id: c.id,
        unreadCount: c.unreadCount,
        lastMessage: c.lastMessage?.substring(0, 30)
      })),
      totalUnreadCount: unreadCount
    });
  }, [conversations, unreadCount]);

  // Fetch user data to determine role
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  // Start listening to conversations for badge count
  useEffect(() => {
    if (!auth.currentUser) return;

    console.log('🔔 [App] Starting conversations listener for badge');
    loadConversations();

    // Cleanup when component unmounts
    return () => {
      console.log('🔕 [App] Stopping conversations listener');
      stopListeningToConversations();
    };
  }, []);

  // Normalize role and determine user type
  const userRole = normalizeRole(userData?.role);
  const isAdmin = isAdminRole(userRole);
  const isSupplier = isSupplierRole(userRole);
  const isRetailer = isRetailerRole(userRole);

  // Debug log
  console.log('🔐 [App] User Role:', {
    rawRole: userData?.role,
    normalizedRole: userRole,
    isAdmin,
    isSupplier,
    isRetailer
  });

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.backgroundCard,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 5, // Safe area + 5px padding
            paddingTop: 5,
            height: 60 + insets.bottom, // Base height + safe area
          },
          headerStyle: {
            backgroundColor: theme.backgroundCard,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            color: theme.textPrimary,
          },
        }}
      >
      {/* ADMIN TABS */}
      {isAdmin && (
        <>
          <Tab.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{
              title: t('admin.title'),
              tabBarLabel: t('navigation.dashboard'),
              tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Market"
            component={MarketNavigator}
            options={{
              title: t('navigation.market'),
              tabBarLabel: t('navigation.market'),
              tabBarIcon: ({ color, size }) => <Diamond color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Cart"
            component={CartScreen}
            options={{
              title: t('navigation.cart'),
              tabBarLabel: t('navigation.cart'),
              tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
              tabBarBadge: cartCount > 0 ? cartCount : undefined,
              tabBarBadgeStyle: {
                backgroundColor: theme.error,
                fontSize: 10,
                minWidth: 18,
                height: 18,
                top: 2,
              },
            }}
          />
        </>
      )}

      {/* RETAILER TABS */}
      {isRetailer && (
        <>
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: t('navigation.home'),
              tabBarLabel: t('navigation.home'),
              tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Market"
            component={MarketNavigator}
            options={{
              title: t('navigation.market'),
              tabBarLabel: t('navigation.market'),
              tabBarIcon: ({ color, size }) => <Diamond color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Cart"
            component={CartScreen}
            options={{
              title: t('navigation.cart'),
              tabBarLabel: t('navigation.cart'),
              tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
              tabBarBadge: cartCount > 0 ? cartCount : undefined,
              tabBarBadgeStyle: {
                backgroundColor: theme.error,
                fontSize: 10,
                minWidth: 18,
                height: 18,
                top: 2,
              },
            }}
          />
        </>
      )}

      {/* SUPPLIER TABS */}
      {isSupplier && (
        <>
          <Tab.Screen
            name="SupplierDashboard"
            component={SupplierDashboardScreen}
            options={{
              title: t('supplier.title'),
              tabBarLabel: t('navigation.dashboard'),
              tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Market"
            component={MarketNavigator}
            options={{
              title: t('navigation.market'),
              tabBarLabel: t('navigation.market'),
              tabBarIcon: ({ color, size }) => <Diamond color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Cart"
            component={CartScreen}
            options={{
              title: t('navigation.cart'),
              tabBarLabel: t('navigation.cart'),
              tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
              tabBarBadge: cartCount > 0 ? cartCount : undefined,
              tabBarBadgeStyle: {
                backgroundColor: theme.error,
                fontSize: 10,
                minWidth: 18,
                height: 18,
                top: 2,
              },
            }}
          />
        </>
      )}
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: t('navigation.messages'),
          tabBarLabel: t('navigation.messages'),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.error,
            fontSize: 10,
            minWidth: 18,
            height: 18,
            top: 2,
          },
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: t('navigation.orders'),
          tabBarLabel: t('navigation.orders'),
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      </Tab.Navigator>

      {/* Floating Calculator Button - Available on all tabs */}
      <FloatingCalculatorButton />
    </>
  );
}

export default function App() {
  const fontsLoaded = useFonts();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        setShowOnboarding(!hasSeenOnboarding);
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Kullanıcı bilgilerini Firestore'dan çek
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Email ve şifre gerekli');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert('Başarılı', 'Giriş yapıldı!');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Hata', error.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert('Başarılı', 'Çıkış yapıldı');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  if (loading || checkingOnboarding || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show onboarding if needed
  if (showOnboarding && user) {
    return (
      <LanguageProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
          </SafeAreaProvider>
        </ThemeProvider>
      </LanguageProvider>
    );
  }

  // Giriş yapılmışsa Stack Navigator göster (Tab Navigator + Conversation + DiamondDetail)
  if (user) {
    return (
      <LanguageProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <AppWithNotifications />
            </NavigationContainer>
          </SafeAreaProvider>
        </ThemeProvider>
      </LanguageProvider>
    );
  }

  // Login ekranı
  return (
    <LanguageProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <View style={styles.container}>
            <StatusBar style="auto" />
            <LoginForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              handleLogin={handleLogin}
              loading={loading}
            />
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loginContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  userInfoContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 16,
    textAlign: 'center',
  },
});
