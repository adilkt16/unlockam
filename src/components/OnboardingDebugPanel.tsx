import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OnboardingDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');

  const checkAsyncStorage = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      const notificationPermissionHandled = await AsyncStorage.getItem('notificationPermissionHandled');
      const dooaPermissionHandled = await AsyncStorage.getItem('dooaPermissionHandled');
      const dooaStatusCardDismissed = await AsyncStorage.getItem('dooaStatusCardDismissed');
      
      const info = `
Onboarding Status:
- onboardingComplete: ${onboardingComplete}
- notificationPermissionHandled: ${notificationPermissionHandled}
- dooaPermissionHandled: ${dooaPermissionHandled}
- dooaStatusCardDismissed: ${dooaStatusCardDismissed}
      `;
      
      setDebugInfo(info);
      console.log('🔍 Debug Info:', info);
    } catch (error) {
      console.error('Error checking AsyncStorage:', error);
    }
  };

  const clearOnboardingData = async () => {
    try {
      await AsyncStorage.removeItem('onboardingComplete');
      await AsyncStorage.removeItem('notificationPermissionHandled');
      await AsyncStorage.removeItem('dooaPermissionHandled');
      await AsyncStorage.removeItem('dooaStatusCardDismissed');
      
      Alert.alert('Cleared', 'Onboarding data cleared. Restart the app to see onboarding flow.');
      console.log('🧹 Onboarding data cleared');
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
    }
  };

  const forceShowOnboarding = async () => {
    await clearOnboardingData();
    // Force reload the app
    Alert.alert('Reset Complete', 'App data cleared. Please restart the app to see the onboarding flow.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onboarding Debug Panel</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkAsyncStorage}>
        <Text style={styles.buttonText}>Check AsyncStorage</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={clearOnboardingData}>
        <Text style={styles.buttonText}>Clear Onboarding Data</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.forceButton]} onPress={forceShowOnboarding}>
        <Text style={styles.buttonText}>Force Reset & Show Onboarding</Text>
      </TouchableOpacity>
      
      {debugInfo ? (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  forceButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  debugInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});

export default OnboardingDebugPanel;
