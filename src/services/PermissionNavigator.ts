import { Platform, Linking, Alert } from 'react-native';

export interface DeepLinkResult {
  success: boolean;
  fallbackUsed: boolean;
  error?: string;
}

export class PermissionNavigator {
  private static instance: PermissionNavigator;

  static getInstance(): PermissionNavigator {
    if (!PermissionNavigator.instance) {
      PermissionNavigator.instance = new PermissionNavigator();
    }
    return PermissionNavigator.instance;
  }

  /**
   * Open notification settings with device-specific deep links
   */
  async openNotificationSettings(): Promise<DeepLinkResult> {
    if (Platform.OS === 'ios') {
      return this.openIOSNotificationSettings();
    } else {
      return this.openAndroidNotificationSettings();
    }
  }

  /**
   * Open battery optimization settings (Android only)
   */
  async openBatteryOptimizationSettings(): Promise<DeepLinkResult> {
    if (Platform.OS !== 'android') {
      return { success: true, fallbackUsed: false };
    }

    const intents = [
      // Standard battery optimization
      'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
      // Alternative for some devices
      'android.settings.BATTERY_OPTIMIZATION_SETTINGS',
      // Device care (Samsung)
      'android.settings.DEVICE_CARE_SETTINGS',
    ];

    for (const intent of intents) {
      try {
        await Linking.sendIntent(intent);
        return { success: true, fallbackUsed: false };
      } catch (error) {
        console.warn(`Failed to open ${intent}:`, error);
      }
    }

    // Fallback to general settings
    return this.openAppSettings();
  }

  /**
   * Open system alert window / overlay settings (Android only)
   */
  async openSystemAlertWindowSettings(): Promise<DeepLinkResult> {
    if (Platform.OS !== 'android') {
      return { success: true, fallbackUsed: false };
    }

    const packageName = 'com.unlockam.mobile.devbuild';
    
    const intents = [
      // Direct overlay permission
      {
        action: 'android.settings.action.MANAGE_OVERLAY_PERMISSION',
        data: `package:${packageName}`,
      },
      // Alternative
      {
        action: 'android.settings.APPLICATION_SETTINGS',
        data: `package:${packageName}`,
      },
    ];

    for (const intent of intents) {
      try {
        await Linking.sendIntent(intent.action, [
          { key: 'package', value: packageName }
        ]);
        return { success: true, fallbackUsed: false };
      } catch (error) {
        console.warn(`Failed to open overlay settings:`, error);
      }
    }

    // Fallback to app settings
    return this.openAppSettings();
  }

  /**
   * Open app-specific settings
   */
  async openAppSettings(): Promise<DeepLinkResult> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
      return { success: true, fallbackUsed: true };
    } catch (error) {
      console.error('Failed to open app settings:', error);
      return { 
        success: false, 
        fallbackUsed: true, 
        error: 'Could not open settings' 
      };
    }
  }

  /**
   * Open auto-start settings (mainly for Chinese OEMs)
   */
  async openAutoStartSettings(): Promise<DeepLinkResult> {
    if (Platform.OS !== 'android') {
      return { success: true, fallbackUsed: false };
    }

    const packageName = 'com.unlockam.mobile.devbuild';
    
    // Device-specific auto-start intents
    const intents = [
      // Xiaomi
      'miui.intent.action.OP_AUTO_START',
      // Huawei
      'huawei.intent.action.HSM_BOOTUP_MANAGER',
      // Oppo/OnePlus
      'oppo.intent.action.AUTO_START_MANAGER',
      // Vivo
      'vivo.intent.action.AUTO_START_MANAGER',
    ];

    for (const intent of intents) {
      try {
        await Linking.sendIntent(intent, [
          { key: 'package', value: packageName }
        ]);
        return { success: true, fallbackUsed: false };
      } catch (error) {
        console.warn(`Failed to open auto-start with ${intent}:`, error);
      }
    }

    // Fallback to app settings
    return this.openAppSettings();
  }

  /**
   * Open device-specific power management settings
   */
  async openPowerManagementSettings(): Promise<DeepLinkResult> {
    if (Platform.OS !== 'android') {
      return { success: true, fallbackUsed: false };
    }

    const intents = [
      // General power management
      'android.settings.BATTERY_OPTIMIZATION_SETTINGS',
      // Device care (Samsung)
      'android.settings.DEVICE_CARE_SETTINGS',
      // Power management (Xiaomi)
      'miui.intent.action.POWER_HIDE_MODE_SETTING',
      // Battery settings
      'android.intent.action.POWER_USAGE_SUMMARY',
    ];

    for (const intent of intents) {
      try {
        await Linking.sendIntent(intent);
        return { success: true, fallbackUsed: false };
      } catch (error) {
        console.warn(`Failed to open power management:`, error);
      }
    }

    return this.openAppSettings();
  }

  /**
   * iOS-specific notification settings
   */
  private async openIOSNotificationSettings(): Promise<DeepLinkResult> {
    const urls = [
      'app-settings:', // Direct to app settings
      'prefs:root=NOTIFICATIONS_ID', // General notifications (may not work)
    ];

    for (const url of urls) {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return { success: true, fallbackUsed: false };
        }
      } catch (error) {
        console.warn(`Failed to open iOS URL ${url}:`, error);
      }
    }

    // Fallback to general settings
    try {
      await Linking.openSettings();
      return { success: true, fallbackUsed: true };
    } catch (error) {
      return { 
        success: false, 
        fallbackUsed: true, 
        error: 'Could not open settings' 
      };
    }
  }

  /**
   * Android-specific notification settings
   */
  private async openAndroidNotificationSettings(): Promise<DeepLinkResult> {
    const packageName = 'com.unlockam.mobile.devbuild';
    
    const intents = [
      // Direct to app notification settings
      {
        action: 'android.settings.APP_NOTIFICATION_SETTINGS',
        extras: [
          { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
          { key: 'app_package', value: packageName },
          { key: 'app_uid', value: '10000' } // May need actual UID
        ]
      },
      // Alternative approach
      {
        action: 'android.settings.APPLICATION_DETAILS_SETTINGS',
        data: `package:${packageName}`
      },
      // Channel settings (Android 8+)
      {
        action: 'android.settings.CHANNEL_NOTIFICATION_SETTINGS',
        extras: [
          { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
          { key: 'android.provider.extra.CHANNEL_ID', value: 'default' }
        ]
      }
    ];

    for (const intent of intents) {
      try {
        if (intent.data) {
          await Linking.openURL(`intent://${intent.action}#Intent;scheme=android-app;package=com.android.settings;end`);
        } else {
          await Linking.sendIntent(intent.action, intent.extras);
        }
        return { success: true, fallbackUsed: false };
      } catch (error) {
        console.warn(`Failed to open Android notification settings:`, error);
      }
    }

    // Fallback to app settings
    return this.openAppSettings();
  }

  /**
   * Show manual instructions when deep links fail
   */
  showManualInstructions(settingType: string, deviceType?: string): void {
    const instructions = this.getManualInstructions(settingType, deviceType);
    
    Alert.alert(
      'Manual Setup Required',
      `Please follow these steps to enable ${settingType}:\n\n${instructions.join('\n\n')}`,
      [
        { text: 'Try Settings Again', onPress: () => this.openAppSettings() },
        { text: 'OK' }
      ]
    );
  }

  /**
   * Get device-specific manual instructions
   */
  private getManualInstructions(settingType: string, deviceType?: string): string[] {
    const deviceInstructions: Record<string, Record<string, string[]>> = {
      samsung: {
        notifications: [
          '1. Open Settings',
          '2. Go to Apps',
          '3. Find UnlockAM',
          '4. Tap Notifications',
          '5. Enable "Allow notifications"'
        ],
        battery: [
          '1. Open Settings',
          '2. Go to Device care > Battery',
          '3. Tap "More battery settings"',
          '4. Select "Optimize battery usage"',
          '5. Find UnlockAM and turn off optimization'
        ],
        overlay: [
          '1. Open Settings',
          '2. Go to Apps',
          '3. Find UnlockAM',
          '4. Tap "Other permissions"',
          '5. Enable "Apps that can appear on top"'
        ]
      },
      xiaomi: {
        notifications: [
          '1. Open Settings',
          '2. Go to Apps > Manage apps',
          '3. Find UnlockAM',
          '4. Tap Notifications',
          '5. Enable all notification types'
        ],
        battery: [
          '1. Open Settings',
          '2. Go to Apps > Manage apps',
          '3. Find UnlockAM',
          '4. Tap "Battery saver"',
          '5. Select "No restrictions"',
          '6. Also enable "Autostart"'
        ],
        overlay: [
          '1. Open Settings',
          '2. Go to Apps > Manage apps',
          '3. Find UnlockAM',
          '4. Tap "Other permissions"',
          '5. Enable "Display pop-up windows while running in background"'
        ]
      }
    };

    const defaultInstructions: Record<string, string[]> = {
      notifications: [
        '1. Open your device Settings',
        '2. Navigate to Apps or Application Manager',
        '3. Find UnlockAM in the app list',
        '4. Tap on Notifications',
        '5. Enable "Allow notifications" or similar option'
      ],
      battery: [
        '1. Open your device Settings',
        '2. Go to Battery or Power Management',
        '3. Look for Battery Optimization or similar',
        '4. Find UnlockAM in the list',
        '5. Select "Don\'t optimize" or "No restrictions"'
      ],
      overlay: [
        '1. Open your device Settings',
        '2. Go to Apps or Application Manager',
        '3. Find UnlockAM',
        '4. Look for "Advanced" or "Special permissions"',
        '5. Enable "Display over other apps" or similar'
      ]
    };

    if (deviceType && deviceInstructions[deviceType]?.[settingType]) {
      return deviceInstructions[deviceType][settingType];
    }

    return defaultInstructions[settingType] || [
      '1. Open your device Settings',
      '2. Navigate to Apps',
      '3. Find UnlockAM',
      '4. Adjust the necessary permissions'
    ];
  }

  /**
   * Detect device manufacturer for better instructions
   */
  detectDeviceType(): string {
    // This is a simplified detection - in a real app you might use react-native-device-info
    // For now, we'll return default since Platform.constants doesn't reliably have Model/Brand
    if (Platform.OS === 'android') {
      // Could use react-native-device-info here for proper detection
      return 'default';
    }
    
    return 'default';
  }
}
