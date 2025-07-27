import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PermissionStatus {
  notifications: boolean;
  backgroundFetch: boolean;
  systemAlertWindow: boolean;
  batteryOptimization: boolean;
  wakelock: boolean;
  vibration: boolean;
}

export interface PermissionRequest {
  type: keyof PermissionStatus;
  title: string;
  description: string;
  importance: 'critical' | 'recommended' | 'optional';
  icon: string;
  instructions?: string[];
  androidInstructions?: string[];
  deviceSpecificInstructions?: Record<string, string[]>;
}

export const PERMISSION_REQUESTS: PermissionRequest[] = [
  {
    type: 'notifications',
    title: 'Notifications',
    description: 'Essential for alarm functionality. Without this, your alarms will not work.',
    importance: 'critical',
    icon: 'notifications-outline',
    instructions: [
      'Allow notifications when prompted',
      'If denied, go to Settings > Apps > UnlockAM > Notifications',
      'Enable "Allow notifications"'
    ],
    androidInstructions: [
      'Tap "Allow" when prompted',
      'Go to Settings > Apps > UnlockAM > Notifications',
      'Enable all notification categories'
    ]
  },
  {
    type: 'systemAlertWindow',
    title: 'Display Over Other Apps',
    description: 'Allows alarm to show on your lock screen and over other apps.',
    importance: 'critical',
    icon: 'phone-portrait-outline',
    instructions: [
      'Go to Settings > Apps > UnlockAM > Advanced',
      'Enable "Display over other apps"',
      'This ensures alarms show even when your phone is locked'
    ],
    deviceSpecificInstructions: {
      'samsung': [
        'Go to Settings > Apps > UnlockAM > Other permissions',
        'Enable "Apps that can appear on top"',
        'Return to app to continue'
      ],
      'xiaomi': [
        'Go to Settings > Apps > Manage apps > UnlockAM',
        'Tap "Other permissions"',
        'Enable "Display pop-up windows while running in background"'
      ],
      'huawei': [
        'Go to Settings > Apps > UnlockAM > Permissions',
        'Enable "Draw over other apps"',
        'Return to app to continue'
      ]
    }
  },
  {
    type: 'batteryOptimization',
    title: 'Battery Optimization',
    description: 'Prevents the system from killing the app, ensuring alarms work reliably.',
    importance: 'critical',
    icon: 'battery-charging-outline',
    instructions: [
      'Go to Settings > Battery > Battery optimization',
      'Find UnlockAM in the list',
      'Select "Don\'t optimize"',
      'This keeps alarms working in the background'
    ],
    deviceSpecificInstructions: {
      'samsung': [
        'Go to Settings > Device care > Battery',
        'Tap "More battery settings"',
        'Select "Optimize battery usage"',
        'Find UnlockAM and turn off optimization'
      ],
      'xiaomi': [
        'Go to Settings > Apps > Manage apps > UnlockAM',
        'Tap "Battery saver"',
        'Select "No restrictions"',
        'Also enable "Autostart"'
      ],
      'oneplus': [
        'Go to Settings > Battery > Battery optimization',
        'Tap "All apps"',
        'Find UnlockAM and select "Don\'t optimize"'
      ]
    }
  },
  {
    type: 'backgroundFetch',
    title: 'Background App Refresh',
    description: 'Allows the app to check for alarms while in the background.',
    importance: 'recommended',
    icon: 'refresh-outline',
    instructions: [
      'Go to Settings > Apps > UnlockAM',
      'Enable "Background App Refresh" or "Allow background activity"',
      'This ensures alarms trigger on time'
    ]
  },
  {
    type: 'wakelock',
    title: 'Wake Lock',
    description: 'Keeps your device awake during alarm to ensure you wake up.',
    importance: 'recommended',
    icon: 'eye-outline',
    instructions: [
      'This permission is usually granted automatically',
      'If alarms don\'t keep screen on, check power management settings'
    ]
  },
  {
    type: 'vibration',
    title: 'Vibration',
    description: 'Provides haptic feedback and vibration during alarms.',
    importance: 'optional',
    icon: 'pulse-outline',
    instructions: [
      'This permission is usually granted automatically',
      'Vibration helps wake you up and provides feedback'
    ]
  }
];

export class PermissionChecker {
  private static instance: PermissionChecker;

  static getInstance(): PermissionChecker {
    if (!PermissionChecker.instance) {
      PermissionChecker.instance = new PermissionChecker();
    }
    return PermissionChecker.instance;
  }

  async checkAllPermissions(): Promise<PermissionStatus> {
    const notifications = await this.checkNotificationPermission();
    const backgroundFetch = await this.checkBackgroundFetchPermission();
    const systemAlertWindow = await this.checkSystemAlertWindowPermission();
    const batteryOptimization = await this.checkBatteryOptimizationPermission();
    const wakelock = await this.checkWakelockPermission();
    const vibration = await this.checkVibrationPermission();

    return {
      notifications,
      backgroundFetch,
      systemAlertWindow,
      batteryOptimization,
      wakelock,
      vibration
    };
  }

  async checkNotificationPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  async checkBackgroundFetchPermission(): Promise<boolean> {
    // For React Native/Expo, background fetch is generally available
    // The main concern is notifications permission
    return await this.checkNotificationPermission();
  }

  async checkSystemAlertWindowPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need this permission
    }
    
    // For React Native/Expo, we use intelligent heuristics to detect this permission
    try {
      // Check if user has completed the setup process
      const setupCompleted = await AsyncStorage.getItem('systemAlertWindowSetupCompleted');
      const setupTime = await AsyncStorage.getItem('systemAlertWindowSetupTime');
      
      if (setupCompleted === 'true' && setupTime) {
        const daysSinceSetup = (Date.now() - parseInt(setupTime)) / (1000 * 60 * 60 * 24);
        // If setup was completed recently and user has used alarms successfully, assume granted
        if (daysSinceSetup < 30) { // Within last 30 days
          const alarmSuccessCount = await AsyncStorage.getItem('alarmSuccessCount') || '0';
          if (parseInt(alarmSuccessCount) >= 2) {
            return true; // Successful alarms indicate permission is working
          }
        }
      }
      
      // On first app launch, assume permission is not granted
      const hasLaunchedBefore = await AsyncStorage.getItem('appHasLaunchedBefore');
      if (!hasLaunchedBefore) {
        await AsyncStorage.setItem('appHasLaunchedBefore', 'true');
        await AsyncStorage.setItem('firstLaunchTime', Date.now().toString());
        return false;
      }
      
      // For established users (more than 2 days), give benefit of doubt if they have alarm successes
      const firstLaunchTime = await AsyncStorage.getItem('firstLaunchTime');
      if (firstLaunchTime) {
        const daysSinceFirstLaunch = (Date.now() - parseInt(firstLaunchTime)) / (1000 * 60 * 60 * 24);
        const alarmSuccessCount = await AsyncStorage.getItem('alarmSuccessCount') || '0';
        
        if (daysSinceFirstLaunch > 2 && parseInt(alarmSuccessCount) >= 3) {
          return true; // Long-term user with successful alarms
        }
      }
      
      return false; // Default to false to encourage proper setup
      
    } catch (error) {
      console.error('Error checking system alert window permission:', error);
      return false;
    }
  }

  async checkBatteryOptimizationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS handles this differently
    }
    
    // For React Native/Expo, we use intelligent heuristics to detect battery optimization status
    try {
      // Check if user has completed the setup process
      const setupCompleted = await AsyncStorage.getItem('batteryOptimizationSetupCompleted');
      const setupTime = await AsyncStorage.getItem('batteryOptimizationSetupTime');
      
      if (setupCompleted === 'true' && setupTime) {
        const daysSinceSetup = (Date.now() - parseInt(setupTime)) / (1000 * 60 * 60 * 24);
        // If setup was completed recently and user has used alarms successfully, assume granted
        if (daysSinceSetup < 30) { // Within last 30 days
          const alarmSuccessCount = await AsyncStorage.getItem('alarmSuccessCount') || '0';
          if (parseInt(alarmSuccessCount) >= 2) {
            return true; // Successful alarms indicate battery optimization is disabled
          }
        }
      }
      
      // Check if user has created and used alarms successfully
      const alarmSuccessCount = await AsyncStorage.getItem('alarmSuccessCount') || '0';
      const successfulAlarms = parseInt(alarmSuccessCount);
      
      // If user has successfully used alarms multiple times, battery optimization is likely disabled
      if (successfulAlarms >= 5) {
        return true; // Strong evidence that battery optimization is disabled
      }
      
      // For new users, check time since first launch combined with alarm success
      const firstLaunchTime = await AsyncStorage.getItem('firstLaunchTime');
      if (firstLaunchTime) {
        const daysSinceFirstLaunch = (Date.now() - parseInt(firstLaunchTime)) / (1000 * 60 * 60 * 24);
        // If user has been using the app for more than 3 days with some alarm success
        if (daysSinceFirstLaunch > 3 && successfulAlarms >= 2) {
          return true;
        }
      }
      
      const hasLaunchedBefore = await AsyncStorage.getItem('appHasLaunchedBefore');
      if (!hasLaunchedBefore) {
        return false; // First launch, assume battery optimization is enabled
      }
      
      return false; // Default to false to encourage proper setup
    } catch (error) {
      console.error('Error checking battery optimization permission:', error);
      return false;
    }
  }

  async checkWakelockPermission(): Promise<boolean> {
    // Wake lock is generally available in React Native/Expo
    return true;
  }

  async checkVibrationPermission(): Promise<boolean> {
    // Vibration is usually available by default
    return true;
  }

  async getCriticalMissingPermissions(): Promise<PermissionRequest[]> {
    const status = await this.checkAllPermissions();
    return PERMISSION_REQUESTS.filter(request => 
      request.importance === 'critical' && !status[request.type]
    );
  }

  async getRecommendedMissingPermissions(): Promise<PermissionRequest[]> {
    const status = await this.checkAllPermissions();
    return PERMISSION_REQUESTS.filter(request => 
      request.importance === 'recommended' && !status[request.type]
    );
  }

  async getAllMissingPermissions(): Promise<PermissionRequest[]> {
    const status = await this.checkAllPermissions();
    return PERMISSION_REQUESTS.filter(request => !status[request.type]);
  }

  async isReadyForAlarms(): Promise<boolean> {
    const critical = await this.getCriticalMissingPermissions();
    return critical.length === 0;
  }

  // Auto-track alarm success for better permission inference
  async trackAlarmSuccess(): Promise<void> {
    try {
      const currentCount = await AsyncStorage.getItem('alarmSuccessCount') || '0';
      const newCount = parseInt(currentCount) + 1;
      await AsyncStorage.setItem('alarmSuccessCount', newCount.toString());
      console.log(`Alarm success count updated: ${newCount}`);
    } catch (error) {
      console.error('Error tracking alarm success:', error);
    }
  }

  // Auto-mark permission as granted after user completes setup flow
  async markPermissionSetupCompleted(permissionType: keyof PermissionStatus): Promise<void> {
    try {
      // For system permissions, track setup completion which helps with inference
      if (permissionType === 'systemAlertWindow' || permissionType === 'batteryOptimization') {
        await AsyncStorage.setItem(`${permissionType}SetupCompleted`, 'true');
        await AsyncStorage.setItem(`${permissionType}SetupTime`, Date.now().toString());
        console.log(`Permission setup completed for ${permissionType}`);
      }
    } catch (error) {
      console.error('Error marking permission setup completed:', error);
    }
  }

  // Reset all tracking data (for fresh start)
  async resetAllPermissionStates(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'appHasLaunchedBefore',
        'firstLaunchTime',
        'alarmSuccessCount',
        'systemAlertWindowSetupCompleted',
        'systemAlertWindowSetupTime',
        'batteryOptimizationSetupCompleted',
        'batteryOptimizationSetupTime',
        'permissionOnboardingShown'
      ]);
      console.log('Reset all permission tracking data');
    } catch (error) {
      console.error('Error resetting permission tracking data:', error);
    }
  }

  // Smart refresh that recalculates based on current app state
  async refreshPermissions(): Promise<PermissionStatus> {
    console.log('Starting smart permission refresh...');
    
    // Get fresh status for all permissions using current logic
    const status = await this.checkAllPermissions();
    console.log('Fresh permission status after smart refresh:', status);
    return status;
  }

  // Check if we should show permission onboarding
  async shouldShowPermissionOnboarding(): Promise<boolean> {
    try {
      const hasShown = await AsyncStorage.getItem('permissionOnboardingShown');
      const isReady = await this.isReadyForAlarms();
      return hasShown !== 'true' || !isReady;
    } catch {
      return true;
    }
  }

  async markPermissionOnboardingShown(): Promise<void> {
    try {
      await AsyncStorage.setItem('permissionOnboardingShown', 'true');
    } catch (error) {
      console.error('Error marking permission onboarding shown:', error);
    }
  }

  // Get device-specific instructions
  getDeviceSpecificInstructions(request: PermissionRequest): string[] {
    if (!request.deviceSpecificInstructions) {
      return request.instructions || [];
    }

    // Try to detect device manufacturer
    // This is a simple approach - in a real app you might use react-native-device-info
    const userAgent = Platform.constants?.reactNativeVersion?.toString() || '';
    const constants = Platform.constants as any;
    
    if (userAgent.toLowerCase().includes('samsung') || constants?.Model?.toLowerCase().includes('samsung')) {
      return request.deviceSpecificInstructions.samsung || request.instructions || [];
    }
    
    if (userAgent.toLowerCase().includes('xiaomi') || constants?.Model?.toLowerCase().includes('xiaomi')) {
      return request.deviceSpecificInstructions.xiaomi || request.instructions || [];
    }
    
    if (userAgent.toLowerCase().includes('oneplus') || constants?.Model?.toLowerCase().includes('oneplus')) {
      return request.deviceSpecificInstructions.oneplus || request.instructions || [];
    }
    
    if (userAgent.toLowerCase().includes('huawei') || constants?.Model?.toLowerCase().includes('huawei')) {
      return request.deviceSpecificInstructions.huawei || request.instructions || [];
    }

    return request.instructions || [];
  }
}
