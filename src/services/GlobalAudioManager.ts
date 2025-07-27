import { Audio } from 'expo-av';

/**
 * Global Audio Manager - Tracks all Audio.Sound instances across the app
 * and provides a nuclear option to stop everything
 */
export class GlobalAudioManager {
  private static instance: GlobalAudioManager;
  private activeSounds: Set<Audio.Sound> = new Set();

  static getInstance(): GlobalAudioManager {
    if (!GlobalAudioManager.instance) {
      GlobalAudioManager.instance = new GlobalAudioManager();
    }
    return GlobalAudioManager.instance;
  }

  // Register a sound instance
  registerSound(sound: Audio.Sound): void {
    this.activeSounds.add(sound);
    console.log(`🎵 Audio registered. Total active sounds: ${this.activeSounds.size}`);
  }

  // Unregister a sound instance
  unregisterSound(sound: Audio.Sound): void {
    this.activeSounds.delete(sound);
    console.log(`🎵 Audio unregistered. Total active sounds: ${this.activeSounds.size}`);
  }

  // Nuclear option: Stop and unload ALL registered sounds
  async stopAllSounds(): Promise<void> {
    console.log(`🚨 GLOBAL AUDIO MANAGER: Stopping ALL ${this.activeSounds.size} active sounds...`);
    
    const soundsToStop = Array.from(this.activeSounds);
    
    for (const sound of soundsToStop) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        this.activeSounds.delete(sound);
        console.log('🎵 Audio sound stopped and unloaded');
      } catch (error) {
        console.log('🎵 Error stopping sound (already stopped?):', error);
        this.activeSounds.delete(sound); // Remove it anyway
      }
    }

    // Clear the set to ensure clean state
    this.activeSounds.clear();
    console.log('🚨 GLOBAL AUDIO MANAGER: All sounds stopped and cleared');
  }

  // Get count of active sounds
  getActiveSoundsCount(): number {
    return this.activeSounds.size;
  }

  // Log all active sounds for debugging
  logActiveSounds(): void {
    console.log(`🎵 Active sounds count: ${this.activeSounds.size}`);
  }
}
