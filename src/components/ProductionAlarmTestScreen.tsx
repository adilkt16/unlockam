import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { useProductionAlarm } from '../services/ProductionAlarmManager';

/**
 * Example screen demonstrating the production alarm system
 */
export const ProductionAlarmTestScreen: React.FC = () => {
  const { 
    alarmManager, 
    status, 
    loading, 
    scheduleAlarm, 
    cancelAlarm, 
    setupPermissions, 
    testAlarm,
    refreshStatus 
  } = useProductionAlarm();
  
  const [scheduledAlarmId, setScheduledAlarmId] = useState<string | null>(null);

  const handleSchedule2MinuteAlarm = async () => {
    try {
      const alarmId = `test_${Date.now()}`;
      const triggerTime = Date.now() + (2 * 60 * 1000); // 2 minutes from now
      
      const success = await scheduleAlarm({
        alarmId,
        triggerTime,
        soundType: 'default',
        vibration: true,
        label: '🧪 Production Test Alarm (2 min)',
      });
      
      if (success) {
        setScheduledAlarmId(alarmId);
        Alert.alert('Success!', 'Alarm scheduled for 2 minutes from now. Lock your screen to test lockscreen functionality.');
      } else {
        Alert.alert('Error', 'Failed to schedule alarm');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to schedule alarm: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSchedule30SecondTest = async () => {
    try {
      const success = await testAlarm();
      if (success) {
        Alert.alert('Test Started!', 'Test alarm will ring in 30 seconds. Lock your screen now to test lockscreen functionality.');
      }
    } catch (error) {
      Alert.alert('Error', `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelAlarm = async () => {
    if (!scheduledAlarmId) return;
    
    try {
      const success = await cancelAlarm(scheduledAlarmId);
      if (success) {
        setScheduledAlarmId(null);
        Alert.alert('Cancelled', 'Alarm cancelled successfully');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to cancel alarm: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (condition: boolean) => condition ? '#4CAF50' : '#F44336';
  
  const renderPermissionStatus = () => {
    if (!status) return null;
    
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>📊 System Status</Text>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Exact Alarms:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(status.canScheduleExactAlarms) }]}>
            {status.canScheduleExactAlarms ? '✅ Allowed' : '❌ Blocked'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Battery Optimized:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(!status.isBatteryOptimized) }]}>
            {status.isBatteryOptimized ? '⚡ Yes (Bad)' : '✅ No (Good)'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Overlay Permission:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(status.canShowOverOtherApps) }]}>
            {status.canShowOverOtherApps ? '✅ Granted' : '❌ Denied'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Notifications:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(status.hasNotificationPermission) }]}>
            {status.hasNotificationPermission ? '✅ Allowed' : '⚠️ Denied (OK for alarms)'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Device:</Text>
          <Text style={styles.statusValue}>
            {status.deviceManufacturer} {status.deviceModel} (API {status.sdkVersion})
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading alarm system...</Text>
      </View>
    );
  }

  const allPermissionsGranted = status?.canScheduleExactAlarms && 
                                !status?.isBatteryOptimized && 
                                status?.canShowOverOtherApps;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚨 Production Alarm System</Text>
      <Text style={styles.subtitle}>
        Industrial-grade alarm system designed for maximum reliability
      </Text>
      
      {renderPermissionStatus()}
      
      {!allPermissionsGranted && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Setup Required: Some permissions are missing. This may prevent alarms from working reliably.
          </Text>
          <Button
            title="🔧 Run Setup Guide"
            onPress={setupPermissions}
            color="#FF9800"
          />
        </View>
      )}
      
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>🧪 Test Alarms</Text>
        <Text style={styles.testDescription}>
          Test the alarm system to ensure it works in all conditions
        </Text>
        
        <View style={styles.buttonSpacing}>
          <Button
            title="⚡ 30-Second Quick Test"
            onPress={handleSchedule30SecondTest}
            color="#4CAF50"
          />
        </View>
        
        <View style={styles.buttonSpacing}>
          <Button
            title="🕑 2-Minute Doze Test"
            onPress={handleSchedule2MinuteAlarm}
            color="#2196F3"
            disabled={!!scheduledAlarmId}
          />
        </View>
        
        {scheduledAlarmId && (
          <View style={styles.buttonSpacing}>
            <Button
              title="❌ Cancel Scheduled Alarm"
              onPress={handleCancelAlarm}
              color="#F44336"
            />
          </View>
        )}
        
        <View style={styles.buttonSpacing}>
          <Button
            title="🔄 Refresh Status"
            onPress={refreshStatus}
            color="#9C27B0"
          />
        </View>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>📋 Test Instructions</Text>
        <Text style={styles.infoText}>
          1. <Text style={styles.bold}>30-Second Test:</Text> Quick verification that alarms work
          {'\n'}2. <Text style={styles.bold}>2-Minute Test:</Text> Lock screen after scheduling - tests Doze resistance
          {'\n'}3. <Text style={styles.bold}>Full Test:</Text> Turn off screen for 5+ minutes to trigger Doze mode
          {'\n'}4. <Text style={styles.bold}>Expected:</Text> Alarm rings on time, screen turns on, UI appears over lockscreen
        </Text>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>✅ Success Criteria</Text>
        <Text style={styles.infoText}>
          • Alarm triggers within 5 seconds of scheduled time
          {'\n'}• Audio plays at maximum volume
          {'\n'}• Screen wakes up and stays on
          {'\n'}• Full-screen UI appears over lockscreen
          {'\n'}• Snooze/dismiss buttons work properly
        </Text>
      </View>
      
      <View style={styles.debugSection}>
        <Text style={styles.debugTitle}>🔍 Debug Info</Text>
        <Text style={styles.debugText}>
          Current alarm: {scheduledAlarmId || 'None'}
          {'\n'}Module available: {alarmManager ? 'Yes' : 'No'}
          {'\n'}Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusLabel: {
    color: '#cccccc',
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningContainer: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    color: '#000000',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  testSection: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  testDescription: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonSpacing: {
    marginBottom: 10,
  },
  infoSection: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  debugSection: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888888',
    marginBottom: 5,
  },
  debugText: {
    fontSize: 11,
    color: '#666666',
    fontFamily: 'monospace',
  },
});

export default ProductionAlarmTestScreen;
