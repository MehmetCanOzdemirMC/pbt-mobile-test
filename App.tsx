import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './config/firebase';
import { useNotifications } from './hooks/useNotifications';
import OnboardingScreen from './screens/OnboardingScreen';

// Screens
import HomeScreen from './screens/HomeScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// App wrapper with notifications
function AppWithNotifications() {
  useNotifications(); // Register for push notifications

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
          title: 'Sohbet',
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen
        name="DiamondDetail"
        component={DiamondDetailScreen}
        options={{
          title: 'Taş Detayı',
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{
          title: 'Sipariş Oluştur',
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{
          title: 'Sipariş Detayı',
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{
          title: 'Profil Düzenle',
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorilerim',
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Ayarlar',
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen
        name="Compare"
        component={CompareScreen}
        options={{
          title: 'Karşılaştır',
          headerBackTitle: 'Geri'
        }}
      />
    </Stack.Navigator>
  );
}

// Tab Navigator Component
function MainTabs() {
  const [userData, setUserData] = useState<any>(null);

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

  const isSupplier = userData?.role === 'supplierLocal' ||
                     userData?.role === 'supplierDropship' ||
                     userData?.role === 'supplierInternational';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: 'white',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!isSupplier && (
        <>
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Ana Sayfa',
              tabBarLabel: 'Ana Sayfa',
              tabBarIcon: () => <Text style={{ fontSize: 24 }}>🏠</Text>,
            }}
          />
          <Tab.Screen
            name="Marketplace"
            component={MarketplaceScreen}
            options={{
              title: 'Marketplace',
              tabBarLabel: 'Taşlar',
              tabBarIcon: () => <Text style={{ fontSize: 24 }}>💎</Text>,
            }}
          />
          <Tab.Screen
            name="Cart"
            component={CartScreen}
            options={{
              title: 'Sepet',
              tabBarLabel: 'Sepet',
              tabBarIcon: () => <Text style={{ fontSize: 24 }}>🛒</Text>,
            }}
          />
        </>
      )}
      {isSupplier && (
        <Tab.Screen
          name="SupplierDashboard"
          component={SupplierDashboardScreen}
          options={{
            title: 'Stok & Satışlar',
            tabBarLabel: 'Dashboard',
            tabBarIcon: () => <Text style={{ fontSize: 24 }}>📊</Text>,
          }}
        />
      )}
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Mesajlar',
          tabBarLabel: 'Mesajlar',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Siparişler',
          tabBarLabel: 'Siparişler',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
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

  if (loading || checkingOnboarding) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show onboarding if needed
  if (showOnboarding && user) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </>
    );
  }

  // Giriş yapılmışsa Stack Navigator göster (Tab Navigator + Conversation + DiamondDetail)
  if (user) {
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppWithNotifications />
      </NavigationContainer>
    );
  }

  // Login ekranı
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.loginContainer}>
        <Text style={styles.logo}>💎 PBT Mobile Test</Text>
        <Text style={styles.subtitle}>Mevcut hesabınızla giriş yapın</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre"
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
            <Text style={styles.buttonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          ℹ️ Web sitenizdeki mevcut hesabınızla test edin
        </Text>
      </View>
    </View>
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
