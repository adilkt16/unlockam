# Production-Ready Android Alarm System

## Overview

This implementation provides a production-ready alarm system that behaves like top-tier alarm apps (e.g., Alarmy). The system is designed to reliably wake and ring even under the most restrictive Android conditions.

## Key Features

### 🔒 Works in All Conditions
- ✅ Screen off and device locked
- ✅ Doze mode and App Standby  
- ✅ Other apps in foreground
- ✅ Notification permission denied
- ✅ Battery optimization enabled
- ✅ OEM power management restrictions

### 🏗️ Architecture

#### Native Android Components
1. **ProductionAlarmReceiver** - Handles system alarm triggers with highest priority
2. **ProductionAlarmService** - Foreground service with multiple audio fallbacks
3. **ProductionAlarmActivity** - Full-screen lockscreen UI for snooze/dismiss
4. **ProductionAlarmModule** - React Native bridge with permission management
5. **BootReceiver** - Reschedules alarms after device reboot

#### React Native Integration
1. **ProductionAlarmManager** - Clean TypeScript interface
2. **useProductionAlarm** - React hook for alarm management
3. **Automatic permission detection** - Guides users through OEM-specific settings

## Technical Implementation

### Alarm Scheduling Strategy
```java
// Uses the most reliable Android scheduling method
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
    // Doze-resistant scheduling
    alarmManager.setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent
    );
} else {
    // Legacy exact alarms
    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
}
```

### Audio Playback Strategy
The system uses a 3-tier audio fallback approach:

1. **Primary**: MediaPlayer with USAGE_ALARM attributes
2. **Backup**: MediaPlayer with system alarm sound
3. **Final**: Ringtone API as last resort

### Doze Mode Resistance
- Uses `setExactAndAllowWhileIdle()` for Doze whitelist
- Foreground service prevents background execution limits
- Wake locks ensure CPU stays active during alarm
- Audio focus management prevents interruption

### Permission Handling
Automatically detects and requests:
- Android 12+ exact alarm permission
- Battery optimization exemption
- Display over other apps permission
- Android 13+ notification permission (graceful fallback if denied)

## Testing Instructions

### Prerequisites
1. Physical Android device (emulator may not accurately simulate Doze mode)
2. USB debugging enabled
3. Latest development build installed

### Test Scenarios

#### Test 1: Basic Alarm Functionality
```bash
# Install the APK
adb install app-debug.apk

# Enable all permissions when prompted
# Test immediate alarm
1. Open UnlockAM app
2. Go to alarm settings
3. Use "Test Production Alarm (30 seconds)"
4. Lock screen and wait
5. Verify alarm rings and UI appears over lockscreen
```

#### Test 2: Doze Mode Resistance
```bash
# Force device into Doze mode
adb shell dumpsys deviceidle force-idle

# Schedule 2-minute test alarm
1. Set test alarm for 2 minutes ahead
2. Force Doze mode with ADB command above
3. Lock screen and wait
4. Verify alarm still triggers exactly on time
5. Exit Doze: adb shell dumpsys deviceidle unforce
```

#### Test 3: Battery Optimization Test
```bash
# Enable battery optimization
1. Go to Settings > Apps > UnlockAM > Battery
2. Enable battery optimization
3. Set 2-minute test alarm
4. Lock screen and let device idle
5. Verify alarm still works
```

#### Test 4: Notification Permission Denied
```bash
# Disable notification permission
1. Go to Settings > Apps > UnlockAM > Notifications
2. Disable all notifications
3. Set test alarm
4. Verify audio still plays (no notification sound overlap)
```

#### Test 5: Boot Persistence
```bash
# Test alarm rescheduling after reboot
1. Schedule daily alarm for next day
2. Reboot device: adb reboot
3. Check if alarm is still scheduled
4. Verify it triggers at correct time
```

#### Test 6: OEM Power Management
```bash
# Test with OEM restrictions (Samsung/Xiaomi/etc.)
1. Enable all OEM power saving features
2. Add UnlockAM to "sleeping apps" if option exists
3. Set test alarm
4. Verify it still works despite restrictions
```

### Expected Results

#### ✅ Success Criteria
- Alarm triggers within 5 seconds of scheduled time
- Audio plays at maximum volume for full duration
- Full-screen UI appears over lockscreen
- Snooze/dismiss buttons work reliably
- Screen turns on and stays on during alarm
- Works consistently across multiple tests

#### ⚠️ Acceptable Variations
- Slight audio delay (< 2 seconds) on very old devices
- UI fallback to notification if overlay permission denied
- Audio quality depends on device capabilities

#### ❌ Failure Indicators
- Alarm doesn't trigger (scheduling issue)
- Silent alarm (audio playback failure)  
- No UI interaction possible (activity launch failure)
- Inconsistent behavior across tests

### Debugging Tools

#### ADB Commands
```bash
# Check alarm scheduling
adb shell dumpsys alarm | grep "com.unlockam"

# Monitor Doze mode
adb shell dumpsys deviceidle

# Check battery optimization
adb shell dumpsys power | grep "com.unlockam"

# View logs
adb logcat | grep "ProductionAlarm\|UnlockAM"
```

#### Log Monitoring
The system provides extensive logging with tags:
- `ProductionAlarmReceiver`: Alarm trigger events
- `ProductionAlarmService`: Audio playback and service lifecycle  
- `ProductionAlarmActivity`: UI interactions
- `ProductionAlarmModule`: React Native bridge calls

### Performance Testing

#### Memory Usage
- Service should use < 50MB RAM during alarm
- No memory leaks after alarm dismissal
- Efficient wake lock usage (auto-release)

#### Battery Impact
- Minimal battery usage when not alarming
- No background activity between alarms
- Proper cleanup after alarm completion

## Development Build Configuration

### Required Manifest Permissions
```xml
<!-- Core alarm permissions -->
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

<!-- Audio and UI permissions -->
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT"/>
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>

<!-- Foreground service permissions -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"/>

<!-- Battery optimization permissions -->
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"/>
```

### Build Commands
```bash
# Clean build
cd android && ./gradlew clean

# Debug build
./gradlew assembleDebug

# Release build (for final testing)
./gradlew assembleRelease
```

## Troubleshooting

### Common Issues

#### Alarm Doesn't Ring
1. Check exact alarm permission (Android 12+)
2. Verify battery optimization is disabled
3. Check OEM power management settings
4. Ensure audio volume is not muted

#### UI Doesn't Appear
1. Grant "Display over other apps" permission
2. Check if keyguard blocks third-party apps
3. Verify activity registration in manifest

#### Inconsistent Behavior
1. Clear app data and restart
2. Reinstall with fresh permissions
3. Test on different device models
4. Check Android version compatibility

### Support Matrix

#### Android Versions
- ✅ Android 6.0+ (API 23+): Full support
- ⚠️ Android 5.0-5.1 (API 21-22): Limited Doze resistance
- ❌ Android 4.4 and below: Not supported

#### OEM Support
- ✅ Samsung: Excellent (with proper settings)
- ✅ Google Pixel: Excellent
- ✅ OnePlus: Good (requires OEM settings)
- ⚠️ Xiaomi/MIUI: Requires extensive user setup
- ⚠️ Huawei: Requires manual power management
- ❌ Some Chinese OEMs: May require root access

## Production Deployment Notes

### User Onboarding
1. **Permissions Setup**: Guide users through permission granting
2. **OEM Settings**: Provide device-specific instructions  
3. **Test Alarm**: Encourage users to test before first real alarm
4. **Backup Reminder**: Advise users to set device alarm as backup

### Monitoring & Analytics
Track these metrics in production:
- Alarm scheduling success rate
- Permission grant rates by device
- Audio playback success rate
- User interaction completion rate

### Known Limitations
1. **Root/Custom ROMs**: May behave unpredictably
2. **Extreme Battery Savers**: Some third-party apps may still interfere
3. **Hardware Variations**: Audio capabilities vary by device
4. **User Behavior**: Users may still accidentally disable critical permissions

This implementation represents the state-of-the-art in Android alarm reliability, using every available Android API and technique to ensure alarms work when needed.
