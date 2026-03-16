/**
 * Calculator Screen
 *
 * Diamond price calculator with Rapaport integration
 * Port from: web/src/components/CalculatorModal.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Calculator, Minus, Plus } from 'lucide-react-native';
import { loadRapaportCache, getRapaportFromCache, isCacheReady } from '../services/rapaportService';

// Shape options
const SHAPES = ['Round', 'Princess', 'Cushion', 'Emerald', 'Oval', 'Radiant', 'Asscher', 'Marquise', 'Heart', 'Pear'];

// Color options
const COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

// Clarity options
const CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'];

interface FormData {
  size: string;
  shape: string;
  color: string;
  clarity: string;
  discount: number;
  pricePerCt: number;
  totalPrice: number;
}

export default function CalculatorScreen({ navigation }: any) {
  const { theme } = useTheme();

  const [formData, setFormData] = useState<FormData>({
    size: '',
    shape: '',
    color: '',
    clarity: '',
    discount: 0,
    pricePerCt: 0,
    totalPrice: 0
  });

  // Load Rapaport cache on mount
  useEffect(() => {
    if (!isCacheReady()) {
      loadRapaportCache()
        .then((result) => {
          if (result.success) {
            console.log('✅ Rapaport cache loaded');
          } else {
            console.warn('⚠️ Rapaport cache not available:', result.message);
            console.log('💡 Tip: Load Rapaport data from Admin Dashboard');
          }
        })
        .catch((error) => {
          console.warn('⚠️ Could not load Rapaport cache:', error);
        });
    }
  }, []);

  // Auto-fetch Rapaport price when all fields filled
  useEffect(() => {
    const { size, shape, color, clarity, discount } = formData;

    if (size && shape && color && clarity && isCacheReady()) {
      const carat = parseFloat(size);
      if (carat > 0) {
        const rapPrice = getRapaportFromCache(shape, carat, color, clarity);

        if (rapPrice) {
          const discountMultiplier = 1 + (discount / 100);
          const pricePerCt = rapPrice * discountMultiplier;
          const total = pricePerCt * carat;

          setFormData(prev => ({
            ...prev,
            pricePerCt: pricePerCt,
            totalPrice: total
          }));
        }
      }
    }
  }, [formData.size, formData.shape, formData.color, formData.clarity]);

  // Recalculate when discount changes
  useEffect(() => {
    const { size, shape, color, clarity, discount } = formData;

    if (size && shape && color && clarity && isCacheReady()) {
      const carat = parseFloat(size);
      if (carat > 0) {
        const rapPrice = getRapaportFromCache(shape, carat, color, clarity);

        if (rapPrice) {
          const discountMultiplier = 1 + (discount / 100);
          const pricePerCt = rapPrice * discountMultiplier;
          const total = pricePerCt * carat;

          setFormData(prev => ({
            ...prev,
            pricePerCt: pricePerCt,
            totalPrice: total
          }));
        }
      }
    }
  }, [formData.discount]);

  const handleReset = () => {
    setFormData({
      size: '',
      shape: '',
      color: '',
      clarity: '',
      discount: 0,
      pricePerCt: 0,
      totalPrice: 0
    });
  };

  const handleDiscountChange = (delta: number) => {
    setFormData(prev => ({ ...prev, discount: prev.discount + delta }));
  };

  const handleSizeChange = (value: string) => {
    const size = parseFloat(value) || 0;
    const pricePerCt = formData.pricePerCt || 0;
    const discount = formData.discount || 0;

    let total = pricePerCt * size;
    total = total * (1 + (discount / 100));

    setFormData(prev => ({
      ...prev,
      size: value,
      totalPrice: total
    }));
  };

  const renderPicker = (
    label: string,
    value: string,
    options: string[],
    onChange: (value: string) => void
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pickerScroll}
      >
        {options.map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.pickerOption,
              {
                backgroundColor: value === option ? theme.primary : theme.backgroundCard,
                borderColor: theme.border
              }
            ]}
            onPress={() => onChange(option)}
          >
            <Text style={[
              styles.pickerText,
              { color: value === option ? '#fff' : theme.textPrimary }
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Calculator size={24} color={theme.primary} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Price Calculator</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Size Input */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Size (Carat)</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: theme.backgroundCard,
              borderColor: theme.border,
              color: theme.textPrimary
            }]}
            placeholder="e.g. 1.50"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            value={formData.size}
            onChangeText={handleSizeChange}
          />
        </View>

        {/* Shape Picker */}
        {renderPicker('Shape', formData.shape, SHAPES, (shape) =>
          setFormData(prev => ({ ...prev, shape }))
        )}

        {/* Color Picker */}
        {renderPicker('Color', formData.color, COLORS, (color) =>
          setFormData(prev => ({ ...prev, color }))
        )}

        {/* Clarity Picker */}
        {renderPicker('Clarity', formData.clarity, CLARITIES, (clarity) =>
          setFormData(prev => ({ ...prev, clarity }))
        )}

        {/* Discount */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Discount (%)</Text>
          <View style={styles.discountRow}>
            <TouchableOpacity
              style={[styles.discountBtn, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              onPress={() => handleDiscountChange(-1)}
            >
              <Minus size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.discountInput, {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
                color: theme.textPrimary
              }]}
              keyboardType="decimal-pad"
              value={String(formData.discount)}
              onChangeText={(value) => setFormData(prev => ({ ...prev, discount: parseFloat(value) || 0 }))}
            />
            <TouchableOpacity
              style={[styles.discountBtn, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              onPress={() => handleDiscountChange(1)}
            >
              <Plus size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Negative for discount, positive for markup
          </Text>
        </View>

        {/* Results */}
        <View style={[styles.resultsCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Price/Ct:</Text>
            <Text style={[styles.resultValue, { color: theme.textPrimary }]}>
              ${formData.pricePerCt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Total Price:</Text>
            <Text style={[styles.resultValue, { color: theme.primary, fontWeight: 'bold' }]}>
              ${formData.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.resetButton, { borderColor: theme.border }]}
            onPress={handleReset}
          >
            <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.closeButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  fieldContainer: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16
  },
  pickerScroll: {
    flexDirection: 'row'
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '500'
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  discountBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  discountInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'center'
  },
  hint: {
    fontSize: 12,
    marginTop: 4
  },
  resultsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500'
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '600'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  resetButton: {
    borderWidth: 1
  },
  closeButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
