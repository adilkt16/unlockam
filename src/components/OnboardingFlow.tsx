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
import AsyncStorage from '@react-native-async-storage/async-storage';
import AndroidPermissions from '../utils/AndroidPermissions';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<'dooa' | 'complete'>('dooa');
  const [showDooaCard, setShowDooaCard] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      console.log('🔍 OnboardingFlow: ========== CHECKING ONBOARDING STATUS ==========');
      
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      console.log('🔍 OnboardingFlow: onboardingComplete =', onboardingComplete);
      
      if (onboardingComplete === 'true') {
        console.log('🔍 OnboardingFlow: Onboarding already complete, calling onComplete()');
        setCurrentStep('complete');
        onComplete();
        return;
      }

      console.log('🔍 OnboardingFlow: Starting onboarding - showing DOOA permission...');
      
      // Check if DOOA permission is already handled
      const dooaHandled = await AsyncStorage.getItem('dooaPermissionHandled');
      console.log('🔍 OnboardingFlow: dooaPermissionHandled =', dooaHandled);
      
      if (dooaHandled === 'true') {
        console.log('🔍 OnboardingFlow: DOOA permission handled, completing onboarding');
        await completeOnboarding();
      } else {
        console.log('🔍 OnboardingFlow: Showing DOOA permission step');
        setCurrentStep('dooa');
        setShowDooaCard(true);
      }
      
    } catch (error) {
      console.log('ℹ️ OnboardingFlow: Error checking status, starting fresh with DOOA permission');
      setCurrentStep('dooa');
      setShowDooaCard(true);
    }
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

  // Show DOOA card 
  if (currentStep === 'dooa') {
    return <DooaPermissionCard />;
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
