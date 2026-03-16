/**
 * Stone Selector Step
 *
 * Simplified stone selection for mobile
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Gem } from 'lucide-react-native';

// Mock stones (replace with real Firestore data)
const MOCK_STONES = [
  { id: '1', shape: 'Round', carat: 1.0, color: 'D', clarity: 'VVS1', totalPrice: 5000 },
  { id: '2', shape: 'Round', carat: 1.5, color: 'E', clarity: 'VVS2', totalPrice: 8000 },
  { id: '3', shape: 'Princess', carat: 1.2, color: 'F', clarity: 'VS1', totalPrice: 6500 },
  { id: '4', shape: 'Oval', carat: 1.8, color: 'G', clarity: 'VS2', totalPrice: 7200 },
  { id: '5', shape: 'Cushion', carat: 2.0, color: 'H', clarity: 'SI1', totalPrice: 9000 }
];

interface Props {
  selectedStone: any;
  onSelect: (stone: any) => void;
  theme: any;
}

export default function StoneSelectorStep({ selectedStone, onSelect, theme }: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Choose a Stone</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Select the diamond for your custom design
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {MOCK_STONES.map((stone) => (
          <TouchableOpacity
            key={stone.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: selectedStone?.id === stone.id ? theme.primary : theme.border,
                borderWidth: selectedStone?.id === stone.id ? 2 : 1
              }
            ]}
            onPress={() => onSelect(stone)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
              <Gem size={32} color={theme.primary} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: theme.textPrimary }]}>
                {stone.carat}ct {stone.shape}
              </Text>
              <Text style={[styles.specs, { color: theme.textSecondary }]}>
                {stone.color} / {stone.clarity}
              </Text>
              <Text style={[styles.price, { color: theme.primary }]}>
                ${stone.totalPrice.toLocaleString()}
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
  specs: {
    fontSize: 12,
    marginBottom: 8
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold'
  }
});
