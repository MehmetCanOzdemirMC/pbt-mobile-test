/**
 * Metal Color Picker Component
 * Select metal type for mounting
 * Port from: web/src/components/custom-design/MetalColorPicker.jsx
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface MetalOption {
  id: string;
  name: string;
  color: string;
  gradient?: string[];
}

const METAL_OPTIONS: MetalOption[] = [
  {
    id: 'white_gold',
    name: 'White Gold',
    color: '#E8E8E8',
    gradient: ['#F5F5F5', '#D3D3D3'],
  },
  {
    id: 'yellow_gold',
    name: 'Yellow Gold',
    color: '#FFD700',
    gradient: ['#FFED4E', '#C9A52B'],
  },
  {
    id: 'rose_gold',
    name: 'Rose Gold',
    color: '#E0BFB8',
    gradient: ['#F4C2C2', '#C9A094'],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    color: '#E5E4E2',
    gradient: ['#F0F0F0', '#C0C0C0'],
  },
  {
    id: 'silver',
    name: 'Silver',
    color: '#C0C0C0',
    gradient: ['#D3D3D3', '#A9A9A9'],
  },
];

interface MetalColorPickerProps {
  selectedMetal: string;
  availableMetals?: string[];
  onMetalChange: (metalId: string) => void;
  showLabel?: boolean;
}

export default function MetalColorPicker({
  selectedMetal,
  availableMetals,
  onMetalChange,
  showLabel = true,
}: MetalColorPickerProps) {
  const { theme } = useTheme();

  // Filter metals if availableMetals is provided
  const displayMetals = availableMetals
    ? METAL_OPTIONS.filter((m) => availableMetals.includes(m.id))
    : METAL_OPTIONS;

  const selectedMetalData = METAL_OPTIONS.find((m) => m.id === selectedMetal);

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.header}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Metal Type
          </Text>
          {selectedMetalData && (
            <Text style={[styles.selectedName, { color: theme.textSecondary }]}>
              {selectedMetalData.name}
            </Text>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayMetals.map((metal) => {
          const isSelected = metal.id === selectedMetal;
          return (
            <TouchableOpacity
              key={metal.id}
              style={[
                styles.metalOption,
                {
                  borderColor: isSelected ? theme.primary : theme.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => onMetalChange(metal.id)}
            >
              <View
                style={[
                  styles.metalSwatch,
                  { backgroundColor: metal.color },
                ]}
              />
              <Text
                style={[
                  styles.metalName,
                  {
                    color: isSelected ? theme.primary : theme.textSecondary,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
              >
                {metal.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedName: {
    fontSize: 14,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 4,
  },
  metalOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 80,
  },
  metalSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  metalName: {
    fontSize: 12,
    textAlign: 'center',
  },
});
