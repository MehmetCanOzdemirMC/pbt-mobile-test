/**
 * Admin Dashboard Screen
 *
 * Main admin dashboard with tabbed navigation
 * Port from: web/src/pages/dashboards/AdminDashboard.jsx (simplified for mobile)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import {
  Users,
  BarChart3,
  Mail,
  Settings,
  Package,
  FileText
} from 'lucide-react-native';

// Tab Screens
import UsersTabScreen from './tabs/UsersTabScreen';
import AnalyticsTabScreen from './tabs/AnalyticsTabScreen';
import EmailTabScreen from './tabs/EmailTabScreen';
import SettingsTabScreen from './tabs/SettingsTabScreen';
import StockUpdateTabScreen from './tabs/StockUpdateTabScreen';
import RapaportTabScreen from './tabs/RapaportTabScreen';

const Tab = createMaterialTopTabNavigator();

export default function AdminDashboardScreen({ navigation }: any) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Admin Dashboard</Text>
      </View>

      {/* Tabs */}
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: theme.backgroundCard,
            borderBottomWidth: 1,
            borderBottomColor: theme.border
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: theme.primary,
            height: 3
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'none'
          },
          tabBarScrollEnabled: true,
          tabBarItemStyle: {
            width: 'auto',
            minWidth: 100
          }
        }}
      >
        <Tab.Screen
          name="Users"
          component={UsersTabScreen}
          options={{
            tabBarIcon: ({ color }) => <Users size={18} color={color} />,
            tabBarLabel: 'Users'
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsTabScreen}
          options={{
            tabBarIcon: ({ color }) => <BarChart3 size={18} color={color} />,
            tabBarLabel: 'Analytics'
          }}
        />
        <Tab.Screen
          name="Email"
          component={EmailTabScreen}
          options={{
            tabBarIcon: ({ color }) => <Mail size={18} color={color} />,
            tabBarLabel: 'Email'
          }}
        />
        <Tab.Screen
          name="Stock"
          component={StockUpdateTabScreen}
          options={{
            tabBarIcon: ({ color }) => <Package size={18} color={color} />,
            tabBarLabel: 'Stock'
          }}
        />
        <Tab.Screen
          name="Rapaport"
          component={RapaportTabScreen}
          options={{
            tabBarIcon: ({ color }) => <FileText size={18} color={color} />,
            tabBarLabel: 'Rapaport'
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsTabScreen}
          options={{
            tabBarIcon: ({ color }) => <Settings size={18} color={color} />,
            tabBarLabel: 'Settings'
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  }
});
