import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimeSettingsCardProps {
  onOpenTimePicker: (type: 'start' | 'end') => void;
  startTime: string;
  endTime: string;
  onUpdateTime: (type: 'start' | 'end', time: string) => void;
  onAlarmStatusChange?: (active: boolean, alarm?: { startTime: string; endTime: string }) => void;
}

export default function TimeSettingsCard({ 
  onOpenTimePicker, 
  startTime, 
  endTime, 
  onUpdateTime, 
  onAlarmStatusChange 
}: TimeSettingsCardProps) {
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(true); // Default to enabled

  // Load alarm enabled state on mount
  useEffect(() => {
    loadAlarmEnabledState();
  }, []);

  // Auto-enable alarm when times change (unless explicitly disabled)
  useEffect(() => {
    if (isAlarmEnabled && startTime && endTime) {
      console.log('🔄 Times changed, updating daily alarm...', { startTime, endTime });
      onAlarmStatusChange && onAlarmStatusChange(true, { startTime, endTime });
    }
  }, [startTime, endTime, isAlarmEnabled]);

  const loadAlarmEnabledState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('alarmEnabled');
      const enabled = savedState !== null ? JSON.parse(savedState) : true; // Default to enabled
      setIsAlarmEnabled(enabled);
      
      // If enabled, immediately activate alarm with current times
      if (enabled) {
        onAlarmStatusChange && onAlarmStatusChange(true, { startTime, endTime });
      }
    } catch (error) {
      console.error('Failed to load alarm enabled state:', error);
    }
  };

  const saveAlarmEnabledState = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem('alarmEnabled', JSON.stringify(enabled));
    } catch (error) {
      console.error('Failed to save alarm enabled state:', error);
    }
  };

  const disableAlarm = () => {
    Alert.alert(
      'Disable Daily Alarm',
      'Are you sure you want to disable the daily alarm? You can re-enable it by changing the alarm times.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            setIsAlarmEnabled(false);
            saveAlarmEnabledState(false);
            onAlarmStatusChange && onAlarmStatusChange(false);
          }
        }
      ]
    );
  };

  const enableAlarm = () => {
    setIsAlarmEnabled(true);
    saveAlarmEnabledState(true);
    onAlarmStatusChange && onAlarmStatusChange(true, { startTime, endTime });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time" size={20} color="#3b82f6" />
        <Text style={styles.headerText}>UnlockAM Window</Text>
      </View>

      <View style={styles.timeContainer}>
        {/* Start Time */}
        <View style={styles.timeRow}>
          <View style={styles.timeInfo}>
            <View style={[styles.iconCircle, { backgroundColor: '#10b981' }]}>
              <Ionicons name="play" size={12} color="white" />
            </View>
            <View>
              <Text style={styles.timeLabel}>Start Time</Text>
              <Text style={styles.timeSubtitle}>When alarms begin</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => onOpenTimePicker('start')}
          >
            <Text style={styles.timeText}>{formatTime(startTime)}</Text>
          </TouchableOpacity>
        </View>

        {/* End Time */}
        <View style={styles.timeRow}>
          <View style={styles.timeInfo}>
            <View style={[styles.iconCircle, { backgroundColor: '#ef4444' }]}>
              <Ionicons name="stop" size={12} color="white" />
            </View>
            <View>
              <Text style={styles.timeLabel}>End Time</Text>
              <Text style={styles.timeSubtitle}>When alarms stop</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => onOpenTimePicker('end')}
          >
            <Text style={styles.timeText}>{formatTime(endTime)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Display */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: isAlarmEnabled ? '#10b981' : '#6b7280' }]}>
          <Ionicons 
            name={isAlarmEnabled ? "checkmark-circle" : "close-circle"} 
            size={16} 
            color="white" 
          />
        </View>
        <Text style={[styles.statusText, { color: isAlarmEnabled ? '#10b981' : '#6b7280' }]}>
          {isAlarmEnabled ? 'Daily alarm is active' : 'Daily alarm is disabled'}
        </Text>
      </View>

      {/* Action Button */}
      {isAlarmEnabled ? (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
          onPress={disableAlarm}
        >
          <Ionicons name="close" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Disable Daily Alarm</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#10b981' }]}
          onPress={enableAlarm}
        >
          <Ionicons name="checkmark" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Enable Daily Alarm</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  timeContainer: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  timeSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  timeButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionButton: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
