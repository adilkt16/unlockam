import { NativeModules, Platform } from 'react-native';

interface AlarmyStyleAlarmInterface {
  scheduleAlarm(options: {
    alarmId: string;
    triggerTime: number;
    label?: string;
  }): Promise<{ success: boolean; message: string }>;

  scheduleTestAlarm(secondsFromNow: number): Promise<{ success: boolean; message: string }>;

  testNativeServiceNow(): Promise<{ success: boolean; message: string }>;

  testLockedStateAlarmNow(): Promise<{ success: boolean; message: string }>;

  cancelAlarm(alarmId: string): Promise<{ success: boolean; message: string }>;

  stopCurrentAlarm(): Promise<{ success: boolean; message: string }>;

  checkPermissions(): Promise<{
    exactAlarm: boolean;
    systemAlertWindow: boolean;
    batteryOptimization: boolean;
    notifications: boolean;
  }>;

  requestPermissions(): Promise<boolean>;
}

// Get the native module
const AlarmyStyleAlarmNative = Platform.OS === 'android' 
  ? NativeModules.AlarmyStyleAlarmModule as AlarmyStyleAlarmInterface
  : null;

/**
 * React Native interface to the Alarmy-style alarm system
 * This provides access to all native Android alarm functionality
 */
export class AlarmyStyleAlarmManager {
  private static instance: AlarmyStyleAlarmManager;

  static getInstance(): AlarmyStyleAlarmManager {
    if (!AlarmyStyleAlarmManager.instance) {
      AlarmyStyleAlarmManager.instance = new AlarmyStyleAlarmManager();
    }
    return AlarmyStyleAlarmManager.instance;
  }

  private constructor() {}

  /**
   * Check if the native module is available
   */
  get isAvailable(): boolean {
    return Platform.OS === 'android' && AlarmyStyleAlarmNative !== null;
  }

  /**
   * Schedule an alarm with Alarmy-style reliability
   */
  async scheduleAlarm(options: {
    alarmId: string;
    triggerTime: number;
    label?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable || !AlarmyStyleAlarmNative) {
      throw new Error('Alarmy-style alarm module not available on this platform');
    }

    try {
      console.log('🚨 ALARMY: Scheduling alarm with native service:', options);
      const result = await AlarmyStyleAlarmNative.scheduleAlarm(options);
      console.log('✅ ALARMY: Native alarm scheduled:', result);
      return result;
    } catch (error) {
      console.error('❌ ALARMY: Failed to schedule alarm:', error);
      throw error;
    }
  }

  /**
   * Schedule a test alarm for immediate testing (30 seconds by default)
   */
  async scheduleTestAlarm(secondsFromNow: number = 30): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable || !AlarmyStyleAlarmNative) {
      throw new Error('Alarmy-style alarm module not available on this platform');
    }

    try {
      console.log(`🧪 ALARMY TEST: Scheduling test alarm in ${secondsFromNow} seconds`);
      const result = await AlarmyStyleAlarmNative.scheduleTestAlarm(secondsFromNow);
      console.log('✅ ALARMY TEST: Test alarm scheduled:', result);
      return result;
    } catch (error) {
      console.error('❌ ALARMY TEST: Failed to schedule test alarm:', error);
      throw error;
    }
  }

  /**
   * Test the native service directly - this will start playing alarm sound immediately
   * Perfect for testing locked-state audio playback
   */
  async testNativeServiceNow(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable || !AlarmyStyleAlarmNative) {
      throw new Error('Alarmy-style alarm module not available on this platform');
    }

    try {
      console.log('🔧 ALARMY TEST: Testing native service NOW');
      const result = await AlarmyStyleAlarmNative.testNativeServiceNow();
      console.log('✅ ALARMY TEST: Native service test started:', result);
      return result;
    } catch (error) {
      console.error('❌ ALARMY TEST: Native service test failed:', error);
      throw error;
    }
  }

  /**
   * Test locked-state alarm immediately - shows full alarm interface
   */
  async testLockedStateAlarmNow(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable || !AlarmyStyleAlarmNative) {
      throw new Error('Alarmy-style alarm module not available on this platform');
    }

    try {
      console.log('🔒 ALARMY TEST: Testing locked state alarm NOW');
      const result = await AlarmyStyleAlarmNative.testLockedStateAlarmNow();
      console.log('✅ ALARMY TEST: Locked state alarm test started:', result);
      return result;
    } catch (error) {
      console.error('❌ ALARMY TEST: Locked state alarm test failed:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled alarm
   */
  async cancelAlarm(alarmId: string): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable || !AlarmyStyleAlarmNative) {
      throw new Error('Alarmy-style alarm module not available on this platform');
    }

    try {
      console.log('🛑 ALARMY: Cancelling alarm:', alarmId);
      const result = await AlarmyStyleAlarmNative.cancelAlarm(alarmId);
      console.log('✅ ALARMY: Alarm cancelled:', result);
      return result;
    } catch (error) {
      console.error('❌ ALARMY: Failed to cancel alarm:', error);
      throw error;
    }
  }

  /**
   * Stop currently playing alarm
   */
  async stopCurrentAlarm(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable || !AlarmyStyleAlarmNative) {
      throw new Error('Alarmy-style alarm module not available on this platform');
    }

    try {
      console.log('🛑 ALARMY: Stopping current alarm');
      const result = await AlarmyStyleAlarmNative.stopCurrentAlarm();
      console.log('✅ ALARMY: Current alarm stopped:', result);
      return result;
    } catch (error) {
      console.error('❌ ALARMY: Failed to stop current alarm:', error);
      throw error;
    }
  }

  /**
   * Check required permissions for Alarmy-style functionality
   */
  async checkPermissions(): Promise<{
    exactAlarm: boolean;
    systemAlertWindow: boolean;
    batteryOptimization: boolean;
    notifications: boolean;
  }> {
    if (!this.isAvailable || !AlarmyStyleAlarmNative) {
      return {
        exactAlarm: false,
        systemAlertWindow: false,
        batteryOptimization: false,
        notifications: false,
      };
    }

    try {
      const permissions = await AlarmyStyleAlarmNative.checkPermissions();
      console.log('📋 ALARMY: Permission status:', permissions);
      return permissions;
    } catch (error) {
      console.error('❌ ALARMY: Failed to check permissions:', error);
      return {
        exactAlarm: false,
        systemAlertWindow: false,
        batteryOptimization: false,
        notifications: false,
      };
    }
  }

  /**
   * Request all required permissions for Alarmy-style functionality
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isAvailable || !AlarmyStyleAlarmNative) {
      return false;
    }

    try {
      console.log('📱 ALARMY: Requesting permissions');
      const result = await AlarmyStyleAlarmNative.requestPermissions();
      console.log('✅ ALARMY: Permissions requested:', result);
      return result;
    } catch (error) {
      console.error('❌ ALARMY: Failed to request permissions:', error);
      return false;
    }
  }
}

// Export singleton instance
export const AlarmyStyleAlarm = AlarmyStyleAlarmManager.getInstance();
