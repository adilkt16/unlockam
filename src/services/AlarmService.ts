import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { AlarmSoundGenerator } from '../utils/soundGenerator';
import { GlobalAudioManager } from './GlobalAudioManager';
import { PermissionChecker } from './PermissionChecker';
import { BulletproofAlarmService } from './BulletproofAlarmService';

const BACKGROUND_ALARM_TASK = 'background-alarm-task';

// Background task for alarm monitoring
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
  try {
    const alarmService = AlarmService.getInstance();
    await alarmService.checkAndTriggerAlarm();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background alarm task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class AlarmService {
  private static instance: AlarmService;
  private activeAlarmId: string | null = null;
  private alarmSound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private backgroundTaskRegistered: boolean = false;
  private globalAudio = GlobalAudioManager.getInstance();
  private permissionChecker = PermissionChecker.getInstance();
  private bulletproofService = BulletproofAlarmService.getInstance();

  static getInstance(): AlarmService {
    if (!AlarmService.instance) {
      AlarmService.instance = new AlarmService();
    }
    return AlarmService.instance;
  }

  /**
   * Check if alarm is currently playing
   */
  get isAlarmPlaying(): boolean {
    return this.isPlaying;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // No longer requesting notification permissions
      // Just register background task for alarm monitoring
      if (!this.backgroundTaskRegistered) {
        await this.registerBackgroundTask();
      }
      return true;
    } catch (error) {
      console.error('Error setting up alarm service:', error);
      return false;
    }
  }

  async checkPermissionsStatus(): Promise<{
    isReady: boolean;
    criticalMissing: string[];
    recommendedMissing: string[];
  }> {
    const isReady = await this.permissionChecker.isReadyForAlarms();
    const criticalMissing = (await this.permissionChecker.getCriticalMissingPermissions()).map(p => p.type);
    const recommendedMissing = (await this.permissionChecker.getRecommendedMissingPermissions()).map(p => p.type);
    
    return {
      isReady,
      criticalMissing,
      recommendedMissing
    };
  }

  private async registerBackgroundTask(): Promise<void> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
          minimumInterval: 15000, // 15 seconds - minimum allowed
          stopOnTerminate: false,
          startOnBoot: true,
        });
        this.backgroundTaskRegistered = true;
        console.log('Background alarm task registered successfully');
      }
    } catch (error) {
      console.error('Failed to register background task:', error);
    }
  }

  async scheduleAlarm(startTime: string, endTime: string): Promise<boolean> {
    try {
      // Check notification permissions gracefully
      const hasNotificationPermission = await this.checkNotificationPermission();
      
      if (!hasNotificationPermission) {
        console.log('ℹ️ Notification permissions not granted - using timer-based alarm system');
      } else {
        console.log('✅ Notification permissions available - using enhanced alarm system');
      }

      console.log('📅 Setting up daily recurring alarm for:', { startTime, endTime });
      
      // Setup daily recurring alarm (works with or without notifications)
      return await this.setupDailyRecurringAlarm(startTime, endTime, hasNotificationPermission);
    } catch (error) {
      console.error('Failed to schedule alarm:', error);
      return false;
    }
  }

  async checkNotificationPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.log('Error checking notification permission:', error);
      return false;
    }
  }

  // Setup daily recurring alarm
  async setupDailyRecurringAlarm(startTime: string, endTime: string, hasNotificationPermission: boolean = false): Promise<boolean> {
    try {
      // Store alarm configuration for daily recurring
      await AsyncStorage.setItem('dailyAlarmConfig', JSON.stringify({
        startTime,
        endTime,
        enabled: true,
        createdAt: Date.now()
      }));

      // Cancel any existing alarm first
      await this.cancelAlarm();

      // Schedule next occurrence with or without notifications
      return await this.scheduleNextDailyAlarm(startTime, endTime, hasNotificationPermission);
    } catch (error) {
      console.error('Failed to setup daily recurring alarm:', error);
      return false;
    }
  }

  async scheduleNextDailyAlarm(startTime: string, endTime: string, hasNotificationPermission: boolean = false): Promise<boolean> {
    try {
      // Parse start time
      const [hours, minutes] = startTime.split(':').map(Number);
      const now = new Date();
      const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      
      // Parse end time
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHours, endMinutes, 0, 0);
      
      // If the alarm time has passed for today, schedule for tomorrow
      if (alarmDate < now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);
      }
      
      // If end time is before start time, it's for the next day
      if (endDate <= alarmDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      let alarmId: string;

      if (hasNotificationPermission) {
        // Use notification-based alarm
        try {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'WAKE UP! Daily UnlockAM Alarm',
              body: 'Your daily alarm is ringing! Solve the puzzle to stop it.',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 500, 500, 500, 500, 500],
              sticky: true,
              data: { 
                type: 'alarm',
                startTime,
                endTime,
                timestamp: Date.now(),
                fullScreen: true,
                isDaily: true
              },
              categoryIdentifier: 'ALARM_CATEGORY',
            },
            trigger: { 
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.max(1, (alarmDate.getTime() - now.getTime()) / 1000) 
            },
          });
          alarmId = notificationId;
          console.log('✅ Scheduled notification-based alarm');
        } catch (notificationError) {
          console.log('⚠️ Notification scheduling failed, falling back to timer-based alarm');
          alarmId = `alarm-${Date.now()}`;
        }
      } else {
        // Use timer-based alarm system
        alarmId = `alarm-${Date.now()}`;
        console.log('📱 Using timer-based alarm system (no notification permission)');
      }

      this.activeAlarmId = alarmId;
      
      // Store alarm info in AsyncStorage (without notifications)
      await AsyncStorage.setItem('activeAlarm', JSON.stringify({
        id: alarmId,
        startTime,
        endTime,
        scheduledFor: alarmDate.getTime(),
        endTimeTimestamp: endDate.getTime(),
        isDaily: true
      }));

      console.log(`🔔 Daily alarm scheduled for ${alarmDate.toLocaleString()}`);
      console.log(`⏰ Daily alarm will stop at ${endDate.toLocaleString()}`);
      
      if (hasNotificationPermission) {
        console.log('📱 Using enhanced alarm system with notifications + timer monitoring');
      } else {
        console.log('📱 Using timer-based alarm system (no notifications)');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to schedule next daily alarm:', error);
      return false;
    }
  }

  // Auto-reschedule after alarm ends (for daily recurring)
  async autoRescheduleDaily(): Promise<void> {
    try {
      const dailyConfig = await this.getDailyAlarmConfig();
      if (dailyConfig && dailyConfig.enabled) {
        console.log('🔄 Auto-rescheduling daily alarm for tomorrow...');
        await this.scheduleNextDailyAlarm(dailyConfig.startTime, dailyConfig.endTime);
      }
    } catch (error) {
      console.error('Failed to auto-reschedule daily alarm:', error);
    }
  }

  // Get daily alarm configuration
  async getDailyAlarmConfig(): Promise<{startTime: string; endTime: string; enabled: boolean; createdAt: number} | null> {
    try {
      const config = await AsyncStorage.getItem('dailyAlarmConfig');
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('Failed to get daily alarm config:', error);
      return null;
    }
  }

  // Disable daily alarm
  async disableDailyAlarm(): Promise<void> {
    try {
      await AsyncStorage.setItem('dailyAlarmConfig', JSON.stringify({
        enabled: false,
        disabledAt: Date.now()
      }));
      await this.cancelAlarm();
      console.log('📴 Daily alarm disabled');
    } catch (error) {
      console.error('Failed to disable daily alarm:', error);
    }
  }

  // Force check if it's currently alarm time
  async isAlarmTimeNow(): Promise<boolean> {
    try {
      const alarm = await this.getActiveAlarm();
      if (!alarm) return false;

      const now = Date.now();
      const alarmTime = alarm.scheduledFor;
      
      // Check if we're within 30 seconds of alarm time
      return now >= alarmTime - 30000 && now <= alarmTime + 300000; // 5 minute window
    } catch (error) {
      console.error('Failed to check if alarm time is now:', error);
      return false;
    }
  }

  // Check if end time has been reached
  async isEndTimeReached(): Promise<boolean> {
    try {
      const alarm = await this.getActiveAlarm();
      if (!alarm || !alarm.endTimeTimestamp) return false;

      const now = Date.now();
      return now >= alarm.endTimeTimestamp;
    } catch (error) {
      console.error('Failed to check if end time is reached:', error);
      return false;
    }
  }

  async checkAndTriggerAlarm(): Promise<void> {
    try {
      const alarm = await this.getActiveAlarm();
      if (!alarm) {
        console.log('🟡 checkAndTriggerAlarm: No active alarm found');
        return;
      }

      const now = new Date().getTime();
      const alarmTime = alarm.scheduledFor;
      const endTime = alarm.endTimeTimestamp;
      
      console.log(`🔍 checkAndTriggerAlarm: now=${now}, alarmTime=${alarmTime}, endTime=${endTime}, isPlaying=${this.isPlaying}`);
      
      // Check if end time has been reached - stop alarm regardless of isPlaying state
      if (endTime && now >= endTime) {
        console.log('⏰ End time reached! Stopping alarm automatically...');
        await this.stopAlarmSound();
        await this.cancelAlarm();
        return;
      }
      
      // If alarm time has passed and we haven't triggered yet
      if (now >= alarmTime && !this.isPlaying) {
        console.log('⏰ Start time reached! Triggering alarm...');
        await this.triggerFullScreenAlarm();
      }
    } catch (error) {
      console.error('Failed to check alarm:', error);
    }
  }

  async triggerFullScreenAlarm(): Promise<void> {
    try {
      console.log('Triggering bulletproof alarm experience');
      
      // Keep device awake
      await activateKeepAwakeAsync();
      
      // Use bulletproof alarm service for guaranteed playback
      const alarm = await this.getActiveAlarm();
      if (alarm) {
        console.log('🚨 TRIGGERING BULLETPROOF ALARM - Guaranteed locked-state playback!');
        await this.bulletproofService.triggerBulletproofAlarm();
      }
      
      // Also start traditional alarm sound as backup
      await this.startAlarmSound();
      
      console.log('🚨 ALARM TRIGGERED! Bulletproof alarm system activated');
      
      this.isPlaying = true;
    } catch (error) {
      console.error('Failed to trigger bulletproof alarm:', error);
    }
  }

  private async startAlarmSound(): Promise<void> {
    try {
      // Stop any existing sound
      await this.stopAlarmSound();
      
      // Set audio mode for alarm (like phone calls)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        allowsRecordingIOS: false,
      });
      
      // Try to create alarm sound using our generator
      try {
        this.alarmSound = await AlarmSoundGenerator.createComplexAlarmTone();
        if (this.alarmSound) {
          this.globalAudio.registerSound(this.alarmSound);
          await this.alarmSound.playAsync();
          console.log('Generated alarm sound started');
          return;
        }
      } catch (error) {
        console.log('Generated sound failed, trying online fallback:', error);
      }
      
      // Fallback to online alarm sound
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
          { 
            shouldPlay: true,
            isLooping: true,
            volume: 1.0,
          }
        );
        this.alarmSound = sound;
        this.globalAudio.registerSound(this.alarmSound);
        console.log('Online alarm sound loaded');
      } catch (error) {
        console.log('Online sound failed, using notification fallback:', error);
        await this.playFallbackAlarm();
        return;
      }
      
      console.log('Alarm sound started');
    } catch (error) {
      console.error('Failed to start alarm sound:', error);
      // Final fallback to system notification sound
      await this.playFallbackAlarm();
    }
  }

  private async playFallbackAlarm(): Promise<void> {
    // Fallback: Use continuous audio playing instead of notifications
    console.log('🚨 Using fallback alarm - continuous audio mode');
    
    // Keep playing alarm sound in a loop
    for (let i = 0; i < 30; i++) { // 30 iterations = 60 seconds
      if (!this.isPlaying) break;
      
      // Trigger vibration pattern (if available)
      console.log('📳 Alarm vibration pattern triggered');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async stopAlarmSound(): Promise<void> {
    try {
      // Stop bulletproof alarm service
      await this.bulletproofService.stopAlarm();
      
      if (this.alarmSound) {
        this.globalAudio.unregisterSound(this.alarmSound);
        await this.alarmSound.stopAsync();
        await this.alarmSound.unloadAsync();
        this.alarmSound = null;
      }
      
      this.isPlaying = false;
      
      // Force reset audio mode to default
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          allowsRecordingIOS: false,
        });
      } catch (audioModeError) {
        console.log('Could not reset audio mode:', audioModeError);
      }
      
      // Release wake lock
      deactivateKeepAwake();
      
      console.log('Alarm sound stopped (including bulletproof service)');
    } catch (error) {
      console.error('Failed to stop alarm sound:', error);
    }
  }

  // Force stop all audio and clear all alarms - nuclear option
  async forceStopEverything(): Promise<void> {
    try {
      console.log('🚨 FORCE STOPPING EVERYTHING - Nuclear option activated');
      
      // Check if this was a daily alarm before clearing storage
      const activeAlarm = await this.getActiveAlarm();
      const isDailyAlarm = activeAlarm?.isDaily;
      
      console.log('🔍 Active alarm check:', { activeAlarm, isDailyAlarm });
      
      // Stop bulletproof alarm service first
      await this.bulletproofService.stopAlarm();
      
      // Use GlobalAudioManager to stop ALL sounds across the entire app
      await this.globalAudio.stopAllSounds();
      
      // Stop our specific alarm sound
      await this.stopAlarmSound();
      
      // No notifications to cancel - using timer-based alarm system
      console.log('📱 Timer-based alarm stopped (no notifications to cancel)');
      
      // Clear active alarm storage
      await AsyncStorage.removeItem('activeAlarm');
      
      // Reset all state
      this.activeAlarmId = null;
      this.alarmSound = null;
      this.isPlaying = false;
      
      // If this was a daily alarm, automatically reschedule for tomorrow
      if (isDailyAlarm) {
        console.log('🔄 This was a daily alarm - auto-rescheduling for tomorrow');
        await this.autoRescheduleDaily();
      } else {
        console.log('📝 This was not a daily alarm, no auto-rescheduling needed');
      }
      
      // Force audio mode reset
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          allowsRecordingIOS: false,
        });
      } catch (error) {
        console.log('Audio mode reset failed:', error);
      }
      
      // Release wake lock
      deactivateKeepAwake();
      
      console.log('🚨 FORCE STOP COMPLETE - Everything should be silent now');
    } catch (error) {
      console.error('Failed to force stop everything:', error);
    }
  }

  async cancelAlarm(): Promise<void> {
    try {
      // Stop any playing alarm
      await this.stopAlarmSound();
      
      // Clear alarm ID (no notifications to cancel)
      if (this.activeAlarmId) {
        console.log(`📱 Canceling timer-based alarm: ${this.activeAlarmId}`);
        this.activeAlarmId = null;
      }
      
      // Clear from storage
      await AsyncStorage.removeItem('activeAlarm');
      
      // No notifications to dismiss - using timer-based system
      console.log('Timer-based alarm cancelled');
    } catch (error) {
      console.error('Failed to cancel alarm:', error);
    }
  }

  // Cancel alarm and disable daily recurring
  async cancelAndDisableDailyAlarm(): Promise<void> {
    try {
      // Cancel current alarm
      await this.cancelAlarm();
      
      // Disable daily recurring
      await this.disableDailyAlarm();
      
      console.log('Daily alarm cancelled and disabled');
    } catch (error) {
      console.error('Failed to cancel and disable daily alarm:', error);
    }
  }

  async getActiveAlarm(): Promise<any | null> {
    try {
      const alarmData = await AsyncStorage.getItem('activeAlarm');
      return alarmData ? JSON.parse(alarmData) : null;
    } catch (error) {
      console.error('Failed to get active alarm:', error);
      return null;
    }
  }

  async isAlarmActive(): Promise<boolean> {
    const alarm = await this.getActiveAlarm();
    if (!alarm) return false;

    // Check if the alarm time hasn't passed yet
    const now = Date.now();
    return alarm.scheduledFor > now;
  }

  // Get time until next alarm
  async getTimeUntilAlarm(): Promise<{ hours: number; minutes: number; seconds: number } | null> {
    const alarm = await this.getActiveAlarm();
    if (!alarm) return null;

    const now = new Date().getTime();
    const alarmTime = alarm.scheduledFor;
    const diff = alarmTime - now;

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { hours, minutes, seconds };
  }

  // Get time remaining until alarm stops automatically
  async getTimeUntilAlarmStops(): Promise<{ hours: number; minutes: number; seconds: number } | null> {
    const alarm = await this.getActiveAlarm();
    if (!alarm || !alarm.endTimeTimestamp) return null;

    const now = new Date().getTime();
    const endTime = alarm.endTimeTimestamp;
    const diff = endTime - now;

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { hours, minutes, seconds };
  }
}
