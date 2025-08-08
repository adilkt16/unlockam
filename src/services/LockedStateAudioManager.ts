import { Audio } from 'expo-av';
import { Platform, NativeModules } from 'react-native';
import { GlobalAudioManager } from '../services/GlobalAudioManager';

const { AndroidAlarmAudio } = NativeModules;

interface AudioConfig {
  soundType: 'beep' | 'chime' | 'alert' | 'custom';
  volume?: number;
  loop?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'max';
  category?: 'alarm' | 'notification' | 'media';
}

export class LockedStateAudioManager {
  private static instance: LockedStateAudioManager;
  private globalAudioManager: GlobalAudioManager;
  private currentSound: Audio.Sound | null = null;
  private isPlaying = false;

  private constructor() {
    this.globalAudioManager = GlobalAudioManager.getInstance();
    this.initializeAudio();
  }

  public static getInstance(): LockedStateAudioManager {
    if (!LockedStateAudioManager.instance) {
      LockedStateAudioManager.instance = new LockedStateAudioManager();
    }
    return LockedStateAudioManager.instance;
  }

  private async initializeAudio() {
    try {
      // Set audio mode for alarm playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      console.log('LockedStateAudioManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LockedStateAudioManager:', error);
    }
  }

  public async playAlarmSound(config: AudioConfig): Promise<boolean> {
    try {
      console.log('Playing alarm sound with config:', config);

      // Stop any currently playing sound first
      await this.stopAlarmSound();

      // Method 1: Try native Android implementation first (highest reliability)
      if (Platform.OS === 'android' && AndroidAlarmAudio) {
        try {
          const success = await AndroidAlarmAudio.playLockedStateAlarm({
            alarmId: 'locked_state_alarm',
            soundType: config.soundType,
            volume: config.volume || 1.0,
            vibration: true,
            showOverLockscreen: true,
            wakeScreen: true,
          });

          if (success) {
            this.isPlaying = true;
            console.log('Native Android alarm started successfully');
            return true;
          }
        } catch (nativeError) {
          console.warn('Native Android alarm failed, falling back:', nativeError);
        }
      }

      // Method 2: Fallback to expo-av with locked-state optimizations
      try {
        const soundUri = this.getSoundUri(config.soundType);
        const { sound } = await Audio.Sound.createAsync(soundUri, {
          shouldPlay: true,
          isLooping: config.loop !== false,
          volume: config.volume || 1.0,
        });

        this.currentSound = sound;
        this.globalAudioManager.registerSound(sound);

        // Configure for maximum priority and locked-state playback
        await sound.setStatusAsync({
          shouldPlay: true,
          volume: config.volume || 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
          isLooping: config.loop !== false,
        });

        this.isPlaying = true;
        console.log('Expo-av alarm started successfully');
        return true;

      } catch (expoError) {
        console.warn('Expo-av alarm failed:', expoError);
      }

      // Method 3: Last resort - basic audio playback
      try {
        await this.playBasicAlarmSound(config);
        return true;
      } catch (basicError) {
        console.error('All alarm playback methods failed:', basicError);
        return false;
      }

    } catch (error) {
      console.error('Critical error in playAlarmSound:', error);
      return false;
    }
  }

  private async playBasicAlarmSound(config: AudioConfig): Promise<void> {
    console.log('Playing basic alarm sound as last resort');
    
    // Use the existing alarm sound from assets
    const soundUri = require('../../assets/alarm-sound.wav');
    
    const { sound } = await Audio.Sound.createAsync(soundUri, {
      shouldPlay: true,
      isLooping: true,
      volume: config.volume || 1.0,
    });

    this.currentSound = sound;
    this.globalAudioManager.registerSound(sound);
    this.isPlaying = true;
  }

  public async stopAlarmSound(): Promise<boolean> {
    try {
      console.log('Stopping alarm sound');

      // Stop native Android alarm if active
      if (Platform.OS === 'android' && AndroidAlarmAudio) {
        try {
          await AndroidAlarmAudio.stopAlarm('locked_state_alarm');
        } catch (error) {
          console.warn('Failed to stop native alarm:', error);
        }
      }

      // Stop expo-av sound
      if (this.currentSound) {
        try {
          await this.currentSound.stopAsync();
          await this.currentSound.unloadAsync();
          this.globalAudioManager.unregisterSound(this.currentSound);
        } catch (error) {
          console.warn('Failed to stop expo-av sound:', error);
        }
        this.currentSound = null;
      }

      // Fallback: stop all sounds globally
      await this.globalAudioManager.stopAllSounds();

      this.isPlaying = false;
      console.log('Alarm sound stopped successfully');
      return true;

    } catch (error) {
      console.error('Error stopping alarm sound:', error);
      return false;
    }
  }

  public async testAlarmPlayback(): Promise<boolean> {
    console.log('Testing alarm playback...');
    
    try {
      // Play test alarm for 3 seconds
      const success = await this.playAlarmSound({
        soundType: 'alert',
        volume: 0.5,
        loop: false,
      });

      if (success) {
        // Stop after 3 seconds
        setTimeout(async () => {
          await this.stopAlarmSound();
        }, 3000);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Alarm playback test failed:', error);
      return false;
    }
  }

  private getSoundUri(soundType: string) {
    // Map sound types to actual audio files
    const soundMap: {[key: string]: any} = {
      'beep': require('../../assets/alarm-sound.wav'),
      'chime': require('../../assets/alarm-sound.wav'), 
      'alert': require('../../assets/alarm-sound.wav'),
      'custom': require('../../assets/alarm-sound.wav'),
    };

    return soundMap[soundType] || soundMap['alert'];
  }

  public get isAlarmPlaying(): boolean {
    return this.isPlaying;
  }

  public async getVolume(): Promise<number> {
    if (this.currentSound) {
      try {
        const status = await this.currentSound.getStatusAsync();
        return status.isLoaded ? status.volume || 0 : 0;
      } catch (error) {
        console.warn('Failed to get volume:', error);
      }
    }
    return 0;
  }

  public async setVolume(volume: number): Promise<boolean> {
    if (this.currentSound) {
      try {
        await this.currentSound.setVolumeAsync(volume);
        return true;
      } catch (error) {
        console.warn('Failed to set volume:', error);
      }
    }
    return false;
  }

  public async ensureAlarmReliability(): Promise<boolean> {
    console.log('Ensuring alarm reliability...');
    
    try {
      const testResults = {
        nativeModule: false,
        expoAv: false,
        basicAudio: false,
      };

      // Test native module
      if (Platform.OS === 'android' && AndroidAlarmAudio) {
        try {
          await AndroidAlarmAudio.testAlarmPlayback();
          testResults.nativeModule = true;
        } catch (error) {
          console.warn('Native module test failed:', error);
        }
      }

      // Test expo-av
      try {
        await this.testAlarmPlayback();
        testResults.expoAv = true;
      } catch (error) {
        console.warn('Expo-av test failed:', error);
      }

      // Test basic audio
      try {
        const soundUri = require('../../assets/alarm-sound.wav');
        const { sound } = await Audio.Sound.createAsync(soundUri);
        await sound.unloadAsync();
        testResults.basicAudio = true;
      } catch (error) {
        console.warn('Basic audio test failed:', error);
      }

      const successCount = Object.values(testResults).filter(Boolean).length;
      const totalTests = Object.keys(testResults).length;
      
      console.log(`Alarm reliability: ${successCount}/${totalTests} methods working`);
      console.log('Test results:', testResults);
      
      return successCount > 0;

    } catch (error) {
      console.error('Alarm reliability check failed:', error);
      return false;
    }
  }
}
