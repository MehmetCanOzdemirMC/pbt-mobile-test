/**
 * Market Navigator
 * Contains: Taşlar (Stones) and Monturlar (Mountings) tabs
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import MarketplaceScreen from './MarketplaceScreen';
import MountingsListScreen from './MountingsListScreen';

const Tab = createMaterialTopTabNavigator();

export default function MarketNavigator() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  console.log('🏪 [MarketNavigator] Rendering');

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: theme.backgroundCard,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          },
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: theme.primary,
            height: 3,
          },
        }}
      >
        <Tab.Screen
          name="Taşlar"
          component={MarketplaceScreen}
          options={{ title: `💎 ${t('marketplace.stones')}` }}
        />
        <Tab.Screen
          name="Monturlar"
          component={MountingsListScreen}
          options={{ title: `✨ ${t('marketplace.mountings')}` }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
