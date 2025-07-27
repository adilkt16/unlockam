# This directory contains alarm sound files for the UnlockAM app

## Sound Files

- `alarm-tone.mp3` - Main alarm sound (looping beep pattern)
- `success.mp3` - Success sound when puzzle is solved correctly
- `error.mp3` - Error sound when puzzle answer is incorrect

## Usage

These sound files are loaded by the `useAudio.ts` hook. If the files are not present, the app will fallback to:
1. Generated beep tones using data URIs
2. System notification sounds
3. Haptic feedback only

## Adding Custom Sounds

To add custom alarm sounds:
1. Place your audio files in this directory
2. Update the `useAudio.ts` hook to reference your files
3. Ensure files are in MP3 or WAV format for best compatibility

## Sound Requirements

- **Alarm Sound**: Should be loopable and attention-grabbing
- **Success Sound**: Pleasant, brief (1-2 seconds)
- **Error Sound**: Brief, distinctive (0.5-1 second)
- **Format**: MP3 recommended for cross-platform compatibility
- **Volume**: Normalized to prevent distortion
