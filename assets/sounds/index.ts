// This is a placeholder audio file reference
// In a real implementation, you would place actual MP3 files here

export const AUDIO_FILES = {
  ALARM_TONE: require('./alarm-tone.mp3'),
  SUCCESS: require('./success.mp3'),
  ERROR: require('./error.mp3'),
};

// Fallback: if audio files don't exist, the app will use generated sounds
// See ../utils/soundGenerator.ts for programmatic sound generation
