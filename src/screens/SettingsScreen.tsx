import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudio } from '../hooks/useAudio';
import { AlarmSoundGenerator } from '../utils/soundGenerator';
import { PermissionChecker } from '../services/PermissionChecker';
import PermissionStatusDashboard from '../components/PermissionStatusDashboard';
import TroubleshootingScreen from '../components/TroubleshootingScreen';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const [puzzleType, setPuzzleType] = useState<'math' | 'pattern'>('math');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [alarmSoundType, setAlarmSoundType] = useState<string>(AlarmSoundGenerator.ALARM_TYPES.CLASSIC);
  const [currentView, setCurrentView] = useState<'settings' | 'permissions' | 'troubleshooting'>('settings');
  const [permissionStatus, setPermissionStatus] = useState<'ready' | 'needs-setup' | 'checking'>('checking');
  const { testAlarmSound } = useAudio();

  const permissionChecker = PermissionChecker.getInstance();

  useEffect(() => {
    loadSettings();
    checkPermissionStatus();
    
    // Listen for app state changes to refresh permissions when returning from settings
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App became active, refresh permission status
        checkPermissionStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const checkPermissionStatus = async () => {
    try {
      console.log('Checking permission status from settings screen...');
      // Use refreshPermissions to ensure we get fresh data
      await permissionChecker.refreshPermissions();
      const isReady = await permissionChecker.isReadyForAlarms();
      setPermissionStatus(isReady ? 'ready' : 'needs-setup');
      console.log('Permission status updated:', isReady ? 'ready' : 'needs-setup');
    } catch (error) {
      console.error('Error checking permission status:', error);
      setPermissionStatus('needs-setup');
    }
  };

  const handlePermissionReset = async () => {
    Alert.alert(
      'Reset App Data',
      'This will reset all app tracking data and start fresh. Use this if you want to reset the permission detection system.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await permissionChecker.resetAllPermissionStates();
            checkPermissionStatus();
            Alert.alert('Reset Complete', 'App data has been reset. Permission detection will start fresh.');
          }
        }
      ]
    );
  };

  const loadSettings = async () => {
    try {
      const savedPuzzleType = await AsyncStorage.getItem('puzzleType');
      const savedDifficulty = await AsyncStorage.getItem('difficulty');
      const savedSoundEnabled = await AsyncStorage.getItem('soundEnabled');
      const savedVibrationEnabled = await AsyncStorage.getItem('vibrationEnabled');
      const savedAlarmSoundType = await AsyncStorage.getItem('alarmSoundType');

      if (savedPuzzleType) setPuzzleType(savedPuzzleType as 'math' | 'pattern');
      if (savedDifficulty) setDifficulty(savedDifficulty as 'easy' | 'medium' | 'hard');
      if (savedSoundEnabled !== null) setSoundEnabled(savedSoundEnabled === 'true');
      if (savedVibrationEnabled !== null) setVibrationEnabled(savedVibrationEnabled === 'true');
      if (savedAlarmSoundType) setAlarmSoundType(savedAlarmSoundType);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('puzzleType', puzzleType);
      await AsyncStorage.setItem('difficulty', difficulty);
      await AsyncStorage.setItem('soundEnabled', soundEnabled.toString());
      await AsyncStorage.setItem('vibrationEnabled', vibrationEnabled.toString());
      await AsyncStorage.setItem('alarmSoundType', alarmSoundType);
      
      Alert.alert('Settings Saved', 'Your preferences have been saved successfully.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const resetStats = async () => {
    Alert.alert(
      'Reset Statistics',
      'Are you sure you want to reset all your statistics? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('stats');
              Alert.alert('Statistics Reset', 'All statistics have been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset statistics.');
            }
          },
        },
      ]
    );
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    children 
  }: { 
    icon: string; 
    title: string; 
    subtitle?: string; 
    children: React.ReactNode 
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color="#3b82f6" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children}
    </View>
  );

  const OptionButton = ({ 
    label, 
    selected, 
    onPress 
  }: { 
    label: string; 
    selected: boolean; 
    onPress: () => void 
  }) => (
    <TouchableOpacity
      style={[styles.optionButton, selected && styles.selectedOptionButton]}
      onPress={onPress}
    >
      <Text style={[styles.optionButtonText, selected && styles.selectedOptionButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: '#6b7280' }
      ]} 
      edges={['top']}
    >
      <View style={styles.backgroundContainer}>
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (currentView !== 'settings') {
                setCurrentView('settings');
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentView === 'settings' ? 'Settings' : 
             currentView === 'permissions' ? 'Permissions' : 'Troubleshooting'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        
        {currentView === 'settings' && (
          <ScrollView style={styles.scrollContainer}>
        <SettingSection title="Puzzle Settings">
        <SettingRow
          icon="calculator"
          title="Puzzle Type"
          subtitle="Choose the type of puzzle for alarms"
        >
          <View style={styles.optionGroup}>
            <OptionButton
              label="Math"
              selected={puzzleType === 'math'}
              onPress={() => setPuzzleType('math')}
            />
            <OptionButton
              label="Pattern"
              selected={puzzleType === 'pattern'}
              onPress={() => setPuzzleType('pattern')}
            />
          </View>
        </SettingRow>

        <SettingRow
          icon="speedometer"
          title="Difficulty"
          subtitle="Adjust puzzle difficulty level"
        >
          <View style={styles.optionGroup}>
            <OptionButton
              label="Easy"
              selected={difficulty === 'easy'}
              onPress={() => setDifficulty('easy')}
            />
            <OptionButton
              label="Medium"
              selected={difficulty === 'medium'}
              onPress={() => setDifficulty('medium')}
            />
            <OptionButton
              label="Hard"
              selected={difficulty === 'hard'}
              onPress={() => setDifficulty('hard')}
            />
          </View>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Alarm Settings">
        <View style={styles.alarmSoundSection}>
          <View style={styles.alarmSoundHeader}>
            <Ionicons name="musical-notes" size={24} color="#3b82f6" />
            <View style={styles.alarmSoundHeaderText}>
              <Text style={styles.alarmSoundTitle}>Alarm Sound</Text>
              <Text style={styles.alarmSoundSubtitle}>Choose your alarm sound type</Text>
            </View>
          </View>
          
          <View style={styles.alarmSoundOptions}>
            {AlarmSoundGenerator.getAllAlarmTypes().map((soundType) => (
              <TouchableOpacity
                key={soundType.value}
                style={[
                  styles.alarmSoundOption,
                  alarmSoundType === soundType.value && styles.alarmSoundOptionSelected
                ]}
                onPress={() => setAlarmSoundType(soundType.value)}
              >
                <View style={styles.alarmSoundOptionContent}>
                  <View style={styles.alarmSoundOptionLeft}>
                    <View style={[
                      styles.radioButton,
                      alarmSoundType === soundType.value && styles.radioButtonSelected
                    ]}>
                      {alarmSoundType === soundType.value && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    <Text style={[
                      styles.alarmSoundOptionText,
                      alarmSoundType === soundType.value && styles.alarmSoundOptionTextSelected
                    ]}>
                      {soundType.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      testAlarmSound(soundType.value);
                    }}
                  >
                    <Ionicons name="play" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <SettingRow
          icon="volume-high"
          title="Sound"
          subtitle="Enable alarm sounds"
        >
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={soundEnabled ? '#3b82f6' : '#f3f4f6'}
          />
        </SettingRow>

        <SettingRow
          icon="phone-portrait"
          title="Vibration"
          subtitle="Enable vibration feedback"
        >
          <Switch
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={vibrationEnabled ? '#3b82f6' : '#f3f4f6'}
          />
        </SettingRow>

        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => {
            testAlarmSound(alarmSoundType);
            Alert.alert('Testing Alarm Sound', `Playing ${AlarmSoundGenerator.getAlarmTypeDisplayName(alarmSoundType)} for 3 seconds...`);
          }}
        >
          <Ionicons name="play-circle" size={20} color="#3b82f6" />
          <Text style={styles.testButtonText}>Test Selected Sound</Text>
        </TouchableOpacity>
      </SettingSection>

      <SettingSection title="Permissions & Setup">
        <SettingRow
          icon="shield-checkmark"
          title="App Permissions"
          subtitle={
            permissionStatus === 'ready' 
              ? "All permissions granted" 
              : permissionStatus === 'needs-setup'
              ? "Some permissions need setup"
              : "Checking permissions..."
          }
        >
          <View style={styles.permissionButtonContainer}>
            <TouchableOpacity
              style={[
                styles.permissionButton,
                permissionStatus === 'ready' && styles.permissionButtonReady,
                permissionStatus === 'needs-setup' && styles.permissionButtonNeedsSetup
              ]}
              onPress={() => setCurrentView('permissions')}
            >
              <Ionicons 
                name={permissionStatus === 'ready' ? "checkmark-circle" : "settings"} 
                size={16} 
                color={permissionStatus === 'ready' ? "#22c55e" : "#f59e0b"} 
              />
              <Text style={[
                styles.permissionButtonText,
                permissionStatus === 'ready' && styles.permissionButtonTextReady,
                permissionStatus === 'needs-setup' && styles.permissionButtonTextNeedsSetup
              ]}>
                {permissionStatus === 'ready' ? "View Status" : "Setup"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={checkPermissionStatus}
              onLongPress={handlePermissionReset}
              delayLongPress={1000}
            >
              <Ionicons name="refresh" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </SettingRow>

        <SettingRow
          icon="help-circle"
          title="Troubleshooting"
          subtitle="Fix common alarm issues"
        >
          <TouchableOpacity
            style={styles.troubleshootButton}
            onPress={() => setCurrentView('troubleshooting')}
          >
            <Text style={styles.troubleshootButtonText}>Help</Text>
            <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Data">
        <TouchableOpacity style={styles.actionButton} onPress={resetStats}>
          <Ionicons name="refresh" size={20} color="#ef4444" />
          <Text style={styles.actionButtonText}>Reset Statistics</Text>
        </TouchableOpacity>
      </SettingSection>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>UnlockAM v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Solve to Wake</Text>
        </View>
      </View>
      </ScrollView>
        )}
        
        {currentView === 'permissions' && (
          <PermissionStatusDashboard />
        )}
        
        {currentView === 'troubleshooting' && (
          <TroubleshootingScreen />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  selectedOptionButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#1d4ed8',
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedOptionButtonText: {
    color: 'white',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  bottomSection: {
    padding: 16,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  appInfo: {
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
  alarmSoundSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  alarmSoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmSoundHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  alarmSoundTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  alarmSoundSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  alarmSoundOptions: {
    gap: 12,
  },
  alarmSoundOption: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  alarmSoundOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  alarmSoundOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alarmSoundOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: '#3b82f6',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  alarmSoundOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  alarmSoundOptionTextSelected: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  previewButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  permissionButtonReady: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  permissionButtonNeedsSetup: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 6,
  },
  permissionButtonTextReady: {
    color: '#22c55e',
  },
  permissionButtonTextNeedsSetup: {
    color: '#f59e0b',
  },
  permissionButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  troubleshootButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  troubleshootButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    marginRight: 6,
  },
});
