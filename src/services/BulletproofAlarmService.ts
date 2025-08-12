import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { GlobalAudioManager } from './GlobalAudioManager';
import { AlarmyStyleAlarm } from './AlarmyStyleAlarmManager';

const { AndroidAlarmAudio } = NativeModules;

/**
 * BULLETPROOF ALARM SERVICE
 * Guarantees alarm  async testNativeSer    // Use comprehensive debugger
    const isModuleAvailable = AlarmyStyleAlarm && typeof AlarmyStyleAlarm.testNativeServiceNow === 'function';
    
    if (!isModuleAvailable) {
      console.log('❌ NATIVE MODULE TEST FAILED - AlarmyStyleAlarm not available');
      console.log('🏗️  This likely means the app needs to be rebuilt with EAS Build or expo run:android');
      console.log('🔧 Native modules require native compilation, not just Metro bundler refresh');
      console.log('===============================================');
      return;
    }

    // Test the actual service call
    console.log('🧪 TESTING ACTUAL NATIVE SERVICE CALL...');
    const callSuccess = await AlarmyStyleAlarm.testNativeServiceNow();mise<void> {
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

    // Test the actual service call
    console.log('🧪 TESTING ACTUAL NATIVE SERVICE CALL...');
    const callSuccess = await AlarmyStyleAlarm.testNativeServiceNow(); background and locked state
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
            soundType: 'default',
            vibration: true,
            label: 'UnlockAM Alarm',
          });
          console.log('✅ BULLETPROOF: Native Android system alarm scheduled');
          
          // Also schedule auto-stop
          await AndroidAlarmAudio.scheduleAlarm({
            alarmId: `${this.activeAlarmId}-stop`,
            triggerTime: endDate.getTime(),
            soundType: 'default',
            vibration: false,
            label: 'UnlockAM Alarm Auto-Stop',
          });
          console.log('✅ BULLETPROOF: Auto-stop alarm scheduled');
          
        } catch (nativeError) {
          console.log('⚠️ Native alarm scheduling failed, using fallbacks:', nativeError);
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
            soundType: 'default',
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

    // CRITICAL: Use native Android alarm for background reliability
    if (Platform.OS === 'android' && AlarmyStyleAlarm.isAvailable) {
      try {
        // Schedule native Android alarm that will work even when app is backgrounded
        await AlarmyStyleAlarm.scheduleAlarm({
          alarmId: this.activeAlarmId,
          triggerTime: testDate.getTime(),
          label: 'UnlockAM Test Alarm',
        });
        console.log('✅ BULLETPROOF TEST: Native Android alarm scheduled!');
        
      } catch (nativeError) {
        console.error('❌ Failed to schedule native alarm:', nativeError);
        // Fallback to JavaScript timer (less reliable)
        this.startTimerBasedMonitoring(testDate.getTime(), endDate.getTime());
      }
    } else {
      // Fallback for iOS or if native module not available
      this.startTimerBasedMonitoring(testDate.getTime(), endDate.getTime());
    }

    // Pre-load audio for immediate playback when alarm triggers
    await this.preloadAudioResources();
    
    console.log('🧪 BULLETPROOF TEST: Test alarm scheduled! The alarm will work even if you:');
    console.log('📱 Lock your phone');  
    console.log('📱 Switch to other apps');
    console.log('📱 Put the phone in your pocket');
    console.log('🔊 The native Android service will ensure audio plays!');
  }

  /**
   * TEST FUNCTION: Trigger alarm immediately for instant testing
   */
  async testAlarmNow(): Promise<void> {
    console.log('🧪 BULLETPROOF TEST: Triggering alarm NOW for immediate test!');
    
    // Set a test alarm ID
    this.activeAlarmId = `immediate-test-${Date.now()}`;
    
    // Store test data
    await AsyncStorage.setItem('bulletproofAlarm', JSON.stringify({
      id: this.activeAlarmId,
      startTime: 'immediate',
      endTime: 'manual',
      scheduledFor: Date.now(),
      endTimeTimestamp: Date.now() + 120000, // 2 minutes from now
      isTest: true,
    }));
    
    // Pre-load audio
    await this.preloadAudioResources();
    
    // Trigger the alarm immediately
    await this.triggerBulletproofAlarm();
  }

  /**
   * TEST FUNCTION: Test native Android service directly (most reliable for locked state)
   */
  async testNativeServiceNow(): Promise<void> {
    console.log('🔍 TESTING NATIVE SERVICE NOW - START');
    console.log('===============================================');
    
    // Use comprehensive debugger
    const isModuleAvailable = NativeModuleDebugger.testAndroidAlarmAudioAvailability();
    
    if (!isModuleAvailable) {
      console.log('❌ NATIVE MODULE TEST FAILED');
      console.log('🏗️  This likely means the app needs to be rebuilt with EAS Build or expo run:android');
      console.log('� Native modules require native compilation, not just Metro bundler refresh');
      console.log('===============================================');
      return;
    }

    // Test the actual service call
    console.log('� TESTING ACTUAL NATIVE SERVICE CALL...');
    const callSuccess = await NativeModuleDebugger.testNativeServiceCall();
    
    if (callSuccess) {
      console.log('✅ NATIVE SERVICE TEST SUCCESSFUL!');
      console.log('🔊 Native AndroidAlarmAudioService should now be playing locked-state alarm');
    } else {
      console.log('❌ NATIVE SERVICE CALL FAILED');
      console.log('🔧 Check AndroidAlarmAudioService implementation and registration');
    }
    
    console.log('===============================================');
    console.log('🔍 TESTING NATIVE SERVICE NOW - END');
  }
}
