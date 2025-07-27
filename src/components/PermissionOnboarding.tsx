import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PermissionChecker, PermissionRequest, PERMISSION_REQUESTS } from '../services/PermissionChecker';
import { PermissionRequester } from '../services/PermissionRequester';

interface PermissionOnboardingProps {
  onComplete: (success: boolean) => void;
  onSkip?: () => void;
  forceShow?: boolean;
}

export default function PermissionOnboarding({ onComplete, onSkip, forceShow = false }: PermissionOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [missingPermissions, setMissingPermissions] = useState<PermissionRequest[]>([]);
  const [completedPermissions, setCompletedPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [criticalPermissions, setCriticalPermissions] = useState<PermissionRequest[]>([]);

  const permissionChecker = PermissionChecker.getInstance();
  const permissionRequester = PermissionRequester.getInstance();

  useEffect(() => {
    initializePermissions();
  }, []);

  const initializePermissions = async () => {
    try {
      setIsLoading(true);
      
      if (!forceShow) {
        const shouldShow = await permissionChecker.shouldShowPermissionOnboarding();
        if (!shouldShow) {
          onComplete(true);
          return;
        }
      }

      const critical = await permissionChecker.getCriticalMissingPermissions();
      const recommended = await permissionChecker.getRecommendedMissingPermissions();
      
      setCriticalPermissions(critical);
      setMissingPermissions([...critical, ...recommended]);
      
      if (critical.length === 0 && recommended.length === 0) {
        await permissionChecker.markPermissionOnboardingShown();
        onComplete(true);
        return;
      }
    } catch (error) {
      console.error('Error initializing permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentPermission = missingPermissions[currentStep];
  const isLastStep = currentStep === missingPermissions.length - 1;
  const isCritical = currentPermission?.importance === 'critical';

  const handleRequestPermission = async () => {
    if (!currentPermission) return;

    try {
      setIsLoading(true);
      
      if (currentPermission.type === 'notifications') {
        const result = await permissionRequester.requestNotificationPermission();
        
        if (result.granted) {
          setCompletedPermissions(prev => new Set([...prev, currentPermission.type]));
          handleNext();
        } else if (result.needsManualSetup) {
          showManualSetupAlert(currentPermission);
        } else {
          await permissionRequester.handlePermissionDenial(currentPermission.type);
        }
      } else {
        // For permissions that need manual setup
        showManualSetupAlert(currentPermission);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request permission. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showManualSetupAlert = (permission: PermissionRequest) => {
    const instructions = permissionChecker.getDeviceSpecificInstructions(permission);
    
    Alert.alert(
      `${permission.title} Setup`,
      `We need to set up ${permission.title.toLowerCase()} manually. Please follow these steps:`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Open Settings',
          onPress: async () => {
            await permissionRequester.openRelevantSettings(permission.type);
            showVerificationAlert(permission);
          }
        }
      ]
    );
  };

  const showVerificationAlert = (permission: PermissionRequest) => {
    Alert.alert(
      'Settings Opened',
      `Please complete the setup in Settings and return to this app. Tap "I'm Done" when you've finished setting up ${permission.title.toLowerCase()}.`,
      [
        {
          text: 'I\'m Done',
          onPress: async () => {
            const isGranted = await permissionRequester.verifyPermissionAfterSettings(permission.type);
            if (isGranted) {
              setCompletedPermissions(prev => new Set([...prev, permission.type]));
              handleNext();
            } else {
              Alert.alert(
                'Permission Not Detected',
                'We couldn\'t detect that the permission was granted. You can continue anyway or try again.',
                [
                  { text: 'Try Again', onPress: () => showManualSetupAlert(permission) },
                  { text: 'Continue', onPress: handleNext }
                ]
              );
            }
          }
        },
        {
          text: 'Try Again',
          onPress: () => showManualSetupAlert(permission)
        }
      ]
    );
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (isCritical) {
      Alert.alert(
        'Critical Permission',
        'This permission is required for alarms to work properly. Skipping may cause alarms to fail.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Skip Anyway', onPress: handleNext, style: 'destructive' }
        ]
      );
    } else {
      handleNext();
    }
  };

  const handleComplete = async () => {
    await permissionChecker.markPermissionOnboardingShown();
    const isReady = await permissionChecker.isReadyForAlarms();
    onComplete(isReady);
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / missingPermissions.length) * 100;
  };

  if (isLoading && missingPermissions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="sync-outline" size={48} color="#3b82f6" />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentPermission) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
          </View>
          <Text style={styles.stepText}>
            Step {currentStep + 1} of {missingPermissions.length}
          </Text>
        </View>

        {/* Permission Card */}
        <View style={[styles.permissionCard, isCritical && styles.criticalCard]}>
          {/* Icon and Title */}
          <View style={styles.permissionHeader}>
            <View style={[styles.iconContainer, isCritical && styles.criticalIcon]}>
              <Ionicons 
                name={currentPermission.icon as any} 
                size={32} 
                color={isCritical ? "#ef4444" : "#3b82f6"} 
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.permissionTitle}>{currentPermission.title}</Text>
              <Text style={[styles.importanceText, isCritical && styles.criticalText]}>
                {currentPermission.importance === 'critical' ? 'Required' : 
                 currentPermission.importance === 'recommended' ? 'Recommended' : 'Optional'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.permissionDescription}>
            {currentPermission.description}
          </Text>

          {/* Why This Matters */}
          {isCritical && (
            <View style={styles.whySection}>
              <Text style={styles.whySectionTitle}>Why this matters:</Text>
              <Text style={styles.whyText}>
                Without this permission, your alarms may not work reliably. This is essential for the core functionality of UnlockAM.
              </Text>
            </View>
          )}

          {/* Instructions Preview */}
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsTitle}>What we'll set up:</Text>
            {permissionChecker.getDeviceSpecificInstructions(currentPermission).slice(0, 2).map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, isCritical && styles.criticalButton]}
            onPress={handleRequestPermission}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {currentPermission.type === 'notifications' ? 'Grant Permission' : 'Setup Now'}
            </Text>
          </TouchableOpacity>

          {!isCritical && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          )}

          {onSkip && currentStep === 0 && (
            <TouchableOpacity
              style={styles.textButton}
              onPress={onSkip}
              disabled={isLoading}
            >
              <Text style={styles.textButtonText}>Skip All Setup</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Critical Permissions Summary */}
        {criticalPermissions.length > 0 && currentStep === 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Required for Alarms:</Text>
            {criticalPermissions.map((permission, index) => (
              <View key={permission.type} style={styles.summaryItem}>
                <Ionicons name={permission.icon as any} size={16} color="#ef4444" />
                <Text style={styles.summaryText}>{permission.title}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  header: {
    paddingVertical: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  stepText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  permissionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  criticalCard: {
    borderColor: '#ef4444',
    backgroundColor: '#1e1b1b',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  criticalIcon: {
    backgroundColor: '#7f1d1d',
  },
  titleContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  importanceText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  criticalText: {
    color: '#ef4444',
  },
  permissionDescription: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
    marginBottom: 16,
  },
  whySection: {
    backgroundColor: '#451a03',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  whySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 8,
  },
  whyText: {
    fontSize: 14,
    color: '#fed7aa',
    lineHeight: 20,
  },
  instructionsSection: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#3b82f6',
    marginRight: 8,
    marginTop: 2,
  },
  instructionText: {
    fontSize: 14,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 20,
  },
  actionsContainer: {
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  criticalButton: {
    backgroundColor: '#ef4444',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
  },
  textButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  textButtonText: {
    fontSize: 14,
    color: '#64748b',
    textDecorationLine: 'underline',
  },
  summaryCard: {
    backgroundColor: '#451a03',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#fed7aa',
    marginLeft: 8,
  },
});
