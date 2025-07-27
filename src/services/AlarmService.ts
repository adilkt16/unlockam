import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { AlarmSoundGenerator } from '../utils/soundGenerator';
import { GlobalAudioManager } from './GlobalAudioManager';

const BACKGROUND_ALARM_TASK = 'background-alarm-task';

// Configure notification handler for maximum priority
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isAlarm = notification.request.content.data?.type === 'alarm';
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

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

  static getInstance(): AlarmService {
    if (!AlarmService.instance) {
      AlarmService.instance = new AlarmService();
    }
    return AlarmService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    
    // Register background task for alarm monitoring
    if (finalStatus === 'granted' && !this.backgroundTaskRegistered) {
      await this.registerBackgroundTask();
    }
    
    return finalStatus === 'granted';
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
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.error('Notification permissions not granted');
        return false;
      }

      console.log('📅 Setting up daily recurring alarm for:', { startTime, endTime });
      
      // Setup daily recurring alarm instead of one-time alarm
      return await this.setupDailyRecurringAlarm(startTime, endTime);
    } catch (error) {
      console.error('Failed to schedule alarm:', error);
      return false;
    }
  }

  // Setup daily recurring alarm
  async setupDailyRecurringAlarm(startTime: string, endTime: string): Promise<boolean> {
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

      // Schedule next occurrence
      return await this.scheduleNextDailyAlarm(startTime, endTime);
    } catch (error) {
      console.error('Failed to setup daily recurring alarm:', error);
      return false;
    }
  }

  async scheduleNextDailyAlarm(startTime: string, endTime: string): Promise<boolean> {
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

      // Create high-priority notification for daily alarm
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

      this.activeAlarmId = notificationId;
      
      // Store alarm info in AsyncStorage
      await AsyncStorage.setItem('activeAlarm', JSON.stringify({
        id: notificationId,
        startTime,
        endTime,
        scheduledFor: alarmDate.getTime(),
        endTimeTimestamp: endDate.getTime(),
        isDaily: true
      }));

      console.log(`🔔 Daily alarm scheduled for ${alarmDate.toLocaleString()}`);
      console.log(`⏰ Daily alarm will stop at ${endDate.toLocaleString()}`);
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
      console.log('Triggering full-screen alarm experience');
      
      // Keep device awake
      await activateKeepAwakeAsync();
      
      // Start continuous alarm sound
      await this.startAlarmSound();
      
      // Send high-priority notification for devices that don't show full-screen
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 ALARM RINGING!',
          body: 'Tap to open and solve puzzle to stop alarm',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 1000, 1000, 1000],
          data: { 
            type: 'alarm_active',
            timestamp: Date.now(),
            action: 'open_alarm'
          },
        },
        trigger: null, // Immediate notification
      });
      
      this.isPlaying = true;
    } catch (error) {
      console.error('Failed to trigger full-screen alarm:', error);
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
    // Fallback: Use multiple notification sounds
    for (let i = 0; i < 10; i++) {
      if (!this.isPlaying) break;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 ALARM!',
          body: 'Wake up! Solve puzzle to stop.',
          sound: 'default',
          vibrate: [0, 500, 500],
        },
        trigger: null, // Immediate notification
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async stopAlarmSound(): Promise<void> {
    try {
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
      
      console.log('Alarm sound stopped');
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
      
      // Use GlobalAudioManager to stop ALL sounds across the entire app
      await this.globalAudio.stopAllSounds();
      
      // Stop our specific alarm sound
      await this.stopAlarmSound();
      
      // Cancel all notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      
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
      
      if (this.activeAlarmId) {
        await Notifications.cancelScheduledNotificationAsync(this.activeAlarmId);
        this.activeAlarmId = null;
      }
      
      // Clear from storage
      await AsyncStorage.removeItem('activeAlarm');
      
      // Dismiss any active notifications
      await Notifications.dismissAllNotificationsAsync();
      
      console.log('Alarm cancelled');
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

    // Check if the alarm is still scheduled
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return scheduledNotifications.some(notification => notification.identifier === alarm.id);
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
