import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Wrapper component that adds safe area padding to all screens
 * Prevents content from going under system bars (Android/iOS)
 */
export default function ScreenWrapper({ children, style }: ScreenWrapperProps) {
  // Note: Bottom padding is handled by tab bar, not needed here
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
