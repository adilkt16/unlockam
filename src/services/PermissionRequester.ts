import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionChecker, PermissionStatus } from './PermissionChecker';

export interface PermissionRequestResult {
  granted: boolean;
  canAskAgain: boolean;
  needsManualSetup: boolean;
  instructions?: string[];
}

export class PermissionRequester {
  private static instance: PermissionRequester;
  private permissionChecker = PermissionChecker.getInstance();

  static getInstance(): PermissionRequester {
    if (!PermissionRequester.instance) {
      PermissionRequester.instance = new PermissionRequester();
    }
    return PermissionRequester.instance;
  }

  async requestNotificationPermission(): Promise<PermissionRequestResult> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return {
          granted: true,
          canAskAgain: false,
          needsManualSetup: false
        };
      }

      const { status, canAskAgain } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
          allowProvisional: false,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      if (status === 'granted') {
        return {
          granted: true,
          canAskAgain: false,
          needsManualSetup: false
        };
      }

      return {
        granted: false,
        canAskAgain: canAskAgain ?? false,
        needsManualSetup: !canAskAgain,
        instructions: [
          'Open Settings on your device',
          'Navigate to Apps > UnlockAM > Notifications',
          'Enable "Allow notifications"',
          'Return to the app to continue'
        ]
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        needsManualSetup: true,
        instructions: [
          'Go to your device Settings',
          'Find UnlockAM in your app list',
          'Enable notification permissions',
          'Restart the app'
        ]
      };
    }
  }

  async requestSystemAlertWindowPermission(): Promise<PermissionRequestResult> {
    if (Platform.OS !== 'android') {
      return {
        granted: true,
        canAskAgain: false,
        needsManualSetup: false
      };
    }

    // For system alert window, we can't request programmatically
    // We need to guide the user to settings
    return {
      granted: false,
      canAskAgain: false,
      needsManualSetup: true,
      instructions: [
        'Open Settings on your device',
        'Go to Apps > UnlockAM > Advanced',
        'Enable "Display over other apps"',
        'Return to this app'
      ]
    };
  }

  async requestBatteryOptimizationPermission(): Promise<PermissionRequestResult> {
    if (Platform.OS !== 'android') {
      return {
        granted: true,
        canAskAgain: false,
        needsManualSetup: false
      };
    }

    // Battery optimization requires manual setup
    return {
      granted: false,
      canAskAgain: false,
      needsManualSetup: true,
      instructions: [
        'Open Settings on your device',
        'Go to Battery > Battery optimization',
        'Find UnlockAM in the list',
        'Select "Don\'t optimize"',
        'Return to this app'
      ]
    };
  }

  async requestAllCriticalPermissions(): Promise<{
    success: boolean;
    results: Record<string, PermissionRequestResult>;
    missingCritical: string[];
  }> {
    const results: Record<string, PermissionRequestResult> = {};
    
    // Request notifications first (this can be done programmatically)
    results.notifications = await this.requestNotificationPermission();
    
    // For other permissions, we need manual setup
    results.systemAlertWindow = await this.requestSystemAlertWindowPermission();
    results.batteryOptimization = await this.requestBatteryOptimizationPermission();

    const missingCritical = Object.entries(results)
      .filter(([_, result]) => !result.granted)
      .map(([permission, _]) => permission);

    return {
      success: missingCritical.length === 0,
      results,
      missingCritical
    };
  }

  async openAppSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening app settings:', error);
      Alert.alert(
        'Settings',
        'Please manually open your device settings and navigate to Apps > UnlockAM to adjust permissions.',
        [{ text: 'OK' }]
      );
    }
  }

  async openNotificationSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Try to open notification settings directly
        await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
          { key: 'android.provider.extra.APP_PACKAGE', value: 'com.unlockam.mobile.devbuild' }
        ]);
      } else {
        await this.openAppSettings();
      }
    } catch (error) {
      console.warn('Could not open notification settings directly, falling back to app settings');
      await this.openAppSettings();
    }
  }

  async openBatteryOptimizationSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Try to open battery optimization settings
        await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      } else {
        await this.openAppSettings();
      }
    } catch (error) {
      console.warn('Could not open battery optimization settings, falling back to app settings');
      await this.openAppSettings();
    }
  }

  async openSystemAlertWindowSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Try to open system alert window settings
        await Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION', [
          { key: 'package', value: 'com.unlockam.mobile.devbuild' }
        ]);
      } else {
        await this.openAppSettings();
      }
    } catch (error) {
      console.warn('Could not open system alert window settings, falling back to app settings');
      await this.openAppSettings();
    }
  }

  // Verify permission after user returns from settings
  async verifyPermissionAfterSettings(permissionType: keyof PermissionStatus): Promise<boolean> {
    // Wait a moment for settings to take effect
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mark that user has completed the setup process
    await this.permissionChecker.markPermissionSetupCompleted(permissionType);
    
    // For permissions we can directly check (notifications), verify them
    if (permissionType === 'notifications') {
      const status = await this.permissionChecker.checkAllPermissions();
      return status[permissionType];
    }
    
    // For system permissions, trust that the user completed setup
    // The permission checker will use heuristics to determine status over time
    return true;
  }

  // Smart deep linking based on permission type
  async openRelevantSettings(permissionType: keyof PermissionStatus): Promise<void> {
    switch (permissionType) {
      case 'notifications':
        await this.openNotificationSettings();
        break;
      case 'batteryOptimization':
        await this.openBatteryOptimizationSettings();
        break;
      case 'systemAlertWindow':
        await this.openSystemAlertWindowSettings();
        break;
      default:
        await this.openAppSettings();
        break;
    }
  }

  // Handle permission denial with user-friendly messages
  async handlePermissionDenial(permissionType: keyof PermissionStatus): Promise<void> {
    const messages = {
      notifications: {
        title: 'Notifications Required',
        message: 'UnlockAM needs notification permissions to wake you up with alarms. Without this permission, alarms will not work.',
        settingsText: 'Open Settings'
      },
      systemAlertWindow: {
        title: 'Display Permission Required',
        message: 'This permission allows alarms to show on your lock screen and over other apps, ensuring you never miss an alarm.',
        settingsText: 'Open Settings'
      },
      batteryOptimization: {
        title: 'Battery Optimization',
        message: 'To ensure alarms work reliably, please disable battery optimization for UnlockAM in your device settings.',
        settingsText: 'Open Battery Settings'
      },
      backgroundFetch: {
        title: 'Background Refresh',
        message: 'Allow UnlockAM to refresh in the background to ensure alarms trigger on time.',
        settingsText: 'Open Settings'
      },
      wakelock: {
        title: 'Wake Lock Permission',
        message: 'This allows the app to keep your device awake during alarms.',
        settingsText: 'Open Settings'
      },
      vibration: {
        title: 'Vibration Permission',
        message: 'This enables vibration feedback during alarms and interactions.',
        settingsText: 'Open Settings'
      }
    };

    const config = messages[permissionType];
    
    Alert.alert(
      config.title,
      config.message,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: config.settingsText,
          onPress: () => this.openRelevantSettings(permissionType)
        }
      ]
    );
  }
}
