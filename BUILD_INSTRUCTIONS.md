/**
 * Production Alarm System - Build Configuration
 * 
 * This file contains the complete build instructions for the production alarm system.
 * Follow these steps to build and test the alarm functionality.
 */

# 🚀 Production Alarm System - Build & Deploy Guide

## Prerequisites

1. **Development Environment:**
   ```bash
   # Ensure you have these installed:
   - Android Studio (latest)
   - Android SDK 33+ (required for exact alarms)
   - Node.js 18+
   - React Native CLI or Expo CLI
   - Java 11+ (for Android builds)
   ```

2. **Project Dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

## 📱 Android Build Configuration

### 1. Build the Project
```bash
# For development build
npx expo run:android

# For production build (requires EAS)
eas build --platform android --profile production

# Or if using pure React Native:
cd android && ./gradlew assembleRelease
```

### 2. APK Installation
```bash
# Install development APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or for release build
adb install android/app/build/outputs/apk/release/app-release.apk
```

## 🧪 Complete Testing Protocol

### Phase 1: Basic Functionality Test
```bash
# 1. Launch the app
adb shell am start -n com.unlockam/.MainActivity

# 2. Navigate to Production Alarm Test Screen
# 3. Run "30-Second Quick Test"
# 4. Verify alarm rings and UI appears

# Check logs:
adb logcat -s ProductionAlarm:* ReactNativeJS:*
```

### Phase 2: Doze Mode Resistance Test
```bash
# 1. Schedule 2-minute alarm in app
# 2. Lock device screen
# 3. Force Doze mode (for testing):
adb shell dumpsys deviceidle force-idle

# 4. Wait for alarm
# 5. Verify alarm still triggers

# Exit Doze mode:
adb shell dumpsys deviceidle unforce
```

### Phase 3: Permission Testing
```bash
# Test without exact alarm permission:
adb shell pm revoke com.unlockam android.permission.SCHEDULE_EXACT_ALARM
# Run app, verify permission request

# Test with battery optimization:
adb shell dumpsys deviceidle whitelist -com.unlockam
# Verify app requests battery optimization bypass

# Test without overlay permission:
adb shell pm revoke com.unlockam android.permission.SYSTEM_ALERT_WINDOW
# Verify lockscreen UI still works
```

### Phase 4: Audio System Test
```bash
# Test with media volume at 0:
adb shell media volume --stream 3 --set 0

# Test with ringer volume at 0:
adb shell media volume --stream 2 --set 0

# Test with notification volume at 0:
adb shell media volume --stream 5 --set 0

# Alarm should still play through ringtone/alarm stream
```

### Phase 5: Background App Test
```bash
# 1. Schedule alarm
# 2. Open different app:
adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main

# 3. Keep other app in foreground
# 4. Wait for alarm - should interrupt other app
```

## 🔧 Troubleshooting Commands

### Check Alarm Manager Status
```bash
# List scheduled alarms for your app:
adb shell dumpsys alarm | grep com.unlockam

# Check if exact alarms are allowed:
adb shell dumpsys role | grep exact_alarm
```

### Monitor Audio Focus
```bash
# Monitor audio focus changes:
adb logcat -s AudioManager:* AudioService:* AudioFocus:*
```

### Check Wake Lock Usage
```bash
# List active wake locks:
adb shell dumpsys power | grep -A 20 "Wake Locks"

# Check for our alarm wake locks:
adb shell dumpsys power | grep ProductionAlarm
```

### Monitor Foreground Services
```bash
# List running foreground services:
adb shell dumpsys activity services | grep ProductionAlarmService
```

## 📊 Performance Monitoring

### 1. Battery Usage Analysis
```bash
# Check battery stats for your app:
adb shell dumpsys batterystats --charged com.unlockam

# Monitor wake locks and alarms impact:
adb shell dumpsys batterystats | grep com.unlockam
```

### 2. Memory Usage
```bash
# Monitor memory during alarm:
adb shell dumpsys meminfo com.unlockam
```

### 3. CPU Usage
```bash
# Monitor CPU during alarm playback:
adb shell top | grep com.unlockam
```

## 🎯 Success Criteria Checklist

### ✅ Core Functionality
- [ ] Alarm schedules successfully via React Native interface
- [ ] Alarm triggers at exact scheduled time (±5 seconds)
- [ ] Audio plays at maximum volume regardless of device volume
- [ ] Screen wakes up when alarm triggers
- [ ] Full-screen UI appears over lockscreen
- [ ] Snooze and dismiss buttons work correctly

### ✅ Doze Mode Resistance
- [ ] Alarm works when device screen is off for 2+ minutes
- [ ] Alarm works when device is in Doze mode
- [ ] Alarm works when another app is in foreground
- [ ] Alarm works after device reboot (if scheduled before reboot)

### ✅ Permission Handling
- [ ] App requests exact alarm permission on Android 12+
- [ ] App requests battery optimization bypass
- [ ] App requests overlay permission for lockscreen UI
- [ ] App works even if notification permission is denied
- [ ] App provides OEM-specific setup guidance

### ✅ Edge Case Handling
- [ ] Multiple alarms can be scheduled simultaneously
- [ ] Cancelling alarms works correctly
- [ ] App handles low memory situations during alarm
- [ ] Audio continues even if main app is force-closed
- [ ] Service restarts if killed by system

## 🏭 Production Deployment

### 1. Build Configuration
```bash
# Update version in app.json:
{
  "version": "1.0.0",
  "android": {
    "versionCode": 1
  }
}

# Build signed APK:
eas build --platform android --profile production
```

### 2. Play Store Requirements
- Target SDK 33+ (required for Play Store)
- Request only necessary permissions
- Provide permission usage description
- Test on various device manufacturers

### 3. OEM Testing Matrix
Test on devices from these manufacturers:
- Samsung (One UI)
- Xiaomi (MIUI) 
- Huawei (EMUI)
- OPPO (ColorOS)
- Vivo (Funtouch OS)
- Nothing OS
- Stock Android (Pixel)

## 🚨 Critical Notes

1. **Exact Alarms:** Only work on Android 12+ with permission
2. **Battery Optimization:** Must be disabled for reliable alarms
3. **OEM Modifications:** Some manufacturers have additional restrictions
4. **Testing Required:** Always test on physical devices, not just emulator
5. **Foreground Service:** Required for reliable audio playback

## 📞 Support & Debugging

If alarms don't work as expected:

1. Check logcat output for ProductionAlarm tags
2. Verify all permissions are granted
3. Test with OEM-specific battery settings disabled
4. Ensure app is not force-closed by user
5. Verify exact alarm permission on Android 12+

The system is designed to be maximally robust, but Android's power management continues to evolve, requiring ongoing testing and updates.
