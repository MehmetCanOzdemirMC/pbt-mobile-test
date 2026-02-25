import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import InventoryScreen from './supplier/InventoryScreen';
import SalesScreen from './supplier/SalesScreen';
import DiscountsScreen from './supplier/DiscountsScreen';

const Tab = createMaterialTopTabNavigator();

/**
 * Supplier Dashboard - Tab Navigator
 * Contains: Inventory, Sales (incoming orders), Discounts
 */
export default function SupplierDashboardScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarIndicatorStyle: {
          backgroundColor: '#007AFF',
          height: 3,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
          textTransform: 'none',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
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
