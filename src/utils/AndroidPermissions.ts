import { Platform, Linking, Alert } from 'react-native';

/**
 * Android-specific utilities for handling permissions and system settings
 */
class AndroidPermissions {
  /**
   * Opens the Display Over Other Apps (DOOA) settings page for the current app
   * @returns Promise<boolean> - true if settings page was opened successfully
   */
  static async openDooaSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('DOOA settings are only available on Android');
      return false;
    }

    try {
      // Get the app's package name from app.json
      const packageName = 'com.unlockam.mobile.devbuild';
      
      // Intent to open the specific DOOA settings page for this app
      const dooaSettingsUrl = `android-settings://apps/special-access/display-over-other-apps/detail?package=${packageName}`;
      
      console.log('Attempting to open DOOA settings:', dooaSettingsUrl);
      
      const canOpen = await Linking.canOpenURL(dooaSettingsUrl);
      
      if (canOpen) {
        await Linking.openURL(dooaSettingsUrl);
        return true;
      } else {
        // Fallback: try to open general DOOA settings
        const generalDooaUrl = 'android-settings://apps/special-access/display-over-other-apps';
        const canOpenGeneral = await Linking.canOpenURL(generalDooaUrl);
        
        if (canOpenGeneral) {
          await Linking.openURL(generalDooaUrl);
          return true;
        } else {
          // Final fallback: open app settings
          return await this.openAppSettings();
        }
      }
    } catch (error) {
      console.error('Error opening DOOA settings:', error);
      // Fallback to app settings
      return await this.openAppSettings();
    }
  }

  /**
   * Opens the general app settings page
   * @returns Promise<boolean> - true if settings page was opened successfully
   */
  static async openAppSettings(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const url = 'app-settings:';
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
          return true;
        }
      }
      
      // iOS fallback or Android fallback
      await Linking.openSettings();
      return true;
    } catch (error) {
      console.error('Error opening app settings:', error);
      return false;
    }
  }

  /**
   * Opens the notification settings for the app
   * @returns Promise<boolean> - true if settings page was opened successfully
   */
  static async openNotificationSettings(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Try to open app-specific notification settings
        const packageName = 'com.unlockam.mobile.devbuild';
        const notificationUrl = `android-settings://app/notification-settings?package=${packageName}`;
        
        const canOpen = await Linking.canOpenURL(notificationUrl);
        
        if (canOpen) {
          await Linking.openURL(notificationUrl);
          return true;
        }
      }
      
      // Fallback to general settings
      return await this.openAppSettings();
    } catch (error) {
      console.error('Error opening notification settings:', error);
      return await this.openAppSettings();
    }
  }

  /**
   * Shows an informative alert about DOOA permission with option to open settings
   * Note: This is optional and should only be used when user explicitly requests info
   */
  static showDooaPermissionInfo(): void {
    Alert.alert(
      'Display Over Other Apps',
      'This permission allows UnlockAM to show full-screen alarms that work even when your phone is locked. This ensures you wake up by solving puzzles.\n\nWould you like to enable this permission?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => this.openDooaSettings(),
        },
      ]
    );
  }

  /**
   * Check if we can potentially open DOOA settings
   * @returns Promise<boolean> - true if the URL scheme is supported
   */
  static async canOpenDooaSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const packageName = 'com.unlockam.mobile.devbuild';
      const dooaSettingsUrl = `android-settings://apps/special-access/display-over-other-apps/detail?package=${packageName}`;
      return await Linking.canOpenURL(dooaSettingsUrl);
    } catch (error) {
      console.error('Error checking DOOA settings availability:', error);
      return false;
    }
  }
}

export default AndroidPermissions;
