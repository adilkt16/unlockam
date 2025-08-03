import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AndroidPermissions from '../utils/AndroidPermissions';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<'notification' | 'dooa' | 'complete'>('notification');
  const [showDooaCard, setShowDooaCard] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      console.log('🔍 OnboardingFlow: ========== CHECKING ONBOARDING STATUS ==========');
      
      // FOR TESTING: FORCE NOTIFICATION PERMISSION FLOW
      // This bypasses any stored values and always shows notification dialog first
      const FORCE_NOTIFICATION_DIALOG = true; // Set to false after testing
      
      if (FORCE_NOTIFICATION_DIALOG) {
        console.log('� OnboardingFlow: FORCING NOTIFICATION PERMISSION DIALOG FOR TESTING');
        console.log('� OnboardingFlow: Ignoring stored values and starting fresh');
        
        // Clear all stored values to ensure clean state
        await AsyncStorage.removeItem('onboardingComplete');
        await AsyncStorage.removeItem('notificationPermissionHandled');
        await AsyncStorage.removeItem('dooaPermissionHandled');
        
        // Wait to ensure clean state
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force start with notification permission
        console.log('🔍 OnboardingFlow: 🚨 FORCING NOTIFICATION PERMISSION REQUEST 🚨');
        setCurrentStep('notification');
        setTimeout(() => {
          handleNotificationPermissionRequest();
        }, 500);
        return;
      }
      
      // Normal flow (for when FORCE_NOTIFICATION_DIALOG is false)
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      console.log('🔍 OnboardingFlow: onboardingComplete =', onboardingComplete);
      
      if (onboardingComplete === 'true') {
        console.log('🔍 OnboardingFlow: Onboarding already complete, calling onComplete()');
        setCurrentStep('complete');
        onComplete();
        return;
      }

      console.log('🔍 OnboardingFlow: Starting onboarding sequence...');
      
      // Check notification permission first
      const notificationHandled = await AsyncStorage.getItem('notificationPermissionHandled');
      console.log('🔍 OnboardingFlow: notificationPermissionHandled =', notificationHandled);
      
      if (notificationHandled !== 'true') {
        console.log('🔍 OnboardingFlow: 🚨 STARTING WITH NOTIFICATION PERMISSION REQUEST 🚨');
        setCurrentStep('notification');
        // Small delay to ensure app is ready
        setTimeout(() => {
          handleNotificationPermissionRequest();
        }, 500);
        return;
      }
      
      // Check DOOA permission next
      const dooaHandled = await AsyncStorage.getItem('dooaPermissionHandled');
      console.log('🔍 OnboardingFlow: dooaPermissionHandled =', dooaHandled);
      
      if (dooaHandled !== 'true') {
        console.log('🔍 OnboardingFlow: Moving to DOOA permission step');
        setCurrentStep('dooa');
        setShowDooaCard(true);
        return;
      }
      
      // All permissions handled
      console.log('🔍 OnboardingFlow: All permissions handled, completing onboarding');
      await completeOnboarding();
      
    } catch (error) {
      console.log('ℹ️ OnboardingFlow: Error checking status, starting fresh with notification permission');
      console.error('Error details:', error);
      setCurrentStep('notification');
      setTimeout(() => {
        handleNotificationPermissionRequest();
      }, 500);
    }
  };

  const handleNotificationPermissionRequest = async () => {
    try {
      console.log('📱 OnboardingFlow: ========== 🚨🚨 REQUESTING ANDROID NOTIFICATION PERMISSION 🚨🚨 ==========');
      console.log('📱 OnboardingFlow: Platform:', Platform.OS);
      console.log('📱 OnboardingFlow: 🎯 THIS FUNCTION WAS CALLED - NOTIFICATION DIALOG SHOULD APPEAR NOW!');
      console.log('📱 OnboardingFlow: Android 13+ (API 33+) requires notification permission');
      
      // Skip on iOS
      if (Platform.OS !== 'android') {
        console.log('📱 OnboardingFlow: iOS detected, skipping notification permission and moving to DOOA');
        await AsyncStorage.setItem('notificationPermissionHandled', 'true');
        await moveToDooa();
        return;
      }
      
      // Get current permission status
      console.log('📱 OnboardingFlow: Checking current notification permission status...');
      const currentPermissions = await Notifications.getPermissionsAsync();
      console.log('📱 OnboardingFlow: Current permission status:', JSON.stringify(currentPermissions, null, 2));
      
      const { status: currentStatus, canAskAgain } = currentPermissions;
      
      if (currentStatus === 'granted') {
        console.log('✅ OnboardingFlow: Notification permission already granted, moving to DOOA');
        await AsyncStorage.setItem('notificationPermissionHandled', 'true');
        await moveToDooa();
        return;
      }
      
      if (currentStatus === 'denied' && !canAskAgain) {
        console.log('⚠️ OnboardingFlow: Notification permission permanently denied, moving to DOOA');
        await AsyncStorage.setItem('notificationPermissionHandled', 'true');
        await moveToDooa();
        return;
      }
      
      console.log('📱 OnboardingFlow: 🚨🚨 TRIGGERING NATIVE ANDROID NOTIFICATION PERMISSION DIALOG 🚨🚨');
      console.log('📱 OnboardingFlow: This should show the Android system dialog with options:');
      console.log('📱 OnboardingFlow: - "Allow"');
      console.log('📱 OnboardingFlow: - "Don\'t allow"');
      console.log('📱 OnboardingFlow: - "Don\'t allow and don\'t ask again" (on some Android versions)');
      
      // Request notification permission - THIS SHOWS THE NATIVE ANDROID DIALOG
      const permissionRequest = await Notifications.requestPermissionsAsync({
        android: {},
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      
      console.log('📱 OnboardingFlow: ========== NATIVE DIALOG COMPLETED ==========');
      console.log('📱 OnboardingFlow: User response:', JSON.stringify(permissionRequest, null, 2));
      
      const { status: resultStatus, canAskAgain: resultCanAskAgain } = permissionRequest;
      
      if (resultStatus === 'granted') {
        console.log('🎉 OnboardingFlow: ✅ USER GRANTED NOTIFICATION PERMISSION! ✅');
      } else if (resultStatus === 'denied') {
        console.log('❌ OnboardingFlow: User denied notification permission');
        if (!resultCanAskAgain) {
          console.log('🚫 OnboardingFlow: User selected "Don\'t ask again"');
        }
      } else {
        console.log('❓ OnboardingFlow: Unexpected permission result status:', resultStatus);
      }
      
      // Mark notification permission as handled regardless of result
      await AsyncStorage.setItem('notificationPermissionHandled', 'true');
      
      console.log('📱 OnboardingFlow: Moving to DOOA permission step...');
      
      // Move to DOOA permission step
      await moveToDooa();
      
    } catch (error) {
      console.error('💥 OnboardingFlow: CRITICAL ERROR during notification permission request!');
      console.error('💥 OnboardingFlow: Error details:', error);
      console.error('💥 OnboardingFlow: Error message:', (error as any)?.message || 'No message');
      
      // Even on error, mark as handled and move to DOOA
      await AsyncStorage.setItem('notificationPermissionHandled', 'true');
      await moveToDooa();
    }
  };

  const moveToDooa = async () => {
    console.log('📱 OnboardingFlow: 🔄 Moving to DOOA permission step...');
    setCurrentStep('dooa');
    // Small delay to ensure clean state transition
    setTimeout(() => {
      setShowDooaCard(true);
    }, 100);
  };

  const handleEnableDooa = async () => {
    try {
      if (Platform.OS === 'android') {
        const success = await AndroidPermissions.openDooaSettings();
        
        if (!success) {
          console.log('ℹ️ OnboardingFlow: DOOA settings not directly accessible');
        } else {
          console.log('✅ OnboardingFlow: DOOA settings opened successfully');
        }
      } else {
        console.log('ℹ️ OnboardingFlow: iOS detected, skipping DOOA');
      }

      // Mark DOOA as handled and complete onboarding
      await AsyncStorage.setItem('dooaPermissionHandled', 'true');
      await completeOnboarding();
      
    } catch (error) {
      console.log('ℹ️ OnboardingFlow: DOOA settings access had an issue');
      await AsyncStorage.setItem('dooaPermissionHandled', 'true');
      await completeOnboarding();
    }
  };

  const handleSkipDooa = async () => {
    console.log('📱 OnboardingFlow: User skipped DOOA permission');
    await AsyncStorage.setItem('dooaPermissionHandled', 'true');
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    setShowDooaCard(false);
    setCurrentStep('complete');
    onComplete();
  };

  const DooaPermissionCard = () => (
    <Modal
      visible={showDooaCard}
      transparent={true}
      animationType="fade"
      onRequestClose={handleSkipDooa}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipDooa}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="phone-portrait-outline" size={48} color="#3b82f6" />
            </View>

            <Text style={styles.cardTitle}>Enhanced Alarm Experience</Text>
            <Text style={styles.cardSubtitle}>
              Enable display over other apps for reliable alarm functionality
            </Text>

            <View style={styles.reasonsSection}>
              <Text style={styles.reasonsTitle}>Why is this needed?</Text>
              <View style={styles.reasonsList}>
                <View style={styles.reasonItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.reasonText}>Show full-screen alarms that cannot be ignored</Text>
                </View>
                <View style={styles.reasonItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.reasonText}>Work even when your phone is locked</Text>
                </View>
                <View style={styles.reasonItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.reasonText}>Ensure you wake up by solving puzzles</Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleEnableDooa}
              >
                <Ionicons name="settings-outline" size={20} color="white" />
                <Text style={styles.enableButtonText}>Open Settings</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
              You can change this setting later in your device settings
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Don't render anything if onboarding is complete
  if (currentStep === 'complete') {
    return null;
  }

  // Show DOOA card when we reach the dooa step
  if (currentStep === 'dooa') {
    return <DooaPermissionCard />;
  }

  // For notification step, don't render anything (native dialog handles it)
  if (currentStep === 'notification') {
    return null;
  }

  return null;
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 16,
    paddingBottom: 8,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  cardContent: {
    padding: 24,
    paddingTop: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  reasonsSection: {
    marginBottom: 24,
  },
  reasonsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  reasonsList: {
    gap: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  enableButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default OnboardingFlow;
