import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import InventoryScreen from './supplier/InventoryScreen';
import SalesScreen from './supplier/SalesScreen';
import DiscountsScreen from './supplier/DiscountsScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createMaterialTopTabNavigator();

/**
 * Supplier Dashboard - Tab Navigator
 * Contains: Inventory, Sales (incoming orders), Discounts
 */
export default function SupplierDashboardScreen() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textDim,
        tabBarIndicatorStyle: {
          backgroundColor: theme.primary,
          height: 3,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
          textTransform: 'none',
        },
        tabBarStyle: {
          backgroundColor: theme.backgroundCard,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
      }}
    >
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ tabBarLabel: 'Stok' }}
      />
      <Tab.Screen
        name="Sales"
        component={SalesScreen}
        options={{ tabBarLabel: 'Satışlar' }}
      />
      <Tab.Screen
        name="Discounts"
        component={DiscountsScreen}
        options={{ tabBarLabel: 'İndirimler' }}
      />
    </Tab.Navigator>
  );
}
