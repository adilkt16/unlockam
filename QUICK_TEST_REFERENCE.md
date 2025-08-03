# 🚀 Quick Testing Reference

## Force Testing Mode ✅

**CURRENT STATUS: Force mode is ENABLED**

The OnboardingFlow is now set to **force notification permission dialog** regardless of stored values.

Look for this in `OnboardingFlow.tsx`:
```typescript
const FORCE_NOTIFICATION_DIALOG = true; // Set to false after testing
```

## Reset for Testing (Alternative Method)

If you want to use the normal flow instead of force mode, set `FORCE_NOTIFICATION_DIALOG = false` and then add these lines temporarily to `OnboardingFlow.tsx` in `checkOnboardingStatus()`:

```typescript
// FOR TESTING: Uncomment to reset and see the complete flow
// await AsyncStorage.removeItem('onboardingComplete');
// await AsyncStorage.removeItem('notificationPermissionHandled');
// await AsyncStorage.removeItem('dooaPermissionHandled');
```

## Expected Flow 

```
1. App Launch
2. 📱 Native Android notification dialog appears
   → "Allow UnlockAM to send notifications?"
   → Options: "Allow" / "Don't allow"
3. 🖥️ Custom DOOA permission dialog appears
   → Your existing UI with "Open Settings" button
4. ✅ Onboarding complete
```

## Console Logs to Look For

```
🔍 OnboardingFlow: 🚨 STARTING WITH NOTIFICATION PERMISSION REQUEST 🚨
📱 OnboardingFlow: 🚨🚨 TRIGGERING NATIVE ANDROID NOTIFICATION PERMISSION DIALOG 🚨🚨
🎉 OnboardingFlow: ✅ USER GRANTED NOTIFICATION PERMISSION! ✅
📱 OnboardingFlow: 🔄 Moving to DOOA permission step...
```

## Test Commands (in Metro console)

```javascript
// Import test utils
import { OnboardingTestUtils } from './src/utils/OnboardingTestUtils';

// Reset everything
OnboardingTestUtils.resetOnboardingFlow()

// Check current status
OnboardingTestUtils.getOnboardingStatus()

// Test only notification dialog
OnboardingTestUtils.resetOnboardingFlow().then(() => 
  OnboardingTestUtils.setDooaHandled()
)

// Test only DOOA dialog
OnboardingTestUtils.resetOnboardingFlow().then(() => 
  OnboardingTestUtils.setNotificationHandled()
)
```

## Android Version Notes

- **Android 13+**: Shows native notification permission dialog
- **Android 12-**: Permission auto-granted, skips to DOOA
- **Different brands**: Dialog appearance may vary slightly

## Troubleshooting

### ✅ **Notification Permission Issue - SOLVED**
The notification permission dialog is now working correctly!

### 🧩 **Puzzle Spam Issue - FIXED**
If you experience notification/interference spam during puzzle solving:

**CURRENT STATUS: Alarm monitoring is temporarily disabled in App.tsx**

Look for this in `App.tsx` around line 82:
```typescript
// TEMPORARY: Disable alarm monitoring to test if it's causing puzzle interference
console.log('⚠️ ALARM MONITORING TEMPORARILY DISABLED FOR PUZZLE TESTING');
return;
```

**To re-enable after testing:** Comment out the `return;` line.

### Other Issues:

1. **Dialog not showing?**
   - Clear app data on device
   - Test on physical device (not emulator)
   - Check Android version (must be 13+)

2. **Permission already granted?**
   - Settings → Apps → UnlockAM → Permissions → Revoke notifications
   - Clear app data
   - Restart app

3. **Flow stuck?**
   - Check console for errors
   - Use test utils to reset state
   - Restart Metro bundler
