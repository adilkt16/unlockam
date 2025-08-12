import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { AlarmyStyleAlarmModule } = NativeModules;

// Create event emitter for alarm events
const alarmEventEmitter = AlarmyStyleAlarmModule 
  ? new NativeEventEmitter(AlarmyStyleAlarmModule) 
  : null;

/**
 * React Native hook for Alarmy-style alarm functionality
 * Provides complete alarm management with maximum reliability
 */
export const useAlarmyStyleAlarm = () => {
  
  /**
   * Schedule an alarm with Alarmy-style reliability
   * @param alarmId - Unique identifier for the alarm
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   * @param label - Display label for the alarm
   * @returns Promise with scheduling result
   */
  const scheduleAlarm = async (
    alarmId: number, 
    hour: number, 
    minute: number, 
    label: string = 'Wake up!'
  ): Promise<{success: boolean, message: string, triggerTime?: number}> => {
    if (Platform.OS !== 'android') {
      return { success: false, message: 'Alarmy-style alarms are only available on Android' };
    }
    
    if (!AlarmyStyleAlarmModule) {
      return { success: false, message: 'AlarmyStyleAlarmModule not available' };
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.scheduleAlarm(alarmId, hour, minute, label);
      console.log('Alarm scheduled successfully:', result);
      return result;
    } catch (error: any) {
      console.error('Failed to schedule alarm:', error);
      return { success: false, message: error?.message || 'Unknown error occurred' };
    }
  };
  
  /**
   * Schedule a test alarm for immediate testing
   * @param secondsFromNow - Seconds from now to trigger (default: 10)
   * @returns Promise with scheduling result
   */
  const scheduleTestAlarm = async (secondsFromNow: number = 10): Promise<{success: boolean, message: string}> => {
    if (Platform.OS !== 'android') {
      return { success: false, message: 'Test alarms are only available on Android' };
    }
    
    if (!AlarmyStyleAlarmModule) {
      return { success: false, message: 'AlarmyStyleAlarmModule not available' };
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.scheduleTestAlarm(secondsFromNow);
      console.log('Test alarm scheduled:', result);
      return result;
    } catch (error: any) {
      console.error('Failed to schedule test alarm:', error);
      return { success: false, message: error?.message || 'Unknown error occurred' };
    }
  };
  
  /**
   * Cancel a scheduled alarm
   * @param alarmId - Unique identifier of the alarm to cancel
   * @returns Promise with cancellation result
   */
  const cancelAlarm = async (alarmId: number): Promise<{success: boolean, message: string}> => {
    if (Platform.OS !== 'android') {
      return { success: false, message: 'Alarm cancellation is only available on Android' };
    }
    
    if (!AlarmyStyleAlarmModule) {
      return { success: false, message: 'AlarmyStyleAlarmModule not available' };
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.cancelAlarm(alarmId);
      console.log('Alarm cancelled:', result);
      return result;
    } catch (error: any) {
      console.error('Failed to cancel alarm:', error);
      return { success: false, message: error?.message || 'Unknown error occurred' };
    }
  };
  
  /**
   * Check if exact alarm permission is granted (Android 12+)
   * @returns Promise with permission status
   */
  const checkExactAlarmPermission = async (): Promise<{hasPermission: boolean, isRequired: boolean}> => {
    if (Platform.OS !== 'android') {
      return { hasPermission: true, isRequired: false };
    }
    
    if (!AlarmyStyleAlarmModule) {
      return { hasPermission: false, isRequired: true };
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.checkExactAlarmPermission();
      return result;
    } catch (error) {
      console.error('Failed to check exact alarm permission:', error);
      return { hasPermission: false, isRequired: true };
    }
  };
  
  /**
   * Request exact alarm permission (opens system settings)
   * @returns Promise with request result
   */
  const requestExactAlarmPermission = async (): Promise<{success: boolean, message: string}> => {
    if (Platform.OS !== 'android') {
      return { success: true, message: 'Permission not required on this platform' };
    }
    
    if (!AlarmyStyleAlarmModule) {
      return { success: false, message: 'AlarmyStyleAlarmModule not available' };
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.requestExactAlarmPermission();
      return result;
    } catch (error: any) {
      console.error('Failed to request exact alarm permission:', error);
      return { success: false, message: error?.message || 'Unknown error occurred' };
    }
  };
  
  /**
   * Check if overlay permission is granted
   * @returns Promise with permission status
   */
  const checkOverlayPermission = async (): Promise<{hasPermission: boolean, isRequired: boolean}> => {
    if (Platform.OS !== 'android') {
      return { hasPermission: true, isRequired: false };
    }
    
    if (!AlarmyStyleAlarmModule) {
      return { hasPermission: false, isRequired: true };
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.checkOverlayPermission();
      return result;
    } catch (error) {
      console.error('Failed to check overlay permission:', error);
      return { hasPermission: false, isRequired: false };
    }
  };
  
  /**
   * Request overlay permission (opens system settings)
   * @returns Promise with request result
   */
  const requestOverlayPermission = async (): Promise<{success: boolean, message: string}> => {
    if (Platform.OS !== 'android') {
      return { success: true, message: 'Permission not required on this platform' };
    }
    
    if (!AlarmyStyleAlarmModule) {
      return { success: false, message: 'AlarmyStyleAlarmModule not available' };
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.requestOverlayPermission();
      return result;
    } catch (error: any) {
      console.error('Failed to request overlay permission:', error);
      return { success: false, message: error?.message || 'Unknown error occurred' };
    }
  };
  
  /**
   * Request battery optimization exemption (critical for Alarmy-style reliability)
   * @returns Promise with request result
   */
  const requestBatteryOptimizationExemption = async (): Promise<{success: boolean, message: string}> => {
    if (Platform.OS !== 'android') {
      return { success: true, message: 'Battery optimization not applicable on this platform' };
    }
    
    if (!AlarmyStyleAlarmModule) {
      return { success: false, message: 'AlarmyStyleAlarmModule not available' };
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.requestBatteryOptimizationExemption();
      return result;
    } catch (error: any) {
      console.error('Failed to request battery optimization exemption:', error);
      return { success: false, message: error?.message || 'Unknown error occurred' };
    }
  };
  
  /**
   * Get comprehensive system status for alarm functionality
   * @returns Promise with system capabilities and status
   */
  const getSystemStatus = async (): Promise<{
    canScheduleExactAlarms: boolean,
    hasOverlayPermission: boolean,
    androidVersion: number,
    deviceModel: string,
    manufacturer: string
  } | null> => {
    if (Platform.OS !== 'android') {
      return null;
    }
    
    if (!AlarmyStyleAlarmModule) {
      return null;
    }
    
    try {
      const result = await AlarmyStyleAlarmModule.getSystemStatus();
      return result;
    } catch (error) {
      console.error('Failed to get system status:', error);
      return null;
    }
  };
  
  /**
   * Setup all necessary permissions for Alarmy-style alarm functionality
   * This is a convenience method that checks and requests all required permissions
   * @returns Promise with setup result and status of all permissions
   */
  const setupAlarmPermissions = async (): Promise<{
    success: boolean,
    exactAlarm: boolean,
    overlay: boolean,
    batteryOptimization: boolean,
    message: string
  }> => {
    if (Platform.OS !== 'android') {
      return {
        success: true,
        exactAlarm: true,
        overlay: true,
        batteryOptimization: true,
        message: 'All permissions granted (not required on this platform)'
      };
    }
    
    try {
      // Check exact alarm permission
      const exactAlarmStatus = await checkExactAlarmPermission();
      
      // Check overlay permission
      const overlayStatus = await checkOverlayPermission();
      
      const setupResult = {
        success: exactAlarmStatus.hasPermission,
        exactAlarm: exactAlarmStatus.hasPermission,
        overlay: overlayStatus.hasPermission,
        batteryOptimization: false, // We can't check this programmatically
        message: ''
      };
      
      // Build status message
      const messages = [];
      if (!exactAlarmStatus.hasPermission && exactAlarmStatus.isRequired) {
        messages.push('Exact Alarm permission required');
      }
      if (!overlayStatus.hasPermission && overlayStatus.isRequired) {
        messages.push('Display Over Apps permission recommended');
      }
      messages.push('Battery optimization exemption recommended');
      
      setupResult.message = messages.length > 0 
        ? `Setup needed: ${messages.join(', ')}` 
        : 'All permissions configured';
      
      return setupResult;
      
    } catch (error) {
      console.error('Failed to setup alarm permissions:', error);
      return {
        success: false,
        exactAlarm: false,
        overlay: false,
        batteryOptimization: false,
        message: 'Failed to check permissions'
      };
    }
  };
  
  return {
    // Core alarm functions
    scheduleAlarm,
    scheduleTestAlarm,
    cancelAlarm,
    
    // Permission management
    checkExactAlarmPermission,
    requestExactAlarmPermission,
    checkOverlayPermission,
    requestOverlayPermission,
    requestBatteryOptimizationExemption,
    
    // System information
    getSystemStatus,
    
    // Convenience functions
    setupAlarmPermissions,
  };
};
