/**
 * Stock Update Tab Screen
 *
 * Bulk stock updates and management
 * Port from: web/src/components/admin/StockUpdatePanel.jsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Package, Upload, Edit, Trash2, RefreshCw } from 'lucide-react-native';
import { pickExcelFile } from '../../../utils/fileUpload';
import { parseExcelFile } from '../../../utils/excelHandler';

export default function StockUpdateTabScreen() {
  const { theme } = useTheme();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectFile = async () => {
    try {
      const file = await pickExcelFile();
      if (file) {
        setSelectedFile(file);
        Alert.alert('Success', `File selected: ${file.name}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select file');
      console.error(error);
    }
  };

  const handleBulkUpdate = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setLoading(true);
    try {
      // Parse Excel file
      const rows = await parseExcelFile(selectedFile.uri);

      // TODO: Implement bulk update logic
      // - Validate rows
      // - Update Firestore in batches
      // - Show progress

      Alert.alert('Success', `Parsed ${rows.length} rows`);
      setSelectedFile(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to process file');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Bulk Update Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Bulk Stock Update</Text>
        <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
          Upload an Excel file to update multiple stones at once
        </Text>

        <TouchableOpacity
          style={[styles.uploadBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
          onPress={handleSelectFile}
        >
          <Upload size={32} color={theme.primary} />
          <Text style={[styles.uploadText, { color: theme.textPrimary }]}>
            {selectedFile ? selectedFile.name : 'Select Excel File'}
          </Text>
          <Text style={[styles.uploadHint, { color: theme.textSecondary }]}>
            .xls, .xlsx (max 10MB)
          </Text>
        </TouchableOpacity>

        {selectedFile && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleBulkUpdate}
            disabled={loading}
          >
            <Package size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {loading ? 'Processing...' : 'Update Stock'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Quick Actions</Text>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
        >
          <Edit size={24} color={theme.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Edit Prices</Text>
            <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>
              Batch update prices with discount
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
        >
          <Trash2 size={24} color={theme.error} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Delete Sold Items</Text>
            <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>
              Remove sold stones from inventory
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
        >
          <RefreshCw size={24} color={theme.success} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Sync Inventory</Text>
            <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>
              Sync with external systems
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Stones:</Text>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>1,234</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Available:</Text>
          <Text style={[styles.statValue, { color: theme.success }]}>987</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Reserved:</Text>
          <Text style={[styles.statValue, { color: theme.warning }]}>123</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sold:</Text>
          <Text style={[styles.statValue, { color: theme.error }]}>124</Text>
        </View>
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
    marginBottom: 8
  },
  sectionDesc: {
    fontSize: 14,
    marginBottom: 16
  },
  uploadBox: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12
  },
  uploadHint: {
    fontSize: 12,
    marginTop: 4
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
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
  statsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  statLabel: {
    fontSize: 14
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600'
  }
});
