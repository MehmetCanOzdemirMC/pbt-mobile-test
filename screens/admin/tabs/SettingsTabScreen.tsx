/**
 * Settings Tab Screen
 *
 * Admin settings and configurations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Settings, Trash2, Database, RefreshCw, Shield, Bell } from 'lucide-react-native';

export default function SettingsTabScreen() {
  const { theme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);
  const [ektpEnabled, setEktpEnabled] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          // TODO: Implement cache clearing
          Alert.alert('Success', 'Cache cleared');
        }}
      ]
    );
  };

  const handleCleanupCarts = () => {
    Alert.alert(
      'Cleanup Carts',
      'Remove expired and sold items from all carts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cleanup', onPress: () => {
          // TODO: Implement cart cleanup
          Alert.alert('Success', 'Carts cleaned up');
        }}
      ]
    );
  };

  const handleDatabaseMaintenance = () => {
    Alert.alert(
      'Database Maintenance',
      'Run database optimization and cleanup?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Run', onPress: () => {
          // TODO: Implement database maintenance
          Alert.alert('Success', 'Maintenance completed');
        }}
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Feature Toggles */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Feature Toggles</Text>

        <View style={[styles.settingRow, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Bell size={20} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Push Notifications</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Enable push notifications for admin alerts
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        <View style={[styles.settingRow, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <RefreshCw size={20} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Auto Cleanup</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Automatically cleanup expired carts (every 10 min)
              </Text>
            </View>
          </View>
          <Switch
            value={autoCleanupEnabled}
            onValueChange={setAutoCleanupEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        <View style={[styles.settingRow, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Shield size={20} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>EKTP Platform</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Enable EKTP application system
              </Text>
            </View>
          </View>
          <Switch
            value={ektpEnabled}
            onValueChange={setEktpEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>
      </View>

      {/* Maintenance Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Maintenance</Text>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
          onPress={handleClearCache}
        >
          <Trash2 size={24} color={theme.warning} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Clear Cache</Text>
            <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>
              Clear Rapaport and other cached data
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
          onPress={handleCleanupCarts}
        >
          <RefreshCw size={24} color={theme.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Cleanup Carts</Text>
            <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>
              Remove expired and sold items from carts
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
          onPress={handleDatabaseMaintenance}
        >
          <Database size={24} color={theme.success} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Database Maintenance</Text>
            <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>
              Run optimization and cleanup tasks
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: `${theme.warning}10`, borderColor: theme.warning }]}>
        <Text style={[styles.infoTitle, { color: theme.warning }]}>⚠️ Danger Zone</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          These actions can affect all users. Use with caution.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12
  },
  settingText: {
    flex: 1
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  settingDesc: {
    fontSize: 12
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  actionInfo: {
    flex: 1
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  actionDesc: {
    fontSize: 12
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14
  }
});
