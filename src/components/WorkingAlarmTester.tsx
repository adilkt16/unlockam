import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { FixedAlarmTest } from '../services/FixedAlarmTester';

export const WorkingAlarmTester: React.FC = () => {
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [permissions, setPermissions] = useState<any>({});
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const status = await FixedAlarmTest.getSystemStatus();
      setIsNativeAvailable(status.nativeModuleAvailable);
      setPermissions(status.permissions);
      setRecommendations(status.recommendations);
    } catch (error) {
      console.error('Failed to check system status:', error);
    }
  };

  const testAlarmIn30Seconds = async () => {
    try {
      const result = await FixedAlarmTest.testAlarmIn30Seconds();
      
      if (result.success) {
        Alert.alert(
          '🧪 30-Second Test Started!',
          'Alarm will ring in 30 seconds!\n\n' +
          '📱 LOCK YOUR PHONE NOW to test background audio\n' +
          '🔊 Audio will play even when locked\n' +
          '⏰ Will auto-stop after playing\n' +
          '🛑 Or use "Stop Test" to end early',
          [
            { text: 'Locking phone now!', style: 'default' },
            { text: 'Keep app open', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Test Setup Issue', result.message);
      }
    } catch (error) {
      Alert.alert('Test Failed', `Error: ${error}`);
    }
  };

  const testNativeServiceNow = async () => {
    try {
      const result = await FixedAlarmTest.testNativeServiceNow();
      
      if (result.success) {
        Alert.alert(
          '🔧 Native Service Test Active!',
          'Native alarm service is running!\n\n' +
          '📱 LOCK YOUR PHONE NOW to test locked-state audio!\n' +
          '🔊 Audio should play even when phone is locked\n' +
          '⏰ Will auto-stop in 30 seconds\n' +
          '🛑 Or come back to the app to stop it',
          [{ text: 'Locking phone now!', style: 'default' }]
        );
      } else {
        Alert.alert('Native Service Issue', result.message);
      }
    } catch (error) {
      Alert.alert('Native Test Failed', `Error: ${error}`);
    }
  };

  const testLockedStateAlarmNow = async () => {
    try {
      const result = await FixedAlarmTest.testLockedStateAlarmNow();
      
      if (result.success) {
        Alert.alert(
          '🔒 Locked State Test Active!',
          'Full-screen alarm is starting!\n\n' +
          '🔊 You should see the alarm activity\n' +
          '🧮 Math puzzle should appear\n' +
          '📱 Works over lock screen\n' +
          '🛑 Solve puzzle or use back button to stop',
          [{ text: 'Got it!', style: 'default' }]
        );
      } else {
        Alert.alert('Locked State Test Issue', result.message);
      }
    } catch (error) {
      Alert.alert('Locked State Test Failed', `Error: ${error}`);
    }
  };

  const stopCurrentTest = async () => {
    try {
      const result = await FixedAlarmTest.stopCurrentAlarm();
      Alert.alert(
        '🛑 Test Stopped',
        result.success ? 'All alarm tests have been stopped.' : result.message,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Stop Failed', `Error: ${error}`);
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await FixedAlarmTest.requestPermissions();
      
      if (granted) {
        Alert.alert('Permissions Granted', 'All alarm permissions have been granted!');
        await checkSystemStatus(); // Refresh status
      } else {
        Alert.alert(
          'Permissions Needed',
          'Some permissions are still needed for full functionality.\n\n' +
          'Please grant the following in Android settings:\n' +
          '• Schedule Exact Alarms\n' +
          '• Display over other apps\n' +
          '• Disable battery optimization'
        );
      }
    } catch (error) {
      Alert.alert('Permission Error', `Error: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚀 Working Alarm Tester</Text>
      <Text style={styles.subtitle}>Fixed alarm testing with proper native integration</Text>
      
      {/* System Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>System Status</Text>
        <Text style={[styles.statusText, isNativeAvailable ? styles.successText : styles.errorText]}>
          Native Module: {isNativeAvailable ? '✅ Available' : '❌ Not Available'}
        </Text>
        <Text style={[styles.statusText, permissions.exactAlarm ? styles.successText : styles.warningText]}>
          Exact Alarms: {permissions.exactAlarm ? '✅ Granted' : '❌ Needed'}
        </Text>
        <Text style={[styles.statusText, permissions.systemAlertWindow ? styles.successText : styles.warningText]}>
          System Overlay: {permissions.systemAlertWindow ? '✅ Granted' : '❌ Needed'}
        </Text>
        <Text style={[styles.statusText, permissions.batteryOptimization ? styles.successText : styles.warningText]}>
          Battery Optimization: {permissions.batteryOptimization ? '✅ Disabled' : '❌ Needs Disable'}
        </Text>
        
        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>⚠️ Setup Needed:</Text>
            {recommendations.map((rec, index) => (
              <Text key={index} style={styles.recommendationText}>• {rec}</Text>
            ))}
          </View>
        )}
      </View>

      {/* Permission Button */}
      <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
        <Text style={styles.permissionButtonText}>📱 Setup All Permissions</Text>
        <Text style={styles.buttonSubtext}>Required for alarm functionality</Text>
      </TouchableOpacity>

      {/* Test Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.testButton, styles.scheduledTestButton]} 
          onPress={testAlarmIn30Seconds}
        >
          <Text style={styles.buttonText}>⏰ Test Alarm in 30 Seconds</Text>
          <Text style={styles.buttonSubtext}>Best test - lock phone after tapping</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, styles.nativeTestButton]} 
          onPress={testNativeServiceNow}
        >
          <Text style={styles.buttonText}>🔧 Test Native Service NOW</Text>
          <Text style={styles.buttonSubtext}>Tests locked-state audio immediately</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, styles.lockScreenTestButton]} 
          onPress={testLockedStateAlarmNow}
        >
          <Text style={styles.buttonText}>🔒 Test Lock Screen Interface</Text>
          <Text style={styles.buttonSubtext}>Tests full-screen alarm with math puzzle</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, styles.stopButton]} 
          onPress={stopCurrentTest}
        >
          <Text style={styles.buttonText}>🛑 Stop All Tests</Text>
          <Text style={styles.buttonSubtext}>Stops any running alarm tests</Text>
        </TouchableOpacity>
      </View>

      {/* Enhanced Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>📋 How to Test Properly</Text>
        
        <View style={styles.testStep}>
          <Text style={styles.stepNumber}>1.</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Setup Permissions First</Text>
            <Text style={styles.stepText}>
              Tap "Setup All Permissions" and grant all requested permissions. 
              These are required for the alarm to work reliably.
            </Text>
          </View>
        </View>

        <View style={styles.testStep}>
          <Text style={styles.stepNumber}>2.</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Best Test: "Test Alarm in 30 Seconds"</Text>
            <Text style={styles.stepText}>
              This tests the most important feature - background alarm scheduling. 
              Lock your phone immediately after tapping and wait for the alarm.
            </Text>
          </View>
        </View>

        <View style={styles.testStep}>
          <Text style={styles.stepNumber}>3.</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Instant Test: "Test Native Service NOW"</Text>
            <Text style={styles.stepText}>
              Tests immediate audio playback. Lock your phone right after tapping 
              to verify locked-state audio works.
            </Text>
          </View>
        </View>

        <View style={styles.testStep}>
          <Text style={styles.stepNumber}>4.</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Interface Test: "Test Lock Screen Interface"</Text>
            <Text style={styles.stepText}>
              Shows the full alarm screen with math puzzle. Tests the complete 
              wake-up experience.
            </Text>
          </View>
        </View>
        
        <View style={styles.troubleshootingContainer}>
          <Text style={styles.troubleshootingTitle}>🔧 If Tests Don't Work:</Text>
          <Text style={styles.troubleshootingText}>
            • Native modules require app rebuilding (EAS Build or expo run:android){'\n'}
            • Check that all permissions are granted{'\n'}
            • Disable battery optimization for this app{'\n'}
            • Test on multiple devices if possible{'\n'}
            • Use "Stop All Tests" between different tests
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#6c757d',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#495057',
  },
  successText: {
    color: '#28a745',
  },
  warningText: {
    color: '#ffc107',
  },
  errorText: {
    color: '#dc3545',
  },
  recommendationsContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#856404',
  },
  recommendationText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#007bff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 2,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 25,
  },
  testButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scheduledTestButton: {
    backgroundColor: '#28a745',
  },
  nativeTestButton: {
    backgroundColor: '#17a2b8',
  },
  lockScreenTestButton: {
    backgroundColor: '#6f42c1',
  },
  stopButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  buttonSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  testStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginRight: 15,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  stepText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  troubleshootingContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  troubleshootingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#721c24',
  },
  troubleshootingText: {
    fontSize: 14,
    color: '#721c24',
    lineHeight: 20,
  },
});
