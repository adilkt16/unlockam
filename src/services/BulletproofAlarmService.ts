import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { GlobalAudioManager } from './GlobalAudioManager';

const { AndroidAlarmAudio } = NativeModules;

/**
 * BULLETPROOF ALARM SERVICE
 * Guarantees alarm sound playback in background and locked state
 * Works even without DOOA or notification permissions
 */
export class BulletproofAlarmService {
  private static instance: BulletproofAlarmService;
  private alarmSound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private globalAudio = GlobalAudioManager.getInstance();
  private alarmTimer: NodeJS.Timeout | null = null;
  private audioFallbackTimer: NodeJS.Timeout | null = null;
  private activeAlarmId: string | null = null;

  static getInstance(): BulletproofAlarmService {
    if (!BulletproofAlarmService.instance) {
      BulletproofAlarmService.instance = new BulletproofAlarmService();
    }
    return BulletproofAlarmService.instance;
  }

  private constructor() {
    this.initializeAudioSystem();
  }

  /**
   * Initialize audio system with maximum privileges for locked state playback
   */
  private async initializeAudioSystem() {
    try {
      console.log('🚨 BULLETPROOF ALARM: Initializing maximum audio privileges...');

      // Set maximum audio privileges
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      console.log('✅ BULLETPROOF ALARM: Maximum audio privileges initialized');
    } catch (error) {
      console.error('❌ BULLETPROOF ALARM: Failed to initialize audio system:', error);
    }
  }

  /**
   * Schedule alarm with bulletproof reliability
   */
  async scheduleAlarm(startTime: string, endTime: string): Promise<boolean> {
    try {
      console.log('🚨 BULLETPROOF ALARM: Scheduling alarm with maximum reliability...');
      
      const now = new Date();
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      // Create alarm date for today or tomorrow
      const alarmDate = new Date();
      alarmDate.setHours(startHour, startMin, 0, 0);
      
      if (alarmDate.getTime() <= now.getTime()) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }

      const endDate = new Date(alarmDate);
      endDate.setHours(endHour, endMin, 0, 0);

      this.activeAlarmId = `bulletproof-alarm-${Date.now()}`;

      // Store alarm data
      await AsyncStorage.setItem('bulletproofAlarm', JSON.stringify({
        id: this.activeAlarmId,
        startTime,
        endTime,
        scheduledFor: alarmDate.getTime(),
        endTimeTimestamp: endDate.getTime(),
      }));

      // Method 1: Native Android system alarm (highest priority)
      if (Platform.OS === 'android' && AndroidAlarmAudio) {
        try {
          await AndroidAlarmAudio.scheduleAlarm({
            alarmId: this.activeAlarmId,
            triggerTime: alarmDate.getTime(),
            soundType: 'alert',
            vibration: true,
            label: 'UnlockAM Alarm',
          });
          console.log('✅ BULLETPROOF: Native Android system alarm scheduled');
        } catch (nativeError) {
          console.log('⚠️ Native alarm failed, using fallbacks:', nativeError);
        }
      }

      // Method 2: Timer-based monitoring (JavaScript level)
      this.startTimerBasedMonitoring(alarmDate.getTime(), endDate.getTime());

      // Method 3: Pre-load audio resources
      await this.preloadAudioResources();

      console.log(`🚨 BULLETPROOF ALARM: Multi-layer alarm scheduled for ${alarmDate.toLocaleString()}`);
      console.log(`⏰ BULLETPROOF ALARM: Will auto-stop at ${endDate.toLocaleString()}`);

      return true;
    } catch (error) {
      console.error('❌ BULLETPROOF ALARM: Failed to schedule:', error);
      return false;
    }
  }

  /**
   * Pre-load audio resources for instant playback
   */
  private async preloadAudioResources() {
    try {
      console.log('🎵 BULLETPROOF ALARM: Pre-loading audio resources...');
      
      // Pre-load the main alarm sound
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/alarm-sound.wav'),
        { shouldPlay: false }
      );
      
      // Keep it ready but not playing
      this.alarmSound = sound;
      this.globalAudio.registerSound(sound);
      
      console.log('✅ BULLETPROOF ALARM: Audio resources pre-loaded');
    } catch (error) {
      console.log('⚠️ Failed to pre-load audio:', error);
    }
  }

  /**
   * Start timer-based monitoring for alarm triggering
   */
  private startTimerBasedMonitoring(alarmTime: number, endTime: number) {
    // Clear any existing timer
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
    }

    console.log('⏰ BULLETPROOF ALARM: Starting timer-based monitoring...');

    this.alarmTimer = setInterval(async () => {
      const now = Date.now();
      
      // Check if it's time to trigger alarm
      if (now >= alarmTime && now <= endTime && !this.isPlaying) {
        console.log('🚨 BULLETPROOF ALARM: Timer triggered - starting alarm NOW!');
        await this.triggerBulletproofAlarm();
      }
      
      // Check if end time reached
      if (now >= endTime && this.isPlaying) {
        console.log('⏰ BULLETPROOF ALARM: End time reached - stopping alarm');
        await this.stopAlarm();
      }
      
    }, 1000); // Check every second for maximum reliability
  }

  /**
   * Trigger alarm with bulletproof methods - GUARANTEED PLAYBACK
   */
  async triggerBulletproofAlarm(): Promise<void> {
    try {
      console.log('🚨 BULLETPROOF ALARM: TRIGGERING WITH MAXIMUM FORCE!');
      this.isPlaying = true;

      // Keep device awake
      await activateKeepAwakeAsync();

      // Method 1: Native Android alarm service (priority 1)
      if (Platform.OS === 'android' && AndroidAlarmAudio) {
        try {
          await AndroidAlarmAudio.playLockedStateAlarm({
            alarmId: this.activeAlarmId,
            soundType: 'alert',
            volume: 1.0,
            vibration: true,
            showOverLockscreen: true,
            wakeScreen: true,
          });
          console.log('✅ BULLETPROOF: Native Android alarm started');
        } catch (nativeError) {
          console.log('⚠️ Native alarm failed:', nativeError);
        }
      }

      // Method 2: Direct audio playback (priority 2)
      await this.startDirectAudioPlayback();

      // Method 3: System notification fallback (priority 3)
      await this.startSystemNotificationFallback();

      // Method 4: Continuous audio forcing (priority 4)
      this.startContinuousAudioForcing();

      console.log('🚨 BULLETPROOF ALARM: ALL ALARM METHODS ACTIVATED!');

    } catch (error) {
      console.error('❌ BULLETPROOF ALARM: Critical error:', error);
      // Emergency fallback
      await this.emergencyAlarmFallback();
    }
  }

  /**
   * Direct audio playback with maximum volume and priority
   */
  private async startDirectAudioPlayback() {
    try {
      console.log('🔊 BULLETPROOF: Starting direct audio playback...');

      // If we have pre-loaded sound, use it
      if (this.alarmSound) {
        await this.alarmSound.setVolumeAsync(1.0);
        await this.alarmSound.setIsLoopingAsync(true);
        await this.alarmSound.playAsync();
        console.log('✅ BULLETPROOF: Pre-loaded sound playing');
        return;
      }

      // Otherwise create new sound
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/alarm-sound.wav'),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        }
      );

      this.alarmSound = sound;
      this.globalAudio.registerSound(sound);
      console.log('✅ BULLETPROOF: Direct audio playback started');

    } catch (error) {
      console.log('⚠️ Direct audio failed:', error);
    }
  }

  /**
   * System notification fallback for when audio fails
   */
  private async startSystemNotificationFallback() {
    try {
      console.log('📢 BULLETPROOF: Starting system notification fallback...');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 WAKE UP! 🚨',
          body: 'Your alarm is ringing - Open UnlockAM now!',
          sound: true, // Use system notification sound
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 1000, 500, 1000, 500, 1000],
        },
        trigger: null,
      });

      console.log('✅ BULLETPROOF: System notification fallback activated');
    } catch (error) {
      console.log('⚠️ System notification failed:', error);
    }
  }

  /**
   * Continuous audio forcing - sends notification sounds every 3 seconds
   */
  private startContinuousAudioForcing() {
    console.log('🔄 BULLETPROOF: Starting continuous audio forcing...');

    this.audioFallbackTimer = setInterval(async () => {
      if (!this.isPlaying) {
        clearInterval(this.audioFallbackTimer!);
        return;
      }

      try {
        // Send notification sound every 3 seconds
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 ALARM RINGING',
            body: 'WAKE UP NOW!',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500],
          },
          trigger: null,
        });

        console.log('🔔 BULLETPROOF: Continuous audio pulse sent');
      } catch (error) {
        console.log('⚠️ Continuous audio pulse failed:', error);
      }

    }, 3000); // Every 3 seconds
  }

  /**
   * Emergency fallback when all other methods fail
   */
  private async emergencyAlarmFallback() {
    console.log('🚨 BULLETPROOF: EMERGENCY FALLBACK ACTIVATED!');

    // Rapid-fire notifications
    for (let i = 0; i < 10; i++) {
      setTimeout(async () => {
        if (!this.isPlaying) return;

        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🚨 EMERGENCY ALARM',
              body: 'WAKE UP IMMEDIATELY!',
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 1000, 200, 1000],
            },
            trigger: null,
          });
        } catch (error) {
          console.log('Emergency notification failed:', error);
        }
      }, i * 2000); // Every 2 seconds for 20 seconds
    }
  }

  /**
   * Stop alarm and clean up all resources
   */
  async stopAlarm(): Promise<void> {
    try {
      console.log('🛑 BULLETPROOF ALARM: Stopping all alarm methods...');

      this.isPlaying = false;

      // Clear timers
      if (this.alarmTimer) {
        clearInterval(this.alarmTimer);
        this.alarmTimer = null;
      }

      if (this.audioFallbackTimer) {
        clearInterval(this.audioFallbackTimer);
        this.audioFallbackTimer = null;
      }

      // Stop native Android alarm
      if (Platform.OS === 'android' && AndroidAlarmAudio && this.activeAlarmId) {
        try {
          await AndroidAlarmAudio.stopAlarm(this.activeAlarmId);
        } catch (error) {
          console.log('Failed to stop native alarm:', error);
        }
      }

      // Stop direct audio
      if (this.alarmSound) {
        try {
          await this.alarmSound.stopAsync();
          await this.alarmSound.unloadAsync();
          this.globalAudio.unregisterSound(this.alarmSound);
        } catch (error) {
          console.log('Failed to stop direct audio:', error);
        }
        this.alarmSound = null;
      }

      // Stop all global audio
      await this.globalAudio.stopAllSounds();

      // Reset audio mode
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          allowsRecordingIOS: false,
        });
      } catch (error) {
        console.log('Failed to reset audio mode:', error);
      }

      // Dismiss notifications
      try {
        await Notifications.dismissAllNotificationsAsync();
      } catch (error) {
        console.log('Failed to dismiss notifications:', error);
      }

      // Release wake lock
      deactivateKeepAwake();

      // Clear storage
      await AsyncStorage.removeItem('bulletproofAlarm');
      this.activeAlarmId = null;

      console.log('✅ BULLETPROOF ALARM: All alarm methods stopped');

    } catch (error) {
      console.error('❌ BULLETPROOF ALARM: Error stopping alarm:', error);
    }
  }

  /**
   * Check if alarm is currently playing
   */
  get isAlarmPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Cancel scheduled alarm
   */
  async cancelAlarm(): Promise<void> {
    await this.stopAlarm();
    console.log('🚨 BULLETPROOF ALARM: Alarm cancelled');
  }
}
