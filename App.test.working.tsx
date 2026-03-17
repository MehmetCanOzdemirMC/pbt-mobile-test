import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  console.log('🚀 App rendering...');

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>✅ PBT Mobile Test</Text>
      <Text style={styles.subtitle}>Uygulama başarıyla yüklendi!</Text>
      <View style={styles.box}>
        <Text>🎉 React Native çalışıyor!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  box: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 10,
  },
});
