/**
 * Mounting Selector Step
 *
 * Simplified mounting selection for mobile
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Package } from 'lucide-react-native';

// Mock mountings (replace with real Firestore data)
const MOCK_MOUNTINGS = [
  { id: '1', name: 'Solitaire Ring', category: 'ring', basePrice: 500 },
  { id: '2', name: 'Halo Ring', category: 'ring', basePrice: 800 },
  { id: '3', name: 'Three-Stone Ring', category: 'ring', basePrice: 1200 },
  { id: '4', name: 'Pendant Necklace', category: 'necklace', basePrice: 400 },
  { id: '5', name: 'Tennis Bracelet', category: 'bracelet', basePrice: 1500 }
];

interface Props {
  selectedMounting: any;
  onSelect: (mounting: any) => void;
  theme: any;
}

export default function MountingSelectorStep({ selectedMounting, onSelect, theme }: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Choose a Mounting</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Select the base design for your custom jewelry
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {MOCK_MOUNTINGS.map((mounting) => (
          <TouchableOpacity
            key={mounting.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: selectedMounting?.id === mounting.id ? theme.primary : theme.border,
                borderWidth: selectedMounting?.id === mounting.id ? 2 : 1
              }
            ]}
            onPress={() => onSelect(mounting)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
              <Package size={32} color={theme.primary} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: theme.textPrimary }]}>{mounting.name}</Text>
              <Text style={[styles.category, { color: theme.textSecondary }]}>
                {mounting.category.charAt(0).toUpperCase() + mounting.category.slice(1)}
              </Text>
              <Text style={[styles.price, { color: theme.primary }]}>
                ${mounting.basePrice.toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20
  },
  list: {
    flex: 1
  },
  listContent: {
    gap: 12
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  category: {
    fontSize: 12,
    marginBottom: 8
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold'
  }
});
