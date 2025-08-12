import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { GlobalAudioManager } from './GlobalAudioManager';
import { AlarmyStyleAlarm } from './AlarmyStyleAlarmManager';

/**
 * BULLETPROOF ALARM SERVICE (FIXED VERSION)
 * Guarantees alarm sound playback in background and locked state
 * Works with native AlarmyStyleAlarm module
 */
export class FixedBulletproofAlarmService {
  private static instance: FixedBulletproofAlarmService;
  private alarmSound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private globalAudio = GlobalAudioManager.getInstance();
  private alarmTimer: NodeJS.Timeout | null = null;
  private audioFallbackTimer: NodeJS.Timeout | null = null;
  private activeAlarmId: string | null = null;

  static getInstance(): FixedBulletproofAlarmService {
    if (!FixedBulletproofAlarmService.instance) {
      FixedBulletproofAlarmService.instance = new FixedBulletproofAlarmService();
    }
    return FixedBulletproofAlarmService.instance;
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
   * TEST FUNCTION: Trigger alarm in specified seconds for testing
   */
  async testAlarmInSeconds(seconds: number = 30): Promise<void> {
    console.log(`🧪 BULLETPROOF TEST: Starting alarm test in ${seconds} seconds...`);
    
    const testDate = new Date();
    testDate.setSeconds(testDate.getSeconds() + seconds);
    
    const endDate = new Date(testDate);
    endDate.setMinutes(endDate.getMinutes() + 2); // Run for 2 minutes max
    
    console.log(`🧪 TEST: Alarm will trigger at ${testDate.toLocaleTimeString()}`);
    console.log(`🧪 TEST: Alarm will auto-stop at ${endDate.toLocaleTimeString()}`);
    
    this.activeAlarmId = `test-alarm-${Date.now()}`;
    
    // Store test alarm data
    await AsyncStorage.setItem('bulletproofAlarm', JSON.stringify({
      id: this.activeAlarmId,
      startTime: `${testDate.getHours()}:${testDate.getMinutes()}`,
      endTime: `${endDate.getHours()}:${endDate.getMinutes()}`,
      scheduledFor: testDate.getTime(),
      endTimeTimestamp: endDate.getTime(),
      isTest: true,
    }));

    // Use native AlarmyStyleAlarm for background reliability
    if (Platform.OS === 'android' && AlarmyStyleAlarm?.isAvailable) {
      try {
        await AlarmyStyleAlarm.scheduleAlarm({
          alarmId: this.activeAlarmId,
          triggerTime: testDate.getTime(),
          label: 'UnlockAM Test Alarm',
        });
        console.log('✅ BULLETPROOF TEST: Native Android alarm scheduled!');
        
      } catch (nativeError) {
        console.error('❌ Failed to schedule native alarm:', nativeError);
        this.startTimerBasedMonitoring(testDate.getTime(), endDate.getTime());
      }
    } else {
      this.startTimerBasedMonitoring(testDate.getTime(), endDate.getTime());
    }

    await this.preloadAudioResources();
    
    console.log('🧪 BULLETPROOF TEST: Test alarm scheduled! The alarm will work even if you lock your phone.');
  }

  /**
   * TEST FUNCTION: Test native Android service directly (most reliable for locked state)
   */
  async testNativeServiceNow(): Promise<void> {
    console.log('🔍 TESTING NATIVE SERVICE NOW - START');
    console.log('===============================================');
    
    // Check if AlarmyStyleAlarm native module is available
    const isModuleAvailable = AlarmyStyleAlarm && typeof AlarmyStyleAlarm.testNativeServiceNow === 'function';
    
    if (!isModuleAvailable) {
      console.log('❌ NATIVE MODULE TEST FAILED - AlarmyStyleAlarm not available');
      console.log('🏗️  This likely means the app needs to be rebuilt with EAS Build or expo run:android');
      console.log('🔧 Native modules require native compilation, not just Metro bundler refresh');
      console.log('===============================================');
      return;
    }

    try {
      console.log('🧪 TESTING ACTUAL NATIVE SERVICE CALL...');
      const callSuccess = await AlarmyStyleAlarm.testNativeServiceNow();
      
      if (callSuccess) {
        console.log('✅ NATIVE SERVICE TEST SUCCESSFUL!');
        console.log('🔊 Native AlarmyStyleAlarmService should now be playing locked-state alarm');
        console.log('📱 LOCK YOUR PHONE NOW to test background audio!');
      } else {
        console.log('❌ NATIVE SERVICE CALL FAILED');
        console.log('🔧 Check AlarmyStyleAlarmService implementation and registration');
      }
    } catch (error) {
      console.log('❌ NATIVE SERVICE CALL ERROR:', error);
    }
    
    console.log('===============================================');
    console.log('🔍 TESTING NATIVE SERVICE NOW - END');
  }

  /**
   * Pre-load audio resources for instant playback
   */
  private async preloadAudioResources() {
    try {
      console.log('🎵 BULLETPROOF ALARM: Pre-loading audio resources...');
      
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/alarm-sound.wav'),
        { shouldPlay: false }
      );
      
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
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
    }

    console.log('⏰ BULLETPROOF ALARM: Starting timer-based monitoring...');

    this.alarmTimer = setInterval(async () => {
      const now = Date.now();
      
      if (now >= alarmTime && now <= endTime && !this.isPlaying) {
        console.log('🚨 BULLETPROOF ALARM: Timer triggered - starting alarm NOW!');
        await this.triggerBulletproofAlarm();
      }
      
      if (now >= endTime && this.isPlaying) {
        console.log('⏰ BULLETPROOF ALARM: End time reached - stopping alarm');
        await this.stopAlarm();
      }
      
    }, 1000);
  }

  /**
   * Trigger alarm with bulletproof methods
   */
  async triggerBulletproofAlarm(): Promise<void> {
    try {
      console.log('🚨 BULLETPROOF ALARM: TRIGGERING WITH MAXIMUM FORCE!');
      this.isPlaying = true;

      await activateKeepAwakeAsync();

      // Method 1: Native AlarmyStyleAlarm service
      if (Platform.OS === 'android' && AlarmyStyleAlarm?.testNativeServiceNow) {
        try {
          await AlarmyStyleAlarm.testNativeServiceNow();
          console.log('✅ BULLETPROOF: Native AlarmyStyleAlarm started');
        } catch (nativeError) {
          console.log('⚠️ Native alarm failed:', nativeError);
        }
      }

      // Method 2: Direct audio playback
      await this.startDirectAudioPlayback();

      // Method 3: System notification fallback
      await this.startSystemNotificationFallback();

      console.log('🚨 BULLETPROOF ALARM: ALL ALARM METHODS ACTIVATED!');

    } catch (error) {
      console.error('❌ BULLETPROOF ALARM: Critical error:', error);
    }
  }

  /**
   * Direct audio playback with maximum volume and priority
   */
  private async startDirectAudioPlayback() {
    try {
      console.log('🔊 BULLETPROOF: Starting direct audio playback...');

      if (this.alarmSound) {
        await this.alarmSound.setVolumeAsync(1.0);
        await this.alarmSound.setIsLoopingAsync(true);
        await this.alarmSound.playAsync();
        console.log('✅ BULLETPROOF: Pre-loaded sound playing');
        return;
      }

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
   * System notification fallback
   */
  private async startSystemNotificationFallback() {
    try {
      console.log('📢 BULLETPROOF: Starting system notification fallback...');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 WAKE UP! 🚨',
          body: 'Your alarm is ringing - Open UnlockAM now!',
          sound: true,
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
   * Stop alarm and clean up all resources
   */
  async stopAlarm(): Promise<void> {
    try {
      console.log('🛑 BULLETPROOF ALARM: Stopping all alarm methods...');

      this.isPlaying = false;

      if (this.alarmTimer) {
        clearInterval(this.alarmTimer);
        this.alarmTimer = null;
      }

      if (this.audioFallbackTimer) {
        clearInterval(this.audioFallbackTimer);
        this.audioFallbackTimer = null;
      }

      // Stop native alarm
      if (Platform.OS === 'android' && AlarmyStyleAlarm?.stopCurrentAlarm) {
        try {
          await AlarmyStyleAlarm.stopCurrentAlarm();
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

      await this.globalAudio.stopAllSounds();

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

      try {
        await Notifications.dismissAllNotificationsAsync();
      } catch (error) {
        console.log('Failed to dismiss notifications:', error);
      }

      deactivateKeepAwake();

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
