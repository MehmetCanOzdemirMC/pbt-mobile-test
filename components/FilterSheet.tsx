import React, { forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface Filters {
  shape: string[];
  caratMin: string;
  caratMax: string;
  color: string[];
  clarity: string[];
  sortBy: 'price_asc' | 'price_desc' | 'carat_asc' | 'carat_desc' | 'date_desc' | 'date_asc';
}

interface FilterSheetProps {
  filters: Filters;
  onApplyFilters: (filters: Filters) => void;
}

export interface FilterSheetRef {
  open: () => void;
  close: () => void;
}

const SHAPES = ['ROUND', 'PRINCESS', 'CUSHION', 'EMERALD', 'OVAL', 'PEAR', 'MARQUISE', 'HEART', 'ASSCHER', 'RADIANT'];
const COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2'];
const SORT_OPTIONS = [
  { value: 'date_desc' as const, label: 'En Yeni' },
  { value: 'date_asc' as const, label: 'En Eski' },
  { value: 'price_asc' as const, label: 'Fiyat: Düşük → Yüksek' },
  { value: 'price_desc' as const, label: 'Fiyat: Yüksek → Düşük' },
  { value: 'carat_asc' as const, label: 'Karat: Küçük → Büyük' },
  { value: 'carat_desc' as const, label: 'Karat: Büyük → Küçük' },
];

const FilterSheet = forwardRef<FilterSheetRef, FilterSheetProps>(
  ({ filters, onApplyFilters }, ref) => {
    const { theme } = useTheme();
    const [visible, setVisible] = React.useState(false);
    const [localFilters, setLocalFilters] = React.useState<Filters>(filters);

    useImperativeHandle(ref, () => ({
      open: () => {
        setLocalFilters(filters);
        setVisible(true);
      },
      close: () => setVisible(false),
    }));

    const toggleFilter = (category: 'shape' | 'color' | 'clarity', value: string) => {
      setLocalFilters(prev => {
        const current = prev[category];
        const updated = current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value];
        return { ...prev, [category]: updated };
      });
    };

    const handleApply = () => {
      onApplyFilters(localFilters);
      setVisible(false);
    };

    const handleReset = () => {
      const resetFilters: Filters = {
        shape: [],
        caratMin: '',
        caratMax: '',
        color: [],
        clarity: [],
        sortBy: 'date_desc',
      };
      setLocalFilters(resetFilters);
    };

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setVisible(false)}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Filtreler</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVisible(false)} style={[styles.closeButton, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Sort */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Sıralama</Text>
              <View style={styles.sortOptions}>
                {SORT_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      { backgroundColor: theme.backgroundCard, borderColor: theme.border },
                      localFilters.sortBy === option.value && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setLocalFilters(prev => ({ ...prev, sortBy: option.value }))}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      { color: theme.textPrimary },
                      localFilters.sortBy === option.value && styles.sortOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Carat Range */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Karat Aralığı</Text>
              <View style={styles.rangeInputs}>
                <TextInput
                  style={[styles.rangeInput, { backgroundColor: theme.backgroundCard, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Min"
                  placeholderTextColor={theme.textDim}
                  keyboardType="decimal-pad"
                  value={localFilters.caratMin}
                  onChangeText={(text) => setLocalFilters(prev => ({ ...prev, caratMin: text }))}
                />
                <Text style={[styles.rangeSeparator, { color: theme.textSecondary }]}>-</Text>
                <TextInput
                  style={[styles.rangeInput, { backgroundColor: theme.backgroundCard, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Max"
                  placeholderTextColor={theme.textDim}
                  keyboardType="decimal-pad"
                  value={localFilters.caratMax}
                  onChangeText={(text) => setLocalFilters(prev => ({ ...prev, caratMax: text }))}
                />
              </View>
            </View>

            {/* Shape */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Şekil</Text>
              <View style={styles.chipContainer}>
                {SHAPES.map(shape => (
                  <TouchableOpacity
                    key={shape}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundCard, borderColor: theme.border },
                      localFilters.shape.includes(shape) && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => toggleFilter('shape', shape)}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: theme.textPrimary },
                      localFilters.shape.includes(shape) && styles.chipTextActive
                    ]}>
                      {shape}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Renk</Text>
              <View style={styles.chipContainer}>
                {COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundCard, borderColor: theme.border },
                      localFilters.color.includes(color) && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => toggleFilter('color', color)}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: theme.textPrimary },
                      localFilters.color.includes(color) && styles.chipTextActive
                    ]}>
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Clarity */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Berraklık</Text>
              <View style={styles.chipContainer}>
                {CLARITIES.map(clarity => (
                  <TouchableOpacity
                    key={clarity}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundCard, borderColor: theme.border },
                      localFilters.clarity.includes(clarity) && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => toggleFilter('clarity', clarity)}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: theme.textPrimary },
                      localFilters.clarity.includes(clarity) && styles.chipTextActive
                    ]}>
                      {clarity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TouchableOpacity style={[styles.applyButton, { backgroundColor: theme.primary }]} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Filtrele</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Space for status bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  sortOptionTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rangeSeparator: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  chipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FilterSheet;
