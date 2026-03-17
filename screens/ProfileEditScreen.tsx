import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Moon, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { auth, db, storage } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';
import ScreenWrapper from '../components/ScreenWrapper';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme, isDark, toggleTheme } = useTheme();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // User info
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || '');
        setSurname(data.surname || '');
        setPhone(data.phone || '');
        setCompanyName(data.companyName || '');
        setPhotoURL(data.photoURL || null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(t('profile.error'), t('profile.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert(t('profile.error'), t('profile.nameRequired'));
      return;
    }

    try {
      setSaving(true);
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        surname: surname.trim(),
        phone: phone.trim(),
        companyName: companyName.trim(),
      });

      Alert.alert(t('profile.success'), t('profile.profileUpdated'), [
        { text: t('profile.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert(t('profile.error'), t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('profile.error'), t('profile.fillAllPasswordFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('profile.error'), t('profile.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('profile.error'), t('profile.passwordMinLength'));
      return;
    }

    try {
      setSaving(true);
      if (!user || !user.email) return;

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Change password
      await updatePassword(user, newPassword);

      Alert.alert(t('profile.success'), t('profile.passwordChanged'), [
        {
          text: t('profile.ok'),
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert(t('profile.error'), t('profile.wrongPassword'));
      } else if (error.code === 'auth/weak-password') {
        Alert.alert(t('profile.error'), t('profile.weakPassword'));
      } else {
        Alert.alert(t('profile.error'), t('profile.passwordChangeError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionRequired'), t('profile.galleryPermissionMessage'));
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square crop
        quality: 0.7, // Compress to reduce size
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadProfilePhoto(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('profile.error'), t('profile.imagePickError'));
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    if (!user) return;

    try {
      setUploading(true);

      // Fetch the file as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(storage, `profile-photos/${user.uid}`);

      // Upload file
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL,
      });

      // Update local state
      setPhotoURL(downloadURL);

      Alert.alert(t('profile.success'), t('profile.photoUpdated'));
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert(t('profile.error'), t('profile.photoUploadError'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('profile.loading')}</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container}>
      {/* Profile Photo Section */}
      <View style={styles.photoSection}>
        <Text style={styles.sectionTitle}>📷 {t('profile.profilePhoto')}</Text>

        <View style={styles.photoContainer}>
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Text style={styles.profilePhotoPlaceholderText}>
                {name ? name.charAt(0).toUpperCase() : '👤'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handlePickImage}
          disabled={uploading}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? `📤 ${t('profile.uploading')}` : `📷 ${t('profile.selectPhoto')}`}
          </Text>
        </TouchableOpacity>

        {uploading && (
          <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 12 }} />
        )}
      </View>

      {/* Theme Toggle Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
        <View style={styles.themeHeader}>
          {isDark ? (
            <Moon size={20} color={theme.textPrimary} />
          ) : (
            <Sun size={20} color={theme.textPrimary} />
          )}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginLeft: 8 }]}>
            🎨 {t('profile.theme')}
          </Text>
        </View>

        <View style={styles.themeRow}>
          <View>
            <Text style={[styles.themeLabel, { color: theme.textPrimary }]}>
              {isDark ? t('profile.darkMode') : t('profile.lightMode')}
            </Text>
            <Text style={[styles.themeSubtext, { color: theme.textSecondary }]}>
              {isDark ? t('profile.darkModeDesc') : t('profile.lightModeDesc')}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#d1d5db', true: theme.primary }}
            thumbColor={isDark ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Profile Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 {t('profile.personalInfo')}</Text>

        <Text style={styles.label}>{t('profile.name')} *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('profile.namePlaceholder')}
          autoCapitalize="words"
        />

        <Text style={styles.label}>{t('profile.surname')}</Text>
        <TextInput
          style={styles.input}
          value={surname}
          onChangeText={setSurname}
          placeholder={t('profile.surnamePlaceholder')}
          autoCapitalize="words"
        />

        <Text style={styles.label}>{t('profile.phone')}</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('profile.phonePlaceholder')}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>{t('profile.companyName')}</Text>
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder={t('profile.companyNamePlaceholder')}
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? t('profile.saving') : `💾 ${t('profile.saveInfo')}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Password Change Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 {t('profile.changePassword')}</Text>

        <Text style={styles.label}>{t('profile.currentPassword')}</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={t('profile.currentPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>{t('profile.newPassword')}</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('profile.newPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>{t('profile.confirmPassword')}</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('profile.confirmPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.changePasswordButton, saving && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={saving}
        >
          <Text style={styles.changePasswordButtonText}>
            {saving ? t('profile.changing') : `🔑 ${t('profile.changePasswordButton')}`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  photoSection: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoPlaceholderText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  changePasswordButton: {
    backgroundColor: '#FF9500',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  changePasswordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeSubtext: {
    fontSize: 13,
    maxWidth: 220,
  },
});
