# Development Build Setup

This project is configured as an Expo development build, which allows you to use custom native code and third-party libraries that require native configuration.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run start:dev
```

### 3. Build Development Client

#### For Android
```bash
npm run build:dev-android
```

#### For iOS
```bash
npm run build:dev-ios
```

#### For Physical Device (recommended)
```bash
npm run build:dev-device
```

## Available Scripts

- `npm start` - Start development server with dev client
- `npm run start:dev` - Start with cleared cache
- `npm run start:tunnel` - Start with tunnel (for physical devices on different networks)
- `npm run android:dev` - Run on Android emulator/device in debug mode
- `npm run ios:dev` - Run on iOS simulator/device in debug mode
- `npm run build:dev` - Build development client for both platforms
- `npm run build:dev-android` - Build development client for Android only
- `npm run build:dev-ios` - Build development client for iOS only
- `npm run build:dev-device` - Build development client optimized for physical devices

## Development Features

### Enabled Features
- Development client with custom native modules
- Hot reloading and fast refresh
- Debug mode enabled
- React DevTools support
- Network debugging
- Performance monitoring

### Development Environment
- Environment variables loaded from `.env.development`
- Debug notifications enabled
- Development-specific permissions
- Simulator support for iOS
- APK builds for Android (faster development)

## Installation on Device

### Android
1. Build the development APK: `npm run build:dev-android`
2. Download and install the APK on your device
3. Open the app and scan the QR code from `npm run start:dev`

### iOS
1. Build the development client: `npm run build:dev-ios`
2. Install via TestFlight or direct installation
3. Open the app and scan the QR code from `npm run start:dev`

## Debugging

### React DevTools
The development build includes React DevTools integration. You can:
- Inspect component hierarchy
- Monitor state and props
- Profile performance

### Network Debugging
- All network requests are logged in development
- Use Flipper or React Native Debugger for advanced debugging

### Error Handling
- Development builds show detailed error messages
- Source maps are enabled for better stack traces
- Hot reloading helps identify issues quickly

## Environment Variables

Create `.env.development` file for development-specific configuration:
```bash
NODE_ENV=development
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_ENABLE_DEBUG=true
EXPO_PUBLIC_SHOW_DEV_MENU=true
```

## Building for Production

When ready for production:
1. Update version in `app.json`
2. Build using production profile: `eas build --profile production`
3. Submit to app stores: `eas submit`

## Troubleshooting

### Common Issues
1. **Metro bundler issues**: Run `npm run start:dev` to clear cache
2. **Native module issues**: Rebuild development client
3. **Device connection**: Use tunnel mode for network issues

### Reset Development Environment
```bash
npm run prebuild:clean
npm install
npm run start:dev
```
