import { Audio } from "expo-av";

// Simplified alarm sound generator for single alarm sound
export class AlarmSoundGenerator {
  
  // Single alarm type
  static readonly ALARM_TYPES = {
    DEFAULT: "default",
  } as const;

  // Generate alarm tone - always returns the same sound file reference
  static generateAlarmTone(type: string = AlarmSoundGenerator.ALARM_TYPES.DEFAULT): any {
    // Return reference to our single alarm sound file
    return require("../../assets/sounds/alarm-sound.wav");
  }

  // Create alarm sound instance
  static async createComplexAlarmTone(type: string = AlarmSoundGenerator.ALARM_TYPES.DEFAULT): Promise<Audio.Sound | null> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/alarm-sound.wav"),
        {
          shouldPlay: false,
          isLooping: true,
          volume: 1.0,
        }
      );
      console.log("Successfully created alarm sound");
      return sound;
    } catch (error) {
      console.error("Failed to create alarm sound:", error);
      return null;
    }
  }

  // Get display name - always the same since we only have one
  static getAlarmTypeDisplayName(type: string): string {
    return "Alarm Sound";
  }

  // Get all available alarm types - only one option
  static getAllAlarmTypes(): Array<{ value: string; label: string }> {
    return [
      { value: AlarmSoundGenerator.ALARM_TYPES.DEFAULT, label: "Alarm Sound" },
    ];
  }
}
