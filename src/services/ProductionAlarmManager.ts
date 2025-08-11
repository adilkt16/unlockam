import React, { useState, useEffect } from 'react';
import { NativeModules, Platform, Alert } from 'react-native';

// Import the production alarm module
const { ProductionAlarm } = NativeModules;

/**
 * Production-ready alarm manager for React Native
 * This provides a clean interface to the native Android alarm system
 */
export class ProductionAlarmManager {
  private static instance: ProductionAlarmManager;
  
  static getInstance(): ProductionAlarmManager {
    if (!ProductionAlarmManager.instance) {
      ProductionAlarmManager.instance = new ProductionAlarmManager();
    }
    return ProductionAlarmManager.instance;
  }
  
  /**
   * Schedule a production-ready alarm that works even in Doze mode
   */
  async scheduleAlarm(options: {
    alarmId: string;
    triggerTime: number; // Unix timestamp in milliseconds
    soundType?: string;
    vibration?: boolean;
    label?: string;
  }): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('Production alarms only supported on Android');
      }
      
      if (!ProductionAlarm) {
        throw new Error('ProductionAlarm native module not available');
      }
      
      console.log('📅 Scheduling production alarm:', options);
      
      const result = await ProductionAlarm.scheduleExactAlarm({
        alarmId: options.alarmId,
        triggerTime: options.triggerTime,
        soundType: options.soundType || 'default',
        vibration: options.vibration !== false,
        label: options.label || 'Alarm',
      });
      
      console.log('✅ Production alarm scheduled:', result);
      return result.success;
      
    } catch (error) {
      console.error('❌ Failed to schedule production alarm:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a scheduled alarm
   */
  async cancelAlarm(alarmId: string): Promise<boolean> {
    try {
      if (!ProductionAlarm) {
        throw new Error('ProductionAlarm native module not available');
      }
      
      console.log('🗑️ Cancelling production alarm:', alarmId);
      
      const result = await ProductionAlarm.cancelAlarm(alarmId);
      
      console.log('✅ Production alarm cancelled:', result);
      return result.success;
      
    } catch (error) {
      console.error('❌ Failed to cancel production alarm:', error);
      throw error;
    }
  }
  
  /**
   * Stop a currently playing alarm
   */
  async stopAlarm(alarmId: string): Promise<boolean> {
    try {
      if (!ProductionAlarm) {
        throw new Error('ProductionAlarm native module not available');
      }
      
      console.log('🛑 Stopping production alarm:', alarmId);
      
      const result = await ProductionAlarm.stopAlarm(alarmId);
      
      console.log('✅ Production alarm stopped:', result);
      return result.success;
      
    } catch (error) {
      console.error('❌ Failed to stop production alarm:', error);
      throw error;
    }
  }
  
  /**
   * Get current alarm status and permissions
   */
  async getAlarmStatus(): Promise<AlarmStatus> {
    try {
      if (!ProductionAlarm) {
        return {
          canScheduleExactAlarms: false,
          isBatteryOptimized: true,
          canShowOverOtherApps: false,
          hasNotificationPermission: false,
          supportsExactAlarms: false,
          sdkVersion: 0,
          deviceManufacturer: 'unknown',
          deviceModel: 'unknown',
        };
      }
      
      const status = await ProductionAlarm.getAlarmStatus();
      console.log('📊 Alarm status:', status);
      return status;
      
    } catch (error) {
      console.error('❌ Failed to get alarm status:', error);
      throw error;
    }
  }
  
  /**
   * Request all necessary permissions for production alarms
   */
  async requestAllPermissions(): Promise<PermissionResults> {
    const results: PermissionResults = {
      exactAlarm: 'unknown',
      batteryOptimization: 'unknown',
      overlay: 'unknown',
      notifications: 'unknown',
    };
    
    try {
      if (!ProductionAlarm) {
        return results;
      }
      
      const status = await this.getAlarmStatus();
      
      // Request exact alarm permission (Android 12+)
      if (!status.canScheduleExactAlarms && status.sdkVersion >= 31) {
        try {
          await ProductionAlarm.requestExactAlarmPermission();
          results.exactAlarm = 'requested';
        } catch (error) {
          results.exactAlarm = 'error';
        }
      } else {
        results.exactAlarm = status.canScheduleExactAlarms ? 'granted' : 'not_needed';
      }
      
      // Request battery optimization exemption
      if (status.isBatteryOptimized) {
        try {
          await ProductionAlarm.requestIgnoreBatteryOptimization();
          results.batteryOptimization = 'requested';
        } catch (error) {
          results.batteryOptimization = 'error';
        }
      } else {
        results.batteryOptimization = 'granted';
      }
      
      // Request overlay permission
      if (!status.canShowOverOtherApps) {
        try {
          await ProductionAlarm.requestOverlayPermission();
          results.overlay = 'requested';
        } catch (error) {
          results.overlay = 'error';
        }
      } else {
        results.overlay = 'granted';
      }
      
      // Note: Notification permission must be requested through React Native's PermissionsAndroid
      results.notifications = status.hasNotificationPermission ? 'granted' : 'needs_request';
      
      return results;
      
    } catch (error) {
      console.error('❌ Failed to request permissions:', error);
      return results;
    }
  }
  
  /**
   * Get OEM-specific battery optimization guidance
   */
  async getOEMGuidance(): Promise<OEMGuidance> {
    try {
      if (!ProductionAlarm) {
        return {
          manufacturer: 'unknown',
          model: 'unknown',
          title: 'Unknown Device',
          instructions: 'Please check your device settings for battery optimization options.',
        };
      }
      
      const guidance = await ProductionAlarm.getOEMBatteryGuidance();
      console.log('📱 OEM guidance:', guidance);
      return guidance;
      
    } catch (error) {
      console.error('❌ Failed to get OEM guidance:', error);
      throw error;
    }
  }
  
  /**
   * Test alarm functionality with a 30-second test
   */
  async testAlarm(): Promise<boolean> {
    try {
      if (!ProductionAlarm) {
        throw new Error('ProductionAlarm native module not available');
      }
      
      console.log('🧪 Starting 30-second test alarm...');
      
      const result = await ProductionAlarm.testAlarmIn30Seconds();
      
      console.log('✅ Test alarm scheduled:', result);
      return result.success;
      
    } catch (error) {
      console.error('❌ Failed to test alarm:', error);
      throw error;
    }
  }
  
  /**
   * Show a comprehensive permission setup guide
   */
  async showSetupGuide(): Promise<void> {
    try {
      const status = await this.getAlarmStatus();
      const guidance = await this.getOEMGuidance();
      
      const missingPermissions = [];
      
      if (!status.canScheduleExactAlarms && status.sdkVersion >= 31) {
        missingPermissions.push('• Exact Alarm Permission (Android 12+ requirement)');
      }
      
      if (status.isBatteryOptimized) {
        missingPermissions.push('• Battery Optimization Exemption');
      }
      
      if (!status.canShowOverOtherApps) {
        missingPermissions.push('• Display Over Other Apps');
      }
      
      if (!status.hasNotificationPermission && status.sdkVersion >= 33) {
        missingPermissions.push('• Notification Permission (Android 13+ requirement)');
      }
      
      let message = '';
      
      if (missingPermissions.length > 0) {
        message = `⚠️ SETUP REQUIRED FOR RELIABLE ALARMS\n\nTo ensure your alarms work even when your phone is locked or in battery saving mode, please grant these permissions:\n\n${missingPermissions.join('\n')}\n\n`;
      } else {
        message = '✅ ALL PERMISSIONS GRANTED!\n\nYour alarms are configured for maximum reliability.\n\n';
      }
      
      message += `📱 Device-Specific Settings (${guidance.manufacturer} ${guidance.model}):\n\n${guidance.instructions}\n\n`;
      message += `💡 Why This Matters:\n• Modern Android aggressively kills background apps\n• Without these permissions, alarms may not ring\n• This setup ensures 99.9% alarm reliability`;
      
      Alert.alert('UnlockAM Alarm Setup', message, [
        { text: 'Skip', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => this.requestAllPermissions()
        }
      ]);
      
    } catch (error) {
      console.error('❌ Failed to show setup guide:', error);
      Alert.alert('Setup Error', 'Failed to load setup information. Please check permissions manually in device settings.');
    }
  }
}

// Types
export interface AlarmStatus {
  canScheduleExactAlarms: boolean;
  isBatteryOptimized: boolean;
  canShowOverOtherApps: boolean;
  hasNotificationPermission: boolean;
  supportsExactAlarms: boolean;
  sdkVersion: number;
  deviceManufacturer: string;
  deviceModel: string;
}

export interface PermissionResults {
  exactAlarm: 'granted' | 'requested' | 'not_needed' | 'error' | 'unknown';
  batteryOptimization: 'granted' | 'requested' | 'error' | 'unknown';
  overlay: 'granted' | 'requested' | 'error' | 'unknown';
  notifications: 'granted' | 'needs_request' | 'unknown';
}

export interface OEMGuidance {
  manufacturer: string;
  model: string;
  title: string;
  instructions: string;
}

/**
 * React Hook for production alarm management
 */
export function useProductionAlarm() {
  const [alarmManager] = useState(() => ProductionAlarmManager.getInstance());
  const [status, setStatus] = useState<AlarmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadStatus();
  }, []);
  
  const loadStatus = async () => {
    try {
      setLoading(true);
      const currentStatus = await alarmManager.getAlarmStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Failed to load alarm status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const scheduleAlarm = async (options: Parameters<typeof alarmManager.scheduleAlarm>[0]) => {
    const result = await alarmManager.scheduleAlarm(options);
    await loadStatus(); // Refresh status
    return result;
  };
  
  const cancelAlarm = async (alarmId: string) => {
    const result = await alarmManager.cancelAlarm(alarmId);
    await loadStatus(); // Refresh status
    return result;
  };
  
  const setupPermissions = async () => {
    await alarmManager.showSetupGuide();
    await loadStatus(); // Refresh status after potential permission changes
  };
  
  const testAlarm = async () => {
    return await alarmManager.testAlarm();
  };
  
  return {
    alarmManager,
    status,
    loading,
    scheduleAlarm,
    cancelAlarm,
    setupPermissions,
    testAlarm,
    refreshStatus: loadStatus,
  };
}
