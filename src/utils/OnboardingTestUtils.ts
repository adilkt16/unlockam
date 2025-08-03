import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility class for testing notification permission flow
 * Use this in development to reset and test the onboarding sequence
 */
export class OnboardingTestUtils {
  /**
   * Reset all onboarding states to test the complete flow
   */
  static async resetOnboardingFlow(): Promise<void> {
    try {
      await AsyncStorage.removeItem('onboardingComplete');
      await AsyncStorage.removeItem('notificationPermissionHandled');
      await AsyncStorage.removeItem('dooaPermissionHandled');
      console.log('🔄 OnboardingTestUtils: Reset all onboarding states for testing');
    } catch (error) {
      console.error('❌ OnboardingTestUtils: Error resetting onboarding flow:', error);
    }
  }

  /**
   * Reset only notification permission to test notification dialog
   */
  static async resetNotificationPermission(): Promise<void> {
    try {
      await AsyncStorage.removeItem('notificationPermissionHandled');
      console.log('🔄 OnboardingTestUtils: Reset notification permission for testing');
    } catch (error) {
      console.error('❌ OnboardingTestUtils: Error resetting notification permission:', error);
    }
  }

  /**
   * Reset only DOOA permission to test DOOA dialog
   */
  static async resetDooaPermission(): Promise<void> {
    try {
      await AsyncStorage.removeItem('dooaPermissionHandled');
      console.log('🔄 OnboardingTestUtils: Reset DOOA permission for testing');
    } catch (error) {
      console.error('❌ OnboardingTestUtils: Error resetting DOOA permission:', error);
    }
  }

  /**
   * Get current onboarding status for debugging
   */
  static async getOnboardingStatus(): Promise<{
    onboardingComplete: string | null;
    notificationPermissionHandled: string | null;
    dooaPermissionHandled: string | null;
  }> {
    try {
      const [onboardingComplete, notificationPermissionHandled, dooaPermissionHandled] = await Promise.all([
        AsyncStorage.getItem('onboardingComplete'),
        AsyncStorage.getItem('notificationPermissionHandled'),
        AsyncStorage.getItem('dooaPermissionHandled'),
      ]);

      const status = {
        onboardingComplete,
        notificationPermissionHandled,
        dooaPermissionHandled,
      };

      console.log('📊 OnboardingTestUtils: Current onboarding status:', status);
      return status;
    } catch (error) {
      console.error('❌ OnboardingTestUtils: Error getting onboarding status:', error);
      return {
        onboardingComplete: null,
        notificationPermissionHandled: null,
        dooaPermissionHandled: null,
      };
    }
  }

  /**
   * Set notification permission as handled (for testing DOOA flow only)
   */
  static async setNotificationHandled(): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationPermissionHandled', 'true');
      console.log('✅ OnboardingTestUtils: Set notification permission as handled');
    } catch (error) {
      console.error('❌ OnboardingTestUtils: Error setting notification as handled:', error);
    }
  }

  /**
   * Set DOOA permission as handled (for testing notification flow only)
   */
  static async setDooaHandled(): Promise<void> {
    try {
      await AsyncStorage.setItem('dooaPermissionHandled', 'true');
      console.log('✅ OnboardingTestUtils: Set DOOA permission as handled');
    } catch (error) {
      console.error('❌ OnboardingTestUtils: Error setting DOOA as handled:', error);
    }
  }
}

// For development console access
// You can call these functions in your Metro console:
//
// Reset everything:
// OnboardingTestUtils.resetOnboardingFlow()
//
// Check status:
// OnboardingTestUtils.getOnboardingStatus()
//
// Test only notification:
// OnboardingTestUtils.resetOnboardingFlow().then(() => OnboardingTestUtils.setDooaHandled())
//
// Test only DOOA:
// OnboardingTestUtils.resetOnboardingFlow().then(() => OnboardingTestUtils.setNotificationHandled())
