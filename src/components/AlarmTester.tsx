import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BulletproofAlarmService } from '../services/BulletproofAlarmService';

export const AlarmTester: React.FC = () => {
  const alarmService = BulletproofAlarmService.getInstance();

  const testAlarmIn30Seconds = async () => {
    try {
      await alarmService.testAlarmInSeconds(30);
      Alert.alert(
        '🧪 Alarm Test Started',
        'Alarm will ring in 30 seconds!\n\n' +
        '📱 Lock your phone now to test locked-state playback\n' +
        '⏰ The alarm will auto-stop after 2 minutes\n' +
        '🛑 Or come back to the app to stop it manually',
        [{ text: 'OK, Testing!', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Test Failed', `Error: ${error}`);
    }
  };

  const testAlarmNow = async () => {
    try {
      await alarmService.testAlarmNow();
      Alert.alert(
        '🧪 Alarm Test Active',
        'Alarm is ringing NOW!\n\n' +
        '🔊 You should hear the alarm sound\n' +
        '📳 Device should vibrate\n' +
        '🛑 Tap "Stop Test" to end the test',
        [{ text: 'Got it!', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Test Failed', `Error: ${error}`);
    }
  };

  const testNativeServiceNow = async () => {
    try {
      await alarmService.testNativeServiceNow();
      Alert.alert(
        '� Native Service Test',
        'Native Android service starting!\n\n' +
        '� LOCK YOUR PHONE NOW to test locked-state audio!\n' +
        '� Audio should play even when phone is locked\n' +
        '🛑 Come back to the app to stop it',
        [{ text: 'Locking phone now!', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Native Test Failed', `Error: ${error}`);
    }
  };

  const stopTest = async () => {
    try {
      await alarmService.stopAlarm();
      Alert.alert('🛑 Test Stopped', 'All alarm tests have been stopped.');
    } catch (error) {
      Alert.alert('Stop Failed', `Error: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Bulletproof Alarm Tester</Text>
      <Text style={styles.subtitle}>Test your alarm system functionality</Text>
      
      <TouchableOpacity style={styles.testButton} onPress={testAlarmIn30Seconds}>
        <Text style={styles.buttonText}>⏰ Test Alarm in 30 Seconds</Text>
        <Text style={styles.buttonSubtext}>Lock your phone after tapping</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.immediateButton} onPress={testAlarmNow}>
        <Text style={styles.buttonText}>🚨 Test Alarm NOW</Text>
        <Text style={styles.buttonSubtext}>Immediate alarm test</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.nativeTestButton} onPress={testNativeServiceNow}>
        <Text style={styles.buttonText}>🔒 Test Native Service</Text>
        <Text style={styles.buttonSubtext}>Direct test - lock phone after tapping!</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.stopButton} onPress={stopTest}>
        <Text style={styles.buttonText}>🛑 Stop Test</Text>
        <Text style={styles.buttonSubtext}>End any running test</Text>
      </TouchableOpacity>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 Test Instructions:</Text>
        <Text style={styles.instructionsText}>
          🔒 BEST TEST: "Test Native Service"{'\n'}
          1. Tap "Test Native Service"{'\n'}
          2. Lock your phone IMMEDIATELY{'\n'}
          3. Audio should play even when locked{'\n'}
          4. Unlock and open app to stop{'\n'}{'\n'}
          
          ⏰ SCHEDULED TEST: "Test Alarm in 30 Seconds"{'\n'}
          1. Tap button → Lock phone → Wait{'\n'}
          2. Uses native Android alarm system{'\n'}
          3. Most realistic real-world test
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
  },
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  immediateButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  nativeTestButton: {
    backgroundColor: '#9C27B0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  instructions: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976D2',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#424242',
  },
});
