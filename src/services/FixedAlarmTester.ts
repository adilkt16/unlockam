import { NativeModules, Platform } from 'react-native';

interface AlarmTestResult {
  success: boolean;
  message: string;
}

interface AlarmyAlarmNative {
  scheduleTestAlarm(secondsFromNow: number): Promise<AlarmTestResult>;
  testNativeServiceNow(): Promise<AlarmTestResult>;
  testLockedStateAlarmNow(): Promise<AlarmTestResult>;
  stopCurrentAlarm(): Promise<AlarmTestResult>;
  checkPermissions(): Promise<{
    exactAlarm: boolean;
    systemAlertWindow: boolean;
    batteryOptimization: boolean;
    notifications: boolean;
  }>;
  requestPermissions(): Promise<boolean>;
}

const { AlarmyStyleAlarmModule } = NativeModules;

/**
 * Fixed Bulletproof Alarm Tester
 * Provides working test methods for the alarm system
 */
export class FixedAlarmTester {
  private static instance: FixedAlarmTester;

  static getInstance(): FixedAlarmTester {
    if (!FixedAlarmTester.instance) {
      FixedAlarmTester.instance = new FixedAlarmTester();
    }
    return FixedAlarmTester.instance;
  }

  private constructor() {}

  /**
   * Check if native alarm module is available
   */
  get isNativeAvailable(): boolean {
    return Platform.OS === 'android' && AlarmyStyleAlarmModule != null;
  }

  /**
   * Test alarm in 30 seconds - WORKING VERSION
   */
  async testAlarmIn30Seconds(): Promise<AlarmTestResult> {
    console.log('🧪 FIXED ALARM TEST: Starting 30-second test...');
    
    if (!this.isNativeAvailable) {
      console.log('⚠️ Native module not available, using fallback method');
      return this.testFallbackAlarm();
    }

    try {
      const result = await (AlarmyStyleAlarmModule as AlarmyAlarmNative).scheduleTestAlarm(30);
      
      if (result.success) {
        console.log('✅ NATIVE TEST ALARM SCHEDULED!');
        console.log('📱 Lock your phone now - alarm will ring in 30 seconds');
        console.log('🔊 Audio will play even in locked state');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Native test failed, trying fallback:', error);
      return this.testFallbackAlarm();
    }
  }

  /**
   * Test native service now - WORKING VERSION
   */
  async testNativeServiceNow(): Promise<AlarmTestResult> {
    console.log('🔧 FIXED NATIVE SERVICE TEST: Starting now...');
    
    if (!this.isNativeAvailable) {
      return {
        success: false,
        message: 'Native module not available - app needs to be rebuilt'
      };
    }

    try {
      const result = await (AlarmyStyleAlarmModule as AlarmyAlarmNative).testNativeServiceNow();
      
      if (result.success) {
        console.log('✅ NATIVE SERVICE STARTED!');
        console.log('📱 LOCK YOUR PHONE NOW to test background audio');
        console.log('🔊 AlarmyStyleAlarmService is now playing audio');
        console.log('⏰ Will auto-stop in 30 seconds');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Native service test failed:', error);
      return {
        success: false,
        message: `Native service test failed: ${error}`
      };
    }
  }

  /**
   * Test locked state alarm immediately - WORKING VERSION
   */
  async testLockedStateAlarmNow(): Promise<AlarmTestResult> {
    console.log('🔒 FIXED LOCKED STATE TEST: Starting now...');
    
    if (!this.isNativeAvailable) {
      return {
        success: false,
        message: 'Native module not available - app needs to be rebuilt'
      };
    }

    try {
      const result = await (AlarmyStyleAlarmModule as AlarmyAlarmNative).testLockedStateAlarmNow();
      
      if (result.success) {
        console.log('✅ LOCKED STATE ALARM STARTED!');
        console.log('🔒 Full-screen alarm activity should appear');
        console.log('🔊 Audio should play with maximum volume');
        console.log('📱 Works even over lock screen');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Locked state test failed:', error);
      return {
        success: false,
        message: `Locked state test failed: ${error}`
      };
    }
  }

  /**
   * Stop current alarm test
   */
  async stopCurrentAlarm(): Promise<AlarmTestResult> {
    console.log('🛑 Stopping current alarm test...');
    
    if (!this.isNativeAvailable) {
      return {
        success: true,
        message: 'No native alarm to stop'
      };
    }

    try {
      const result = await (AlarmyStyleAlarmModule as AlarmyAlarmNative).stopCurrentAlarm();
      console.log('✅ Alarm test stopped');
      return result;
    } catch (error) {
      console.error('❌ Failed to stop alarm:', error);
      return {
        success: false,
        message: `Failed to stop alarm: ${error}`
      };
    }
  }

  /**
   * Check alarm permissions
   */
  async checkPermissions(): Promise<{
    exactAlarm: boolean;
    systemAlertWindow: boolean;
    batteryOptimization: boolean;
    notifications: boolean;
  }> {
    if (!this.isNativeAvailable) {
      return {
        exactAlarm: false,
        systemAlertWindow: false,
        batteryOptimization: false,
        notifications: false,
      };
    }

    try {
      return await (AlarmyStyleAlarmModule as AlarmyAlarmNative).checkPermissions();
    } catch (error) {
      console.error('❌ Failed to check permissions:', error);
      return {
        exactAlarm: false,
        systemAlertWindow: false,
        batteryOptimization: false,
        notifications: false,
      };
    }
  }

  /**
   * Request alarm permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isNativeAvailable) {
      return false;
    }

    try {
      return await (AlarmyStyleAlarmModule as AlarmyAlarmNative).requestPermissions();
    } catch (error) {
      console.error('❌ Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Fallback alarm test using basic React Native methods
   */
  private async testFallbackAlarm(): Promise<AlarmTestResult> {
    console.log('🔄 FALLBACK ALARM TEST: Using basic notification method');
    
    try {
      // Import Notifications here to avoid module issues
      const Notifications = require('expo-notifications');
      
      // Schedule a notification in 30 seconds
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 TEST ALARM 🚨',
          body: 'This is a fallback alarm test!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 1000, 500, 1000, 500],
        },
        trigger: {
          seconds: 30,
        },
      });

      return {
        success: true,
        message: 'Fallback alarm scheduled using notifications (30 seconds)'
      };
    } catch (error) {
      console.error('❌ Fallback alarm failed:', error);
      return {
        success: false,
        message: `Fallback alarm failed: ${error}`
      };
    }
  }

  /**
   * Get comprehensive alarm system status
   */
  async getSystemStatus(): Promise<{
    nativeModuleAvailable: boolean;
    permissions: any;
    recommendations: string[];
  }> {
    const permissions = await this.checkPermissions();
    const recommendations: string[] = [];

    if (!this.isNativeAvailable) {
      recommendations.push('Rebuild app with EAS Build or expo run:android to enable native modules');
    }

    if (!permissions.exactAlarm) {
      recommendations.push('Grant "Schedule Exact Alarms" permission in Android settings');
    }

    if (!permissions.systemAlertWindow) {
      recommendations.push('Grant "Display over other apps" permission for lock screen alarms');
    }

    if (!permissions.batteryOptimization) {
      recommendations.push('Disable battery optimization for this app');
    }

    if (!permissions.notifications) {
      recommendations.push('Enable notifications for alarm functionality');
    }

    return {
      nativeModuleAvailable: this.isNativeAvailable,
      permissions,
      recommendations
    };
  }
}

// Export singleton
export const FixedAlarmTest = FixedAlarmTester.getInstance();
