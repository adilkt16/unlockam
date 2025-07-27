import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlarmSoundGenerator } from '../utils/soundGenerator';
import { GlobalAudioManager } from '../services/GlobalAudioManager';

export function useAudio() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const globalAudio = GlobalAudioManager.getInstance();

  const initAudio = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }, []);

  // Get the selected alarm sound type from settings
  const getSelectedAlarmType = useCallback(async (): Promise<string> => {
    try {
      const savedAlarmSound = await AsyncStorage.getItem('alarmSoundType');
      return savedAlarmSound || AlarmSoundGenerator.ALARM_TYPES.CLASSIC;
    } catch (error) {
      console.error('Failed to get alarm sound type:', error);
      return AlarmSoundGenerator.ALARM_TYPES.CLASSIC;
    }
  }, []);

  // Create alarm tone using multiple approaches
  const createAlarmTone = useCallback(async () => {
    try {
      const alarmType = await getSelectedAlarmType();
      console.log(`Using ${AlarmSoundGenerator.getAlarmTypeDisplayName(alarmType)} alarm sound`);
      return await AlarmSoundGenerator.createComplexAlarmTone(alarmType);
    } catch (error) {
      console.error('Failed to create alarm tone:', error);
      return null;
    }
  }, [getSelectedAlarmType]);

  const playAlarm = useCallback(async () => {
    if (isPlayingRef.current) return;

    try {
      const audioInitialized = await initAudio();
      if (!audioInitialized) return;

      // Stop any existing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Create and play alarm sound
      const alarmSound = await createAlarmTone();
      if (alarmSound) {
        soundRef.current = alarmSound;
        globalAudio.registerSound(alarmSound);
        await alarmSound.playAsync();
        isPlayingRef.current = true;
        console.log('Alarm sound started playing');
      } else {
        console.log('No alarm sound available, using haptic feedback only');
      }

      // Add initial haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Continue vibrating every 2 seconds while alarm is active
      vibrationIntervalRef.current = setInterval(async () => {
        if (isPlayingRef.current) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          
          // Ensure sound keeps playing
          if (soundRef.current) {
            try {
              const status = await soundRef.current.getStatusAsync();
              if (status.isLoaded && !status.isPlaying) {
                await soundRef.current.replayAsync();
                console.log('Restarted alarm sound');
              }
            } catch (statusError) {
              console.error('Error checking sound status:', statusError);
            }
          }
        } else {
          if (vibrationIntervalRef.current) {
            clearInterval(vibrationIntervalRef.current);
            vibrationIntervalRef.current = null;
          }
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to play alarm:', error);
    }
  }, [initAudio, createAlarmTone]);

  const stopAlarm = useCallback(async () => {
    if (!isPlayingRef.current) return;

    try {
      // Clear vibration interval
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }

      // Stop and unload sound
      if (soundRef.current) {
        globalAudio.unregisterSound(soundRef.current);
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        console.log('Alarm sound stopped');
      }
      
      isPlayingRef.current = false;
    } catch (error) {
      console.error('Failed to stop alarm:', error);
    }
  }, []);

  const playCorrectSound = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Play a success sound using generated tone since audio files are not available
      try {
        console.log('Success sound file not found, using generated success sound');
        const { sound } = await Audio.Sound.createAsync(
          { uri: AlarmSoundGenerator.generateSuccessSound() },
          { shouldPlay: true, volume: 0.7 }
        );
        
        globalAudio.registerSound(sound);
        
        // Auto-unload after playing
        setTimeout(async () => {
          try {
            globalAudio.unregisterSound(sound);
            await sound.unloadAsync();
          } catch (e) {
            // Ignore unload errors
          }
        }, 2000);
      } catch (error) {
        // If success sound file doesn't exist, create a pleasant beep
        console.log('Success sound file not found, using generated success sound');
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: AlarmSoundGenerator.generateSuccessSound() },
            { shouldPlay: true, volume: 0.5 }
          );
          setTimeout(async () => {
            try {
              await sound.unloadAsync();
            } catch (e) {
              // Ignore
            }
          }, 1000);
        } catch (beepError) {
          console.log('Generated success sound also failed, using haptic only');
        }
      }
    } catch (error) {
      console.error('Failed to play correct sound:', error);
    }
  }, []);

  const playIncorrectSound = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Play an error sound using generated tone since audio files are not available
      try {
        console.log('Error sound file not found, using generated error sound');
        const { sound } = await Audio.Sound.createAsync(
          { uri: AlarmSoundGenerator.generateErrorSound() },
          { shouldPlay: true, volume: 0.7 }
        );
        
        globalAudio.registerSound(sound);
        
        // Auto-unload after playing
        setTimeout(async () => {
          try {
            globalAudio.unregisterSound(sound);
            await sound.unloadAsync();
          } catch (e) {
            // Ignore unload errors
          }
        }, 2000);
      } catch (error) {
        console.log('Error sound file not found, using generated error sound');
        // Create a harsh beep for error
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: AlarmSoundGenerator.generateErrorSound() },
            { shouldPlay: true, volume: 0.8 }
          );
          setTimeout(async () => {
            try {
              await sound.unloadAsync();
            } catch (e) {
              // Ignore
            }
          }, 500);
        } catch (beepError) {
          console.log('Generated error sound also failed, using haptic only');
        }
      }
    } catch (error) {
      console.error('Failed to play incorrect sound:', error);
    }
  }, []);

  const testAlarmSound = useCallback(async (alarmType?: string) => {
    // Test function to preview alarm sound for 3 seconds
    try {
      const audioInitialized = await initAudio();
      if (!audioInitialized) return;

      const typeToTest = alarmType || await getSelectedAlarmType();
      const alarmSound = await AlarmSoundGenerator.createComplexAlarmTone(typeToTest);
      if (alarmSound) {
        await alarmSound.playAsync();
        console.log(`Testing ${AlarmSoundGenerator.getAlarmTypeDisplayName(typeToTest)} alarm sound for 3 seconds...`);
        
        // Stop after 3 seconds
        setTimeout(async () => {
          try {
            await alarmSound.stopAsync();
            await alarmSound.unloadAsync();
            console.log('Alarm sound test completed');
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 3000);
      } else {
        console.log('No alarm sound available to test');
      }
    } catch (error) {
      console.error('Failed to test alarm sound:', error);
    }
  }, [initAudio, getSelectedAlarmType]);

  return {
    playAlarm,
    stopAlarm,
    playCorrectSound,
    playIncorrectSound,
    testAlarmSound,
    isPlaying: isPlayingRef.current,
  };
}
