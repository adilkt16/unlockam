import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PermissionChecker } from '../services/PermissionChecker';
import { PermissionRequester } from '../services/PermissionRequester';
import { PermissionNavigator } from '../services/PermissionNavigator';

interface TroubleshootingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  severity: 'high' | 'medium' | 'low';
  solutions: Solution[];
}

interface Solution {
  title: string;
  description: string;
  action?: () => Promise<void>;
  actionText?: string;
}

export default function TroubleshootingScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const permissionChecker = PermissionChecker.getInstance();
  const permissionRequester = PermissionRequester.getInstance();
  const permissionNavigator = PermissionNavigator.getInstance();

  const troubleshootingItems: TroubleshootingItem[] = [
    {
      id: 'notifications-not-working',
      title: 'Alarms Not Triggering',
      description: 'Your alarms are not going off when they should.',
      icon: 'alarm-outline',
      severity: 'high',
      solutions: [
        {
          title: 'Check Notification Permissions',
          description: 'Make sure UnlockAM has permission to send notifications.',
          action: async () => {
            await permissionRequester.openNotificationSettings();
          },
          actionText: 'Open Settings'
        },
        {
          title: 'Disable Battery Optimization',
          description: 'Your device may be killing the app to save battery.',
          action: async () => {
            await permissionRequester.openBatteryOptimizationSettings();
          },
          actionText: 'Open Battery Settings'
        },
        {
          title: 'Enable Auto-start',
          description: 'Allow the app to start automatically (mainly for Chinese phones).',
          action: async () => {
            await permissionNavigator.openAutoStartSettings();
          },
          actionText: 'Open Auto-start Settings'
        }
      ]
    },
    {
      id: 'alarms-not-on-lockscreen',
      title: 'Alarms Not Showing on Lock Screen',
      description: 'Alarms trigger but don\'t appear on your lock screen.',
      icon: 'phone-portrait-outline',
      severity: 'high',
      solutions: [
        {
          title: 'Enable Display Over Other Apps',
          description: 'This allows alarms to show on top of your lock screen.',
          action: async () => {
            await permissionRequester.openSystemAlertWindowSettings();
          },
          actionText: 'Open Overlay Settings'
        },
        {
          title: 'Check Lock Screen Notifications',
          description: 'Make sure notifications can show on your lock screen.',
          action: async () => {
            await permissionRequester.openNotificationSettings();
          },
          actionText: 'Open Notification Settings'
        }
      ]
    },
    {
      id: 'app-keeps-closing',
      title: 'App Keeps Closing in Background',
      description: 'The app stops working when you\'re not using it.',
      icon: 'close-circle-outline',
      severity: 'high',
      solutions: [
        {
          title: 'Disable Battery Optimization',
          description: 'Prevent your device from automatically closing the app.',
          action: async () => {
            await permissionRequester.openBatteryOptimizationSettings();
          },
          actionText: 'Open Battery Settings'
        },
        {
          title: 'Enable Background App Refresh',
          description: 'Allow the app to work in the background.',
          action: async () => {
            await permissionRequester.openAppSettings();
          },
          actionText: 'Open App Settings'
        },
        {
          title: 'Add to Power Saving Exceptions',
          description: 'Exclude UnlockAM from power saving features.',
          action: async () => {
            await permissionNavigator.openPowerManagementSettings();
          },
          actionText: 'Open Power Settings'
        }
      ]
    },
    {
      id: 'no-sound-or-vibration',
      title: 'No Sound or Vibration',
      description: 'Alarms are silent or don\'t vibrate.',
      icon: 'volume-mute-outline',
      severity: 'medium',
      solutions: [
        {
          title: 'Check Device Volume',
          description: 'Make sure your device volume is turned up and not in silent mode.',
        },
        {
          title: 'Check Notification Sound Settings',
          description: 'Verify that notification sounds are enabled.',
          action: async () => {
            await permissionRequester.openNotificationSettings();
          },
          actionText: 'Open Sound Settings'
        },
        {
          title: 'Test App Permissions',
          description: 'Some devices require special audio permissions.',
          action: async () => {
            await permissionRequester.openAppSettings();
          },
          actionText: 'Check Permissions'
        }
      ]
    },
    {
      id: 'delayed-alarms',
      title: 'Alarms Are Delayed',
      description: 'Alarms trigger but several minutes late.',
      icon: 'time-outline',
      severity: 'medium',
      solutions: [
        {
          title: 'Disable Doze Mode',
          description: 'Android\'s Doze mode can delay notifications.',
          action: async () => {
            await permissionRequester.openBatteryOptimizationSettings();
          },
          actionText: 'Open Battery Settings'
        },
        {
          title: 'Enable High Priority Notifications',
          description: 'Set UnlockAM notifications to high priority.',
          action: async () => {
            await permissionRequester.openNotificationSettings();
          },
          actionText: 'Open Notification Settings'
        }
      ]
    },
    {
      id: 'settings-not-saving',
      title: 'Settings Not Saving',
      description: 'Your alarm settings reset when you restart the app.',
      icon: 'settings-outline',
      severity: 'low',
      solutions: [
        {
          title: 'Clear App Cache',
          description: 'Clear the app\'s cache and restart.',
          action: async () => {
            Alert.alert(
              'Clear Cache',
              'Go to Settings > Apps > UnlockAM > Storage > Clear Cache',
              [{ text: 'OK' }]
            );
          },
          actionText: 'Show Instructions'
        },
        {
          title: 'Reinstall App',
          description: 'As a last resort, try reinstalling the app.',
        }
      ]
    }
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return 'alert-circle';
      case 'medium': return 'warning';
      case 'low': return 'information-circle';
      default: return 'help-circle';
    }
  };

  const handleSolutionAction = async (solution: Solution) => {
    if (solution.action) {
      try {
        setIsLoading(true);
        await solution.action();
      } catch (error) {
        console.error('Error executing solution action:', error);
        Alert.alert('Error', 'Failed to open settings. Please navigate manually.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const runDiagnostics = async () => {
    try {
      setIsLoading(true);
      const status = await permissionChecker.checkAllPermissions();
      const criticalMissing = await permissionChecker.getCriticalMissingPermissions();
      const isReady = await permissionChecker.isReadyForAlarms();

      const diagnostics = [
        `Notifications: ${status.notifications ? '✅' : '❌'}`,
        `System Overlay: ${status.systemAlertWindow ? '✅' : '❌'}`,
        `Battery Optimization: ${status.batteryOptimization ? '✅' : '❌'}`,
        `Background Refresh: ${status.backgroundFetch ? '✅' : '❌'}`,
        '',
        `Overall Status: ${isReady ? '✅ Ready' : '❌ Needs Setup'}`,
        '',
        criticalMissing.length > 0 ? 
          `Critical Issues: ${criticalMissing.map(p => p.title).join(', ')}` : 
          'No critical issues found'
      ].join('\n');

      Alert.alert(
        'Diagnostic Results',
        diagnostics,
        [
          { text: 'OK' },
          ...(criticalMissing.length > 0 ? [{
            text: 'Fix Issues',
            onPress: () => {
              // This would trigger the permission onboarding flow
              Alert.alert('Setup Required', 'Please go to Settings > Permissions to fix critical issues.');
            }
          }] : [])
        ]
      );
    } catch (error) {
      console.error('Error running diagnostics:', error);
      Alert.alert('Error', 'Failed to run diagnostics.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Troubleshooting</Text>
        <Text style={styles.subtitle}>
          Having issues with alarms? Find solutions below.
        </Text>
      </View>

      {/* Quick Diagnostics */}
      <View style={styles.diagnosticsCard}>
        <Text style={styles.cardTitle}>Quick Diagnostics</Text>
        <Text style={styles.diagnosticsDescription}>
          Run a quick check to identify common permission and setup issues.
        </Text>
        <TouchableOpacity
          style={styles.diagnosticsButton}
          onPress={runDiagnostics}
          disabled={isLoading}
        >
          <Ionicons name="medical-outline" size={20} color="#ffffff" />
          <Text style={styles.diagnosticsButtonText}>
            {isLoading ? 'Running...' : 'Run Diagnostics'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Troubleshooting Items */}
      <View style={styles.itemsList}>
        {troubleshootingItems.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          const severityColor = getSeverityColor(item.severity);
          const severityIcon = getSeverityIcon(item.severity);

          return (
            <View key={item.id} style={styles.troubleshootingItem}>
              <TouchableOpacity
                style={styles.itemHeader}
                onPress={() => toggleExpanded(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.itemHeaderLeft}>
                  <View style={[styles.itemIcon, { backgroundColor: `${severityColor}20` }]}>
                    <Ionicons name={item.icon as any} size={24} color={severityColor} />
                  </View>
                  <View style={styles.itemHeaderText}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                </View>
                <View style={styles.itemHeaderRight}>
                  <View style={styles.severityBadge}>
                    <Ionicons name={severityIcon} size={16} color={severityColor} />
                  </View>
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#64748b" 
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.solutionsContainer}>
                  <Text style={styles.solutionsTitle}>Solutions:</Text>
                  {item.solutions.map((solution, index) => (
                    <View key={index} style={styles.solution}>
                      <View style={styles.solutionHeader}>
                        <Text style={styles.solutionTitle}>{solution.title}</Text>
                      </View>
                      <Text style={styles.solutionDescription}>
                        {solution.description}
                      </Text>
                      {solution.action && solution.actionText && (
                        <TouchableOpacity
                          style={styles.solutionButton}
                          onPress={() => handleSolutionAction(solution)}
                          disabled={isLoading}
                        >
                          <Text style={styles.solutionButtonText}>
                            {solution.actionText}
                          </Text>
                          <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Contact Support */}
      <View style={styles.supportCard}>
        <Text style={styles.supportTitle}>Still Need Help?</Text>
        <Text style={styles.supportDescription}>
          If none of these solutions work, you can report the issue or get additional help.
        </Text>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => {
            Alert.alert(
              'Get Support',
              'You can:\n\n• Check our FAQ online\n• Report issues on GitHub\n• Contact support via email',
              [
                { text: 'OK' },
                {
                  text: 'Visit Website',
                  onPress: () => Linking.openURL('https://github.com/adilkt16/unlockam')
                }
              ]
            );
          }}
        >
          <Ionicons name="help-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.supportButtonText}>Get More Help</Text>
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
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
  },
  diagnosticsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  diagnosticsDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  diagnosticsButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagnosticsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  itemsList: {
    paddingHorizontal: 24,
  },
  troubleshootingItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemHeaderText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  itemHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityBadge: {
    marginRight: 8,
  },
  solutionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 16,
  },
  solutionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  solution: {
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  solutionHeader: {
    marginBottom: 4,
  },
  solutionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  solutionDescription: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
    marginBottom: 8,
  },
  solutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  solutionButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    marginRight: 4,
  },
  supportCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    margin: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
});
