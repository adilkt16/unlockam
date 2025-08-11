import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TimeSettingsCard from '../components/TimeSettingsCard';
import AlarmModal from '../components/AlarmModal';
import TimePickerModal from '../components/TimePickerModal';
import DooaStatusCard from '../components/DooaStatusCard';
import OnboardingDebugPanel from '../components/OnboardingDebugPanel';
import { AlarmService } from '../services/AlarmService';
import { PermissionChecker } from '../services/PermissionChecker';
import { generateMathPuzzle, generatePatternPuzzle } from '../utils/puzzleGenerator';
import { useAudio } from '../hooks/useAudio';
import { GlobalAudioManager } from '../services/GlobalAudioManager';
import { AlarmTester } from '../components/AlarmTester';

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const [countdown, setCountdown] = useState("No Alarm Set");
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');
  const [startTime, setStartTime] = useState("06:30"); // Default value, will be overridden by loadSavedTimes
  const [endTime, setEndTime] = useState("07:30"); // Default value, will be overridden by loadSavedTimes
  const [isLoading, setIsLoading] = useState(true); // Add loading state to prevent UI flash
  const [currentPuzzle, setCurrentPuzzle] = useState<{
    type: 'math' | 'pattern';
    question: string;
    answer: string | boolean[];
    targetPattern?: boolean[];
  } | null>(null);

  const alarmService = AlarmService.getInstance();
  const { stopAlarm } = useAudio();
  const globalAudio = GlobalAudioManager.getInstance();

  // Load saved times on component mount
  useEffect(() => {
    loadSavedTimes();
    checkForActiveAlarm();
    checkAndSetupDailyAlarm();
  }, []);

  const checkAndSetupDailyAlarm = async () => {
    try {
      const dailyConfig = await alarmService.getDailyAlarmConfig();
      if (dailyConfig && dailyConfig.enabled) {
        console.log('📅 Daily alarm config found, checking if alarm is scheduled...');
        const activeAlarm = await alarmService.getActiveAlarm();
        
        if (!activeAlarm) {
          console.log('📅 No active alarm found, setting up daily alarm...');
          await alarmService.setupDailyRecurringAlarm(dailyConfig.startTime, dailyConfig.endTime);
        } else {
          console.log('📅 Daily alarm already scheduled for:', new Date(activeAlarm.scheduledFor).toLocaleString());
        }
      } else {
        console.log('📅 Daily alarm is disabled or not configured');
      }
    } catch (error) {
      console.error('Failed to check and setup daily alarm:', error);
    }
  };

  // Handle route parameters (for automatic alarm triggering)
  useEffect(() => {
    const params = route.params as any;
    if (params?.triggerAlarm) {
      console.log('🚨 Route parameter detected - triggering alarm immediately');
      triggerAlarm();
      // Clear the parameter to prevent re-triggering
      (navigation as any).setParams({ triggerAlarm: undefined });
    }
  }, [route.params]);

  // Check if alarm should be showing on app focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkForActiveAlarm();
    });

    return unsubscribe;
  }, [navigation]);

  const checkForActiveAlarm = async () => {
    try {
      const activeAlarm = await alarmService.getActiveAlarm();
      if (activeAlarm) {
        const now = Date.now();
        const alarmTime = activeAlarm.scheduledFor;
        
        // If alarm time has passed by more than 30 seconds, show alarm modal
        if (now >= alarmTime - 30000) { // 30 seconds buffer
          console.log('Active alarm detected, triggering alarm modal');
          triggerAlarm();
        }
      }
    } catch (error) {
      console.error('Failed to check for active alarm:', error);
    }
  };

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = async () => {
      const timeUntil = await alarmService.getTimeUntilAlarm();
      const activeAlarm = await alarmService.getActiveAlarm();
      const dailyConfig = await alarmService.getDailyAlarmConfig();
      
      // Check if daily alarm is disabled
      if (!dailyConfig || !dailyConfig.enabled) {
        setCountdown("Daily alarm is disabled");
        return;
      }
      
      if (!timeUntil || !activeAlarm) {
        setCountdown("Setting up daily alarm...");
        return;
      }
      
      const now = Date.now();
      const endTime = activeAlarm.endTimeTimestamp;
      
      // Check if end time has been reached
      if (endTime && now >= endTime && showAlarmModal) {
        console.log('⏰ END TIME REACHED! HomeScreen stopping alarm...');
        
        // Stop all audio and close alarm modal immediately
        await globalAudio.stopAllSounds();
        await alarmService.forceStopEverything();
        
        // Force close alarm modal
        setShowAlarmModal(false);
        setCurrentPuzzle(null);
        setCountdown("Daily alarm will resume tomorrow");
        
        console.log('✅ HomeScreen: Alarm fully stopped and modal closed');
        return;
      }
      
      const { hours, minutes, seconds } = timeUntil;
      if (hours === 0 && minutes === 0 && seconds <= 0) {
        setCountdown("Daily alarm is starting now!");
        // Trigger alarm modal
        triggerAlarm();
        return;
      }
      
      // Show time until next daily alarm
      let countdownText = `Next daily alarm in ${hours}h ${minutes}m ${seconds}s`;
      
      // If we have end time, also show alarm duration
      if (endTime && activeAlarm.scheduledFor) {
        const duration = Math.round((endTime - activeAlarm.scheduledFor) / 1000 / 60);
        countdownText += ` (${duration}min duration)`;
      }
      
      setCountdown(countdownText);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [showAlarmModal]);

  const loadSavedTimes = async () => {
    try {
      setIsLoading(true);
      const savedStartTime = await AsyncStorage.getItem('startTime');
      const savedEndTime = await AsyncStorage.getItem('endTime');
      
      console.log('🕐 Loading saved times:', { savedStartTime, savedEndTime });
      
      if (savedStartTime) {
        setStartTime(savedStartTime);
        console.log('✅ Loaded start time:', savedStartTime);
      } else {
        // If no saved time, use default and save it
        console.log('💾 No saved start time found, using default: 06:30');
        await AsyncStorage.setItem('startTime', '06:30');
      }
      
      if (savedEndTime) {
        setEndTime(savedEndTime);
        console.log('✅ Loaded end time:', savedEndTime);
      } else {
        // If no saved time, use default and save it
        console.log('💾 No saved end time found, using default: 07:30');
        await AsyncStorage.setItem('endTime', '07:30');
      }
    } catch (error) {
      console.error('❌ Failed to load saved times:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTimes = async (start: string, end: string) => {
    try {
      console.log('💾 Saving times:', { start, end });
      await AsyncStorage.setItem('startTime', start);
      await AsyncStorage.setItem('endTime', end);
      console.log('✅ Times saved successfully');
    } catch (error) {
      console.error('❌ Failed to save times:', error);
      Alert.alert('Error', 'Failed to save alarm times. Please try again.');
    }
  };


  const handleOpenTimePicker = (type: 'start' | 'end') => {
    setTimePickerType(type);
    setShowTimePickerModal(true);
  };

  const handleUpdateTime = async (type: 'start' | 'end', time: string) => {
    if (type === 'start') {
      setStartTime(time);
      await saveTimes(time, endTime);
    } else {
      setEndTime(time);
      await saveTimes(startTime, time);
    }
  };

  const handleAlarmStatusChange = async (active: boolean, alarm?: { startTime: string; endTime: string }) => {
    if (active && alarm) {
      const success = await alarmService.scheduleAlarm(alarm.startTime, alarm.endTime);
      if (success) {
        Alert.alert(
          'Daily Alarm Set', 
          `Daily alarm activated for ${formatTime(alarm.startTime)} - ${formatTime(alarm.endTime)}.\n\nThis alarm will repeat every day until you disable it.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to set daily alarm. Please try again.');
      }
    } else {
      await alarmService.cancelAndDisableDailyAlarm();
      Alert.alert(
        'Daily Alarm Disabled', 
        'Your daily alarm has been disabled and will not repeat.',
        [{ text: 'OK' }]
      );
    }
  };

  const triggerAlarm = async () => {
    console.log('Triggering alarm - starting full alarm experience');
    
    // Start the full-screen alarm experience
    await alarmService.triggerFullScreenAlarm();
    
    // Get puzzle settings from AsyncStorage or use defaults
    const puzzleType = (await AsyncStorage.getItem('puzzleType')) || 'math';
    const difficulty = (await AsyncStorage.getItem('difficulty')) || 'medium';

    let puzzle: any;
    if (puzzleType === 'math') {
      puzzle = generateMathPuzzle(difficulty as 'easy' | 'medium' | 'hard');
      puzzle.type = 'math';
    } else {
      puzzle = generatePatternPuzzle(difficulty as 'easy' | 'medium' | 'hard');
      puzzle.type = 'pattern';
      puzzle.targetPattern = puzzle.answer;
    }

    setCurrentPuzzle({
      type: puzzle.type,
      question: puzzle.question,
      answer: puzzle.answer,
      targetPattern: puzzle.targetPattern
    });
    setShowAlarmModal(true);
  };

  const handleAlarmStop = async () => {
    console.log('🔴 Stopping alarm - user solved puzzle or auto-stop triggered');
    
    // Check if we're past end time - if so, don't restart
    const activeAlarm = await alarmService.getActiveAlarm();
    if (activeAlarm && activeAlarm.endTimeTimestamp) {
      const now = Date.now();
      if (now >= activeAlarm.endTimeTimestamp) {
        console.log('🔴 End time passed - performing complete shutdown');
        await globalAudio.stopAllSounds();
        await alarmService.forceStopEverything();
        setShowAlarmModal(false);
        setCurrentPuzzle(null);
        return;
      }
    }
    
    // Normal puzzle solution stop - track as successful alarm completion
    console.log('✅ Normal puzzle solution stop - tracking alarm success');
    await PermissionChecker.getInstance().trackAlarmSuccess();
    
    await stopAlarm(); // Stop useAudio hook's sound
    await globalAudio.stopAllSounds(); // Stop ALL sounds via global manager
    await alarmService.forceStopEverything(); // AlarmService nuclear option
    setShowAlarmModal(false);
    setCurrentPuzzle(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: '#6b7280' }
      ]} 
      edges={['top']}
    >
      <View style={styles.backgroundContainer}>
        <ScrollView>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/unlockAM.png')}
              style={styles.logo}
            />
            <View style={styles.headerText}>
              <Text style={styles.title}>UnlockAM</Text>
              <Text style={styles.subtitle}>Solve to Wake</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => (navigation as any).navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

        {/* DOOA Permission Status Card */}
        <DooaStatusCard />

        {/* Debug Panel - Remove this in production */}
        <OnboardingDebugPanel />

        {/* Countdown Display */}
        <View style={styles.countdownCard}>
          <Ionicons name="alarm-outline" size={32} color="#ef4444" />
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>

        {/* Show loading indicator while times are loading */}
        {isLoading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading saved alarm times...</Text>
          </View>
        ) : (
          <>
            {/* Time Settings */}
            <TimeSettingsCard
              startTime={startTime}
              endTime={endTime}
              onOpenTimePicker={handleOpenTimePicker}
              onUpdateTime={handleUpdateTime}
              onAlarmStatusChange={handleAlarmStatusChange}
            />
          </>
        )}

        {/* Test Buttons */}
        <AlarmTester />
        {/* Debug Storage button removed as requested */}
      </ScrollView>

      {/* Modals */}
      <TimePickerModal
        visible={showTimePickerModal}
        type={timePickerType}
        currentTime={timePickerType === 'start' ? startTime : endTime}
        onTimeChange={(time: string) => {
          handleUpdateTime(timePickerType, time);
          setShowTimePickerModal(false);
        }}
        onClose={() => setShowTimePickerModal(false)}
      />

      {currentPuzzle && (
        <AlarmModal
          visible={showAlarmModal}
          puzzle={currentPuzzle}
          onSolve={handleAlarmStop}
          onClose={handleAlarmStop}
        />
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
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingsButton: {
    padding: 8,
  },
  countdownCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  countdownText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
    textAlign: 'center',
  },
  testContainer: {
    margin: 16,
    gap: 12,
  },
  testAlarmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  testAlarmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  loadingCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});
