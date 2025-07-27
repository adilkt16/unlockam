import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PermissionRequest, PermissionChecker } from '../services/PermissionChecker';
import { PermissionRequester } from '../services/PermissionRequester';

interface PermissionModalProps {
  visible: boolean;
  permission: PermissionRequest | null;
  onClose: () => void;
  onPermissionGranted?: (permissionType: string) => void;
}

export default function PermissionModal({ 
  visible, 
  permission, 
  onClose, 
  onPermissionGranted 
}: PermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const permissionChecker = PermissionChecker.getInstance();
  const permissionRequester = PermissionRequester.getInstance();

  if (!permission) return null;

  const isCritical = permission.importance === 'critical';
  const instructions = permissionChecker.getDeviceSpecificInstructions(permission);

  const handleGrantPermission = async () => {
    try {
      setIsLoading(true);
      
      if (permission.type === 'notifications') {
        const result = await permissionRequester.requestNotificationPermission();
        
        if (result.granted) {
          onPermissionGranted?.(permission.type);
          Alert.alert('Success!', 'Notification permission granted successfully.', [
            { text: 'OK', onPress: onClose }
          ]);
        } else if (result.needsManualSetup) {
          showManualSetupFlow();
        } else {
          await permissionRequester.handlePermissionDenial(permission.type);
        }
      } else {
        showManualSetupFlow();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request permission. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showManualSetupFlow = () => {
    Alert.alert(
      `Setup ${permission.title}`,
      'We need to set this up manually in your device settings. Follow the steps we\'ll show you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            onClose();
            showInstructionsModal();
          }
        }
      ]
    );
  };

  const showInstructionsModal = () => {
    Alert.alert(
      `${permission.title} Setup`,
      `Please follow these steps:\n\n${instructions.map((step, index) => `${index + 1}. ${step}`).join('\n\n')}`,
      [
        {
          text: 'Open Settings',
          onPress: async () => {
            await permissionRequester.openRelevantSettings(permission.type);
            showVerificationFlow();
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showVerificationFlow = () => {
    Alert.alert(
      'Complete Setup',
      `Please complete the ${permission.title.toLowerCase()} setup in Settings and return to this app.`,
      [
        {
          text: 'I\'m Done',
          onPress: async () => {
            const isGranted = await permissionRequester.verifyPermissionAfterSettings(permission.type);
            if (isGranted) {
              onPermissionGranted?.(permission.type);
              Alert.alert('Success!', `${permission.title} has been enabled successfully.`);
            } else {
              Alert.alert(
                'Not Detected',
                'We couldn\'t detect that the permission was granted. Please check your settings and try again.',
                [
                  { text: 'Try Again', onPress: showInstructionsModal },
                  { text: 'OK' }
                ]
              );
            }
          }
        },
        {
          text: 'Open Settings Again',
          onPress: () => {
            permissionRequester.openRelevantSettings(permission.type);
            setTimeout(showVerificationFlow, 1000);
          }
        }
      ]
    );
  };

  const handleClose = () => {
    if (isCritical) {
      Alert.alert(
        'Critical Permission',
        'This permission is required for alarms to work properly. Are you sure you want to skip it?',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Skip', onPress: onClose, style: 'destructive' }
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Permission Info */}
          <View style={[styles.permissionCard, isCritical && styles.criticalCard]}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, isCritical && styles.criticalIconBackground]}>
                <Ionicons 
                  name={permission.icon as any} 
                  size={32} 
                  color={isCritical ? "#ef4444" : "#3b82f6"} 
                />
              </View>
            </View>

            <Text style={styles.permissionTitle}>{permission.title}</Text>
            
            <View style={styles.importanceContainer}>
              <Text style={[
                styles.importanceText,
                isCritical && styles.criticalImportanceText
              ]}>
                {permission.importance === 'critical' ? 'Required' : 
                 permission.importance === 'recommended' ? 'Recommended' : 'Optional'}
              </Text>
            </View>

            <Text style={styles.permissionDescription}>
              {permission.description}
            </Text>

            {isCritical && (
              <View style={styles.warningSection}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Without this permission, your alarms may not work reliably.
                </Text>
              </View>
            )}
          </View>

          {/* Instructions Preview */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>What we'll set up:</Text>
            {instructions.slice(0, 3).map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
            {instructions.length > 3 && (
              <Text style={styles.moreStepsText}>
                +{instructions.length - 3} more step{instructions.length - 3 > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>Why this helps:</Text>
            {permission.type === 'notifications' && (
              <View style={styles.benefitItem}>
                <Ionicons name="alarm-outline" size={16} color="#22c55e" />
                <Text style={styles.benefitText}>Reliable alarm notifications</Text>
              </View>
            )}
            {permission.type === 'systemAlertWindow' && (
              <View style={styles.benefitItem}>
                <Ionicons name="phone-portrait-outline" size={16} color="#22c55e" />
                <Text style={styles.benefitText}>Alarms show on lock screen</Text>
              </View>
            )}
            {permission.type === 'batteryOptimization' && (
              <View style={styles.benefitItem}>
                <Ionicons name="battery-charging-outline" size={16} color="#22c55e" />
                <Text style={styles.benefitText}>Prevents system from killing app</Text>
              </View>
            )}
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
              <Text style={styles.benefitText}>Better overall reliability</Text>
            </View>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, isCritical && styles.criticalButton]}
            onPress={handleGrantPermission}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {permission.type === 'notifications' ? 'Grant Permission' : 'Setup Now'}
            </Text>
          </TouchableOpacity>

          {!isCritical && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  criticalCard: {
    borderColor: '#ef4444',
    backgroundColor: '#1e1b1b',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalIconBackground: {
    backgroundColor: '#7f1d1d',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 8,
  },
  importanceContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#1e40af',
    marginBottom: 16,
  },
  importanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  criticalImportanceText: {
    backgroundColor: '#7f1d1d',
  },
  permissionDescription: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451a03',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#fed7aa',
    marginLeft: 8,
    flex: 1,
  },
  instructionsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  instructionText: {
    fontSize: 14,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 20,
  },
  moreStepsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  benefitsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginLeft: 8,
  },
  actionsContainer: {
    padding: 24,
    paddingTop: 16,
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
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
  },
});
