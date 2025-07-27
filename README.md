# UnlockAM - React Native Mobile App

UnlockAM is a smart alarm app that challenges you with puzzles to help you wake up. This is the React Native version of the web application, built with Expo for cross-platform mobile deployment.

## Features

- 🔐 **Solve to Wake**: Alarms can only be stopped by solving puzzles
- 🧮 **Math Puzzles**: Addition, subtraction, multiplication, and division
- 🎯 **Pattern Puzzles**: Visual pattern matching challenges
- ⏰ **Customizable Alarm Window**: Set start and end times for alarm periods
- 📱 **Native Notifications**: Push notifications that work even when app is closed
- 🎵 **Audio & Haptics**: Sound and vibration feedback
- 📊 **Statistics**: Track your solving performance
- ⚙️ **Configurable Settings**: Adjust difficulty, puzzle types, and preferences

## Tech Stack

- **React Native** with Expo SDK 53
- **TypeScript** for type safety
- **React Navigation** for navigation
- **AsyncStorage** for local data persistence
- **Expo Notifications** for alarm scheduling
- **Expo AV** for audio playback
- **Expo Haptics** for vibration feedback

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AlarmModal.tsx   # Puzzle-solving modal during alarms
│   ├── TimePickerModal.tsx  # Time selection interface
│   └── TimeSettingsCard.tsx # Alarm configuration card
├── screens/             # Main app screens
│   ├── HomeScreen.tsx   # Main dashboard
│   └── SettingsScreen.tsx # App configuration
├── hooks/               # Custom React hooks
│   └── useAudio.ts      # Audio and haptics management
├── services/            # Business logic services
│   └── AlarmService.ts  # Notification and alarm scheduling
├── utils/               # Utility functions
│   └── puzzleGenerator.ts # Math and pattern puzzle generation
└── App.tsx             # Main app component with navigation
```

## Installation & Setup

1. **Prerequisites**:
   - Node.js (18+)
   - Expo CLI (`npm install -g @expo/cli`)
   - Expo Go app on your mobile device

2. **Install Dependencies**:
   ```bash
   cd unlockam_expo
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm start
   ```

4. **Run on Device**:
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `w` to open web version
   - Or press `a` for Android emulator / `i` for iOS simulator

## Key Components

### AlarmService
Handles push notifications and alarm scheduling using Expo Notifications. Supports:
- Scheduling alarms for specific times
- Cross-day alarm scheduling
- Permission management
- Notification payload with alarm data

### Puzzle System
Two types of brain puzzles:
- **Math Puzzles**: Configurable difficulty with basic arithmetic
- **Pattern Puzzles**: 4x4 grid pattern matching with visual feedback

### Audio & Haptics
Native mobile feedback using:
- Expo AV for sound playback
- Expo Haptics for vibration patterns
- Different feedback for correct/incorrect answers

## Configuration

### Alarm Settings
- **Start Time**: When alarms begin triggering
- **End Time**: When alarms stop triggering
- **Puzzle Type**: Math or Pattern puzzles
- **Difficulty**: Easy, Medium, or Hard

### App Settings
- Sound enable/disable
- Vibration enable/disable
- Statistics reset
- Persistent storage of preferences

## Development Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator (macOS only)
- `npm run web` - Run web version
- `npm run doctor` - Diagnose project issues

## Building for Production

1. **Configure app.json** with your bundle identifiers
2. **Build for stores**:
   ```bash
   expo build:android  # For Google Play Store
   expo build:ios      # For Apple App Store
   ```

## Migration from Web App

This React Native app maintains feature parity with the original web application while adding mobile-specific enhancements:

### Web → React Native Mappings
- **React Router** → **React Navigation**
- **localStorage** → **AsyncStorage**
- **CSS/Tailwind** → **StyleSheet**
- **Web Audio API** → **Expo AV**
- **Browser notifications** → **Expo Notifications**
- **HTML DOM** → **React Native components**

### Mobile Enhancements
- Native push notifications that work when app is closed
- Haptic feedback for better mobile UX
- Optimized touch interfaces
- Native time pickers
- Mobile-first responsive design

## Permissions Required

- **Notifications**: For alarm scheduling
- **Vibration**: For haptic feedback
- **Audio**: For alarm sounds

## Troubleshooting

### Common Issues

1. **Notifications not working**:
   - Check device notification permissions
   - Ensure app has background app refresh enabled
   - Test on physical device (notifications limited in simulators)

2. **Audio not playing**:
   - Check device volume and silent mode
   - Verify Expo AV permissions
   - Test with different audio files

3. **Development server issues**:
   - Run `expo doctor` to diagnose
   - Clear Metro cache: `expo start --clear`
   - Restart development server

## Future Enhancements

- [ ] Custom alarm sounds
- [ ] Multiple alarm support
- [ ] Social features and leaderboards
- [ ] Advanced puzzle types
- [ ] Sleep tracking integration
- [ ] Widget support

## License

MIT License - See original web application for details.
