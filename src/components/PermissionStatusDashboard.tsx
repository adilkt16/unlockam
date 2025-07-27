import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PermissionChecker, PermissionStatus, PERMISSION_REQUESTS } from '../services/PermissionChecker';
import { PermissionRequester } from '../services/PermissionRequester';

interface PermissionStatusDashboardProps {
  onPermissionChange?: (isReady: boolean) => void;
}

export default function PermissionStatusDashboard({ onPermissionChange }: PermissionStatusDashboardProps) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const permissionChecker = PermissionChecker.getInstance();
  const permissionRequester = PermissionRequester.getInstance();

  useEffect(() => {
    checkPermissions();
    
    // Listen for app state changes to refresh permissions when returning from settings
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App became active, refresh permissions
        checkPermissions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const checkPermissions = async () => {
    try {
      setIsLoading(true);
      // Use refreshPermissions to ensure we get fresh data
      const status = await permissionChecker.refreshPermissions();
      setPermissionStatus(status);
      
      const isReady = await permissionChecker.isReadyForAlarms();
      onPermissionChange?.(isReady);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    console.log('Manual refresh triggered - checking current permission states...');
    await checkPermissions();
  };

  const handleRefreshLongPress = async () => {
    Alert.alert(
      'Reset App Data',
      'This will reset all app tracking data and start fresh. Use this if you want to reset the permission detection system.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsRefreshing(true);
            await permissionChecker.resetAllPermissionStates();
            checkPermissions();
            Alert.alert('Reset Complete', 'App data has been reset. Permission detection will start fresh.');
          }
        }
      ]
    );
  };

  const handlePermissionTap = async (permissionType: keyof PermissionStatus) => {
    const permission = PERMISSION_REQUESTS.find(p => p.type === permissionType);
    if (!permission) return;

    const isGranted = permissionStatus?.[permissionType];
    
    if (isGranted) {
      // Permission is already granted
      Alert.alert(
        `${permission.title} Enabled`,
        'This permission is already granted and working properly.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Permission needs to be granted
    Alert.alert(
      `Setup ${permission.title}`,
      permission.description,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Setup',
          onPress: async () => {
            if (permissionType === 'notifications') {
              const result = await permissionRequester.requestNotificationPermission();
              if (result.granted) {
                checkPermissions();
              } else if (result.needsManualSetup) {
                showManualSetupAlert(permission);
              }
            } else {
              showManualSetupAlert(permission);
            }
          }
        }
      ]
    );
  };

  const showManualSetupAlert = (permission: any) => {
    const instructions = permissionChecker.getDeviceSpecificInstructions(permission);
    
    Alert.alert(
      `Setup ${permission.title}`,
      'Please follow these steps in your device settings:',
      [
        { text: 'Cancel', style: 'cancel' },
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

  const showVerificationAlert = (permission: any) => {
    Alert.alert(
      'Return to App',
      'Please complete the setup in Settings and return to this app. Tap "Check Again" to verify the permission was granted.',
      [
        {
          text: 'Check Again',
          onPress: async () => {
            const isGranted = await permissionRequester.verifyPermissionAfterSettings(permission.type);
            if (isGranted) {
              checkPermissions();
              Alert.alert('Success!', `${permission.title} has been enabled.`);
            } else {
              Alert.alert(
                'Not Detected',
                'Permission not detected. Please ensure you completed all steps in Settings.',
                [
                  { text: 'Try Again', onPress: () => showManualSetupAlert(permission) },
                  { text: 'OK' }
                ]
              );
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (isGranted: boolean, importance: string) => {
    if (isGranted) return '#22c55e';
    if (importance === 'critical') return '#ef4444';
    if (importance === 'recommended') return '#f59e0b';
    return '#64748b';
  };

  const getStatusIcon = (isGranted: boolean) => {
    return isGranted ? 'checkmark-circle' : 'alert-circle';
  };

  const criticalCount = PERMISSION_REQUESTS.filter(p => 
    p.importance === 'critical' && !permissionStatus?.[p.type]
  ).length;

  const recommendedCount = PERMISSION_REQUESTS.filter(p => 
    p.importance === 'recommended' && !permissionStatus?.[p.type]
  ).length;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="sync-outline" size={24} color="#3b82f6" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#3b82f6"
        />
      }
    >
      {/* Status Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons 
            name={criticalCount === 0 ? "shield-checkmark" : "shield-outline"} 
            size={24} 
            color={criticalCount === 0 ? "#22c55e" : "#ef4444"} 
          />
          <Text style={styles.summaryTitle}>Permission Status</Text>
        </View>
        
        {criticalCount === 0 ? (
          <Text style={styles.summaryTextSuccess}>
            ✅ All critical permissions granted. Alarms will work reliably.
          </Text>
        ) : (
          <Text style={styles.summaryTextError}>
            ⚠️ {criticalCount} critical permission{criticalCount > 1 ? 's' : ''} missing. 
            Alarms may not work properly.
          </Text>
        )}
        
        {recommendedCount > 0 && (
          <Text style={styles.summaryTextWarning}>
            {recommendedCount} recommended permission{recommendedCount > 1 ? 's' : ''} could improve alarm reliability.
          </Text>
        )}
      </View>

      {/* Permission List */}
      <View style={styles.permissionsList}>
        <Text style={styles.sectionTitle}>App Permissions</Text>
        <Text style={styles.permissionHelpText}>
          Tap to setup • Long press to manually override status
        </Text>
        
        {PERMISSION_REQUESTS.map((permission) => {
          const isGranted = permissionStatus?.[permission.type] ?? false;
          const statusColor = getStatusColor(isGranted, permission.importance);
          const statusIcon = getStatusIcon(isGranted);
          
          return (
            <TouchableOpacity
              key={permission.type}
              style={[
                styles.permissionItem,
                permission.importance === 'critical' && !isGranted && styles.criticalItem
              ]}
              onPress={() => handlePermissionTap(permission.type)}
              activeOpacity={0.7}
            >
              <View style={styles.permissionIcon}>
                <Ionicons name={permission.icon as any} size={24} color="#64748b" />
              </View>
              
              <View style={styles.permissionContent}>
                <View style={styles.permissionHeader}>
                  <Text style={styles.permissionTitle}>{permission.title}</Text>
                  <View style={styles.statusContainer}>
                    <Ionicons name={statusIcon} size={20} color={statusColor} />
                  </View>
                </View>
                
                <Text style={styles.permissionDescription}>
                  {permission.description}
                </Text>
                
                <View style={styles.permissionMeta}>
                  <Text style={[
                    styles.importanceLabel,
                    { color: getStatusColor(true, permission.importance) }
                  ]}>
                    {permission.importance.toUpperCase()}
                  </Text>
                  <Text style={styles.statusText}>
                    {isGranted ? 'Granted' : 'Not granted'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Actions */}
      {(criticalCount > 0 || recommendedCount > 0) && (
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>
          
          {criticalCount > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Navigate to permission onboarding with force show
                // This would be handled by the parent component
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>
                Fix Critical Permissions ({criticalCount})
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleRefresh}
            onLongPress={handleRefreshLongPress}
            delayLongPress={1000}
          >
            <Ionicons name="refresh-outline" size={20} color="#3b82f6" />
            <Text style={styles.secondaryActionButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Help Section */}
      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          If you're having trouble with permissions, try restarting the app or 
          checking your device's notification and battery settings.
        </Text>
        
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => {
            Alert.alert(
              'Permission Help',
              'Common solutions:\n\n• Restart the app after changing permissions\n• Check battery optimization settings\n• Ensure notifications are enabled in system settings\n• Try turning permissions off and on again',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={styles.helpButtonText}>View Troubleshooting Tips</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginLeft: 8,
  },
  summaryTextSuccess: {
    fontSize: 14,
    color: '#22c55e',
    lineHeight: 20,
  },
  summaryTextError: {
    fontSize: 14,
    color: '#ef4444',
    lineHeight: 20,
    marginBottom: 8,
  },
  summaryTextWarning: {
    fontSize: 14,
    color: '#f59e0b',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  permissionHelpText: {
    fontSize: 12,
    color: '#94a3b8',
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  helpText: {
    fontSize: 12,
    color: '#94a3b8',
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  permissionsList: {
    paddingBottom: 16,
  },
  permissionItem: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#334155',
  },
  criticalItem: {
    borderColor: '#ef4444',
    backgroundColor: '#1e1b1b',
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
  },
  statusContainer: {
    marginLeft: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 8,
  },
  permissionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  importanceLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
  },
  actionsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  secondaryActionButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
  helpCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  detailHelpText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  helpButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
});
