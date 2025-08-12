import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { useAlarmyStyleAlarm } from '../hooks/useAlarmyStyleAlarm';

/**
 * Demo component showcasing Alarmy-style alarm functionality
 * This component demonstrates all the robust alarm features
 */
export const AlarmyStyleDemo = () => {
  const alarm = useAlarmyStyleAlarm();
  
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [permissionStatus, setPermissionStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load system status on component mount
  useEffect(() => {
    loadSystemStatus();
    checkPermissions();
  }, []);

  const loadSystemStatus = async () => {
    const status = await alarm.getSystemStatus();
    setSystemStatus(status);
  };

  const checkPermissions = async () => {
    const status = await alarm.setupAlarmPermissions();
    setPermissionStatus(status);
  };

  const handleScheduleTestAlarm = async (seconds: number) => {
    setIsLoading(true);
    try {
      const result = await alarm.scheduleTestAlarm(seconds);
      Alert.alert(
        'Test Alarm',
        result.success 
          ? `✅ Test alarm scheduled for ${seconds} seconds from now!\n\nThe alarm will:\n• Wake the device\n• Show over lock screen\n• Play at maximum volume\n• Require puzzle solving\n• Work even in Doze mode`
          : `❌ Failed: ${result.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleRegularAlarm = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 60000); // 1 minute from now
      
      const result = await alarm.scheduleAlarm(
        1, // alarm ID
        futureTime.getHours(),
        futureTime.getMinutes(),
        'Alarmy-Style Wake Up!'
      );
      
      Alert.alert(
        'Regular Alarm',
        result.success 
          ? `✅ Alarm scheduled for ${futureTime.toLocaleTimeString()}!`
          : `❌ Failed: ${result.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAlarm = async () => {
    const result = await alarm.cancelAlarm(1);
    Alert.alert(
      'Cancel Alarm',
      result.success ? '✅ Alarm cancelled!' : `❌ Failed: ${result.message}`,
      [{ text: 'OK' }]
    );
  };

  const handleRequestExactAlarmPermission = async () => {
    const result = await alarm.requestExactAlarmPermission();
    Alert.alert(
      'Exact Alarm Permission',
      result.message,
      [
        { text: 'OK', onPress: checkPermissions }
      ]
    );
  };

  const handleRequestOverlayPermission = async () => {
    const result = await alarm.requestOverlayPermission();
    Alert.alert(
      'Display Over Apps Permission',
      'This permission allows alarms to show over the lock screen and other apps for maximum reliability.',
      [
        { text: 'OK', onPress: checkPermissions }
      ]
    );
  };

  const handleRequestBatteryExemption = async () => {
    const result = await alarm.requestBatteryOptimizationExemption();
    Alert.alert(
      'Battery Optimization',
      'Disabling battery optimization ensures alarms work reliably even when the device is in deep sleep mode.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚨 Alarmy-Style Alarms</Text>
        <Text style={styles.subtitle}>Ultra-Reliable Alarm System</Text>
      </View>

      {/* System Status */}
      {systemStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 System Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Device</Text>
              <Text style={styles.statusValue}>{systemStatus.manufacturer} {systemStatus.deviceModel}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Android</Text>
              <Text style={styles.statusValue}>API {systemStatus.androidVersion}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Exact Alarms</Text>
              <Text style={[styles.statusValue, { color: systemStatus.canScheduleExactAlarms ? '#00C851' : '#ff4444' }]}>
                {systemStatus.canScheduleExactAlarms ? '✅ Enabled' : '❌ Disabled'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Overlay</Text>
              <Text style={[styles.statusValue, { color: systemStatus.hasOverlayPermission ? '#00C851' : '#ffbb33' }]}>
                {systemStatus.hasOverlayPermission ? '✅ Granted' : '⚠️ Not Granted'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Permission Setup */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Permissions</Text>
        {permissionStatus && (
          <View style={styles.permissionStatus}>
            <Text style={styles.permissionMessage}>{permissionStatus.message}</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.permissionButton} onPress={handleRequestExactAlarmPermission}>
          <Text style={styles.permissionButtonText}>⏰ Request Exact Alarm Permission</Text>
          <Text style={styles.permissionDescription}>Required for reliable alarm scheduling</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.permissionButton} onPress={handleRequestOverlayPermission}>
          <Text style={styles.permissionButtonText}>📱 Request Display Over Apps</Text>
          <Text style={styles.permissionDescription}>Shows alarms over lock screen and other apps</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.permissionButton} onPress={handleRequestBatteryExemption}>
          <Text style={styles.permissionButtonText}>🔋 Request Battery Exemption</Text>
          <Text style={styles.permissionDescription}>Prevents system from killing alarm service</Text>
        </TouchableOpacity>
      </View>

      {/* Test Alarms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Alarms</Text>
        <Text style={styles.sectionDescription}>
          Test the Alarmy-style alarm system with immediate triggers
        </Text>
        
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#ff4444' }]} 
            onPress={() => handleScheduleTestAlarm(5)}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>5 Seconds</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#ffbb33' }]} 
            onPress={() => handleScheduleTestAlarm(15)}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>15 Seconds</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#00C851' }]} 
            onPress={() => handleScheduleTestAlarm(30)}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>30 Seconds</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Regular Alarms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Regular Alarms</Text>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleScheduleRegularAlarm}
          disabled={isLoading}
        >
          <Text style={styles.actionButtonText}>📅 Schedule Alarm (1 min from now)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#ff6b6b' }]} 
          onPress={handleCancelAlarm}
        >
          <Text style={styles.actionButtonText}>🗑️ Cancel Scheduled Alarm</Text>
        </TouchableOpacity>
      </View>

      {/* Features List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Alarmy-Style Features</Text>
        <View style={styles.featuresList}>
          <Text style={styles.feature}>🔒 Works over lock screen</Text>
          <Text style={styles.feature}>💤 Bypasses Doze mode</Text>
          <Text style={styles.feature}>🔕 Overrides Do Not Disturb</Text>
          <Text style={styles.feature}>🔊 Maximum volume playback</Text>
          <Text style={styles.feature}>🧮 Math puzzle to dismiss</Text>
          <Text style={styles.feature}>📱 Multiple UI fallbacks</Text>
          <Text style={styles.feature}>🔄 Boot persistence</Text>
          <Text style={styles.feature}>⚡ Wake locks for reliability</Text>
          <Text style={styles.feature}>🎯 Exact alarm scheduling</Text>
          <Text style={styles.feature}>🚫 Cannot be accidentally dismissed</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This implementation replicates Alarmy's robust alarm mechanisms for maximum reliability.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    lineHeight: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    width: '48%',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  permissionStatus: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionMessage: {
    fontSize: 14,
    color: '#495057',
  },
  permissionButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 12,
    color: '#ecf0f1',
  },
  buttonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  featuresList: {
    paddingLeft: 8,
  },
  feature: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 16,
  },
});
