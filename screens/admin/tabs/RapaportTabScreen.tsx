/**
 * Rapaport Tab Screen
 *
 * Rapaport price list management
 * Port from: web/src/components/RapaportUpload.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { FileText, Upload, CheckCircle, RefreshCw, Calendar } from 'lucide-react-native';
import { pickExcelFile } from '../../../utils/fileUpload';
import { loadRapaportCache, isCacheReady, saveRapaportCache, loadMockRapaportData } from '../../../services/rapaportService';
import { parseExcelFile } from '../../../utils/excelHandler';

export default function RapaportTabScreen() {
  const { theme } = useTheme();
  const [cacheStatus, setCacheStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    checkCacheStatus();
  }, []);

  const checkCacheStatus = async () => {
    const result = await loadRapaportCache();
    setCacheStatus(result.success);
    if (result.success) {
      setLastUpdate(new Date());
    }
  };

  const handleUploadRapaport = async () => {
    try {
      const file = await pickExcelFile();
      if (!file) return;

      setLoading(true);

      // Parse Excel file
      const rows = await parseExcelFile(file.uri);

      // TODO: Transform rows to Rapaport cache format
      // Expected format: { "Round-1.5-D-VVS1": 15000, ... }
      const rapaportData: { [key: string]: number } = {};

      rows.forEach((row: any) => {
        const shape = row.shape || row.Shape;
        const carat = parseFloat(row.carat || row.Carat);
        const color = row.color || row.Color;
        const clarity = row.clarity || row.Clarity;
        const price = parseFloat(row.price || row.Price);

        if (shape && carat && color && clarity && price) {
          const key = `${shape}-${carat}-${color}-${clarity}`;
          rapaportData[key] = price;
        }
      });

      // Save to cache
      await saveRapaportCache(rapaportData);
      setCacheStatus(true);
      setLastUpdate(new Date());

      Alert.alert('Success', `Uploaded ${Object.keys(rapaportData).length} Rapaport prices`);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload Rapaport file');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMockData = async () => {
    setLoading(true);
    try {
      await loadMockRapaportData();
      setCacheStatus(true);
      setLastUpdate(new Date());
      Alert.alert('Success', 'Mock Rapaport data loaded');
    } catch (error) {
      Alert.alert('Error', 'Failed to load mock data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <View style={styles.statusHeader}>
          <FileText size={32} color={theme.primary} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Rapaport Cache</Text>
            <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
              {cacheStatus ? 'Active' : 'Not loaded'}
            </Text>
          </View>
          {cacheStatus && <CheckCircle size={24} color={theme.success} />}
        </View>

        {lastUpdate && (
          <View style={styles.dateRow}>
            <Calendar size={16} color={theme.textSecondary} />
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              Last updated: {lastUpdate.toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Upload Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Upload Rapaport File</Text>
        <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
          Upload an Excel file with Rapaport price list
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleUploadRapaport}
          disabled={loading}
        >
          <Upload size={20} color="#fff" />
          <Text style={styles.buttonText}>
            {loading ? 'Uploading...' : 'Select & Upload File'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mock Data (Development) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Development Tools</Text>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}
          onPress={handleLoadMockData}
          disabled={loading}
        >
          <RefreshCw size={20} color={theme.primary} />
          <Text style={[styles.buttonText, { color: theme.primary }]}>
            Load Mock Data
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={[styles.infoCard, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
        <Text style={[styles.infoTitle, { color: theme.primary }]}>File Format</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Required columns: Shape, Carat, Color, Clarity, Price
        </Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Example: Round, 1.50, D, VVS1, 15000
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
  statusCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12
  },
  statusInfo: {
    flex: 1
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statusSubtitle: {
    fontSize: 14
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dateText: {
    fontSize: 12
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  sectionDesc: {
    fontSize: 14,
    marginBottom: 16
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4
  }
});
