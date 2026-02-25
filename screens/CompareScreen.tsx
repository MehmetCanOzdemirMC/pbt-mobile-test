import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCompareStore } from '../stores/compareStore';
import { useTheme } from '../context/ThemeContext';

export default function CompareScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { compareList, removeFromCompare, clearCompare } = useCompareStore();

  if (compareList.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <Text style={styles.emptyIcon}>⚖️</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Karşılaştırılacak taş yok</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Marketplace'den taşları seçerek karşılaştırma yapabilirsiniz
        </Text>
        <TouchableOpacity
          style={[styles.browseButton, { backgroundColor: theme.primary }]}
          onPress={() => (navigation as any).navigate('Marketplace')}
        >
          <Text style={styles.browseButtonText}>Taşlara Gözat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const specs = [
    { key: 'stoneId', label: 'Stock ID' },
    { key: 'shape', label: 'Şekil' },
    { key: 'carat', label: 'Karat', format: (v: number) => `${v.toFixed(2)} CT` },
    { key: 'color', label: 'Renk' },
    { key: 'clarity', label: 'Berraklık' },
    { key: 'cut', label: 'Kesim' },
    { key: 'polish', label: 'Cila' },
    { key: 'symmetry', label: 'Simetri' },
    { key: 'totalPrice', label: 'Fiyat', format: (v: number) => `$${v.toLocaleString()}` },
    { key: 'pricePerCarat', label: '$/CT', format: (v: number) => `$${v.toLocaleString()}` },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>⚖️ Karşılaştırma</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Tümünü Temizle', 'Tüm karşılaştırmaları silmek istiyor musunuz?', [
              { text: 'İptal', style: 'cancel' },
              {
                text: 'Temizle',
                style: 'destructive',
                onPress: () => clearCompare(),
              },
            ]);
          }}
        >
          <Text style={[styles.clearButton, { color: theme.error }]}>🗑️ Temizle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal style={styles.tableContainer}>
        <View>
          {/* Header Row */}
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <View style={[styles.labelCell, styles.headerCell, { backgroundColor: theme.primary }]}>
              <Text style={styles.headerText}>Özellik</Text>
            </View>
            {compareList.map((stone) => (
              <View key={stone.id} style={[styles.valueCell, styles.headerCell, { backgroundColor: theme.primary }]}>
                <Text style={styles.headerText} numberOfLines={1}>
                  {stone.stoneId}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromCompare(stone.id)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {specs.map((spec, index) => (
            <View
              key={spec.key}
              style={[styles.tableRow, { borderBottomColor: theme.border }, index % 2 === 0 && { backgroundColor: theme.backgroundCard }]}
            >
              <View style={[styles.labelCell, { backgroundColor: theme.backgroundCard, borderRightColor: theme.border }]}>
                <Text style={[styles.labelText, { color: theme.textPrimary }]}>{spec.label}</Text>
              </View>
              {compareList.map((stone) => {
                const value = (stone as any)[spec.key];
                const displayValue = spec.format && value ? spec.format(value) : value || '-';
                return (
                  <View key={stone.id} style={[styles.valueCell, { backgroundColor: theme.backgroundCard, borderRightColor: theme.border }]}>
                    <Text style={[styles.valueText, { color: theme.textSecondary }]}>{displayValue}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableRowEven: {
    backgroundColor: '#f8f8f8',
  },
  headerCell: {
    backgroundColor: '#007AFF',
  },
  labelCell: {
    width: 120,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  valueCell: {
    width: 150,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  valueText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
