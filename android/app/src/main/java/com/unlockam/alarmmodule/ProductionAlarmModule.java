package com.unlockam.alarmmodule;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.content.pm.PackageManager;
import android.os.PowerManager;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import android.util.Log;

/**
 * Production-ready alarm module for React Native.
 * 
 * This module provides a reliable interface for scheduling alarms that work
 * under all Android constraints including Doze mode and battery optimizations.
 * 
 * Key features:
 * 1. Uses AlarmManager.setExactAndAllowWhileIdle for Doze-resistant alarms
 * 2. Proper permission handling for Android 12+ exact alarms
 * 3. Battery optimization detection and guidance
 * 4. Fallback mechanisms for different Android versions
 */
public class ProductionAlarmModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "ProductionAlarmModule";
    private static final String MODULE_NAME = "ProductionAlarm";
    
    private ReactApplicationContext reactContext;
    private AlarmManager alarmManager;

    public ProductionAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Schedule an exact alarm that works even in Doze mode
     */
    @ReactMethod
    public void scheduleExactAlarm(ReadableMap options, Promise promise) {
        try {
            String alarmId = options.getString("alarmId");
            double triggerTimeMs = options.getDouble("triggerTime");
            String soundType = options.hasKey("soundType") ? options.getString("soundType") : "default";
            boolean vibration = options.hasKey("vibration") ? options.getBoolean("vibration") : true;
            String label = options.hasKey("label") ? options.getString("label") : "Alarm";
            
            Log.d(TAG, "📅 Scheduling exact alarm: " + alarmId + " at " + triggerTimeMs);
            
            // Check if we can schedule exact alarms
            if (!canScheduleExactAlarms()) {
                promise.reject("PERMISSION_REQUIRED", "Exact alarm permission required for Android 12+");
                return;
            }
            
            // Create intent for our production receiver
            Intent alarmIntent = new Intent(reactContext, ProductionAlarmReceiver.class);
            alarmIntent.setAction("com.unlockam.ALARM_TRIGGER");
            alarmIntent.putExtra("alarmId", alarmId);
            alarmIntent.putExtra("soundType", soundType);
            alarmIntent.putExtra("vibration", vibration);
            alarmIntent.putExtra("label", label);
            
            // Create unique pending intent
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                alarmId.hashCode(), // Use hashCode for consistent ID
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Schedule the exact alarm with Doze whitelist
            long triggerTime = (long) triggerTimeMs;
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Android 6+ - Use setExactAndAllowWhileIdle for Doze resistance
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
                Log.d(TAG, "✅ Exact alarm scheduled with Doze whitelist (API 23+)");
            } else {
                // Legacy Android - Use setExact
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
                Log.d(TAG, "✅ Exact alarm scheduled (Legacy API)");
            }
            
            // Return success with details
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("alarmId", alarmId);
            result.putDouble("scheduledFor", triggerTime);
            result.putString("method", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? "setExactAndAllowWhileIdle" : "setExact");
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to schedule exact alarm", e);
            promise.reject("SCHEDULE_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Cancel a scheduled alarm
     */
    @ReactMethod
    public void cancelAlarm(String alarmId, Promise promise) {
        try {
            Log.d(TAG, "🗑️ Cancelling alarm: " + alarmId);
            
            // Create matching intent
            Intent alarmIntent = new Intent(reactContext, ProductionAlarmReceiver.class);
            alarmIntent.setAction("com.unlockam.ALARM_TRIGGER");
            alarmIntent.putExtra("alarmId", alarmId);
            
            // Create matching pending intent
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                alarmId.hashCode(),
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Cancel the alarm
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            
            Log.d(TAG, "✅ Alarm cancelled successfully: " + alarmId);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("alarmId", alarmId);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to cancel alarm", e);
            promise.reject("CANCEL_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Stop a currently playing alarm
     */
    @ReactMethod
    public void stopAlarm(String alarmId, Promise promise) {
        try {
            Log.d(TAG, "🛑 Stopping alarm: " + alarmId);
            
            // Send stop command to service
            Intent stopIntent = new Intent(reactContext, ProductionAlarmService.class);
            stopIntent.setAction("STOP_ALARM");
            stopIntent.putExtra("alarmId", alarmId);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(stopIntent);
            } else {
                reactContext.startService(stopIntent);
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("alarmId", alarmId);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to stop alarm", e);
            promise.reject("STOP_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Check alarm and permission status
     */
    @ReactMethod
    public void getAlarmStatus(Promise promise) {
        try {
            WritableMap status = Arguments.createMap();
            
            // Check exact alarm permission (Android 12+)
            status.putBoolean("canScheduleExactAlarms", canScheduleExactAlarms());
            
            // Check battery optimization status
            status.putBoolean("isBatteryOptimized", isBatteryOptimized());
            
            // Check if app can show over other apps
            status.putBoolean("canShowOverOtherApps", canShowOverOtherApps());
            
            // Check notification permission (Android 13+)
            status.putBoolean("hasNotificationPermission", hasNotificationPermission());
            
            // Check if device supports exact alarms
            status.putBoolean("supportsExactAlarms", alarmManager != null);
            
            // Get Android version info
            status.putInt("sdkVersion", Build.VERSION.SDK_INT);
            status.putString("deviceManufacturer", Build.MANUFACTURER);
            status.putString("deviceModel", Build.MODEL);
            
            promise.resolve(status);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to get alarm status", e);
            promise.reject("STATUS_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Request exact alarm permission (Android 12+)
     */
    @ReactMethod
    public void requestExactAlarmPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    // Open exact alarm permission settings
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                    
                    promise.resolve("Permission request opened");
                } else {
                    promise.resolve("Permission already granted");
                }
            } else {
                promise.resolve("Not required for this Android version");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to request exact alarm permission", e);
            promise.reject("PERMISSION_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Request to ignore battery optimizations
     */
    @ReactMethod
    public void requestIgnoreBatteryOptimization(Promise promise) {
        try {
            if (isBatteryOptimized()) {
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                
                promise.resolve("Battery optimization settings opened");
            } else {
                promise.resolve("Battery optimization already ignored");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to request battery optimization", e);
            promise.reject("BATTERY_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Open overlay permission settings
     */
    @ReactMethod
    public void requestOverlayPermission(Promise promise) {
        try {
            if (!canShowOverOtherApps()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                
                promise.resolve("Overlay permission settings opened");
            } else {
                promise.resolve("Overlay permission already granted");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to request overlay permission", e);
            promise.reject("OVERLAY_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Get OEM-specific battery settings guidance
     */
    @ReactMethod
    public void getOEMBatteryGuidance(Promise promise) {
        try {
            WritableMap guidance = Arguments.createMap();
            String manufacturer = Build.MANUFACTURER.toLowerCase();
            
            guidance.putString("manufacturer", Build.MANUFACTURER);
            guidance.putString("model", Build.MODEL);
            
            switch (manufacturer) {
                case "samsung":
                    guidance.putString("title", "Samsung Battery Settings");
                    guidance.putString("instructions", 
                        "1. Go to Settings > Device Care > Battery\n" +
                        "2. Tap 'App Power Management'\n" +
                        "3. Find UnlockAM and disable optimization\n" +
                        "4. Also check 'Sleeping Apps' and remove UnlockAM if present");
                    break;
                    
                case "xiaomi":
                case "redmi":
                    guidance.putString("title", "Xiaomi/MIUI Battery Settings");
                    guidance.putString("instructions", 
                        "1. Go to Settings > Apps > Manage Apps\n" +
                        "2. Find UnlockAM > Battery Saver\n" +
                        "3. Set to 'No restrictions'\n" +
                        "4. Enable 'Autostart'\n" +
                        "5. In Security app, add UnlockAM to memory cleanup whitelist");
                    break;
                    
                case "huawei":
                case "honor":
                    guidance.putString("title", "Huawei Battery Settings");
                    guidance.putString("instructions", 
                        "1. Go to Settings > Apps > UnlockAM\n" +
                        "2. Tap Battery > Enable 'Allow background activity'\n" +
                        "3. Go to Phone Manager > Enable 'Auto Launch' for UnlockAM\n" +
                        "4. Add UnlockAM to 'Protected Apps' list");
                    break;
                    
                case "oppo":
                case "oneplus":
                    guidance.putString("title", "OPPO/OnePlus Battery Settings");
                    guidance.putString("instructions", 
                        "1. Go to Settings > Battery > Battery Optimization\n" +
                        "2. Find UnlockAM and set to 'Don't optimize'\n" +
                        "3. Go to Settings > Apps > UnlockAM > Battery\n" +
                        "4. Enable 'Allow background activity'");
                    break;
                    
                case "vivo":
                    guidance.putString("title", "Vivo Battery Settings");
                    guidance.putString("instructions", 
                        "1. Go to Settings > Battery > Background App Refresh\n" +
                        "2. Find UnlockAM and enable background refresh\n" +
                        "3. Go to i Manager > App Manager > Autostart Manager\n" +
                        "4. Enable autostart for UnlockAM");
                    break;
                    
                case "nothing":
                    guidance.putString("title", "Nothing Phone Battery Settings");
                    guidance.putString("instructions", 
                        "1. Go to Settings > Apps > Special Access\n" +
                        "2. Select 'Optimize Battery Usage'\n" +
                        "3. Find UnlockAM and disable optimization\n" +
                        "4. Enable 'Allow background activity'");
                    break;
                    
                default:
                    guidance.putString("title", "Generic Battery Settings");
                    guidance.putString("instructions", 
                        "1. Go to Settings > Apps > UnlockAM\n" +
                        "2. Look for Battery or Power settings\n" +
                        "3. Disable battery optimization\n" +
                        "4. Enable background activity\n" +
                        "5. Check for any 'Auto-start' or 'Autorun' settings");
            }
            
            promise.resolve(guidance);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to get OEM guidance", e);
            promise.reject("OEM_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Test alarm functionality
     */
    @ReactMethod
    public void testAlarmIn30Seconds(Promise promise) {
        try {
            long triggerTime = System.currentTimeMillis() + 30000; // 30 seconds from now
            
            ReadableMap options = Arguments.createMap();
            ((WritableMap) options).putString("alarmId", "test_alarm_" + System.currentTimeMillis());
            ((WritableMap) options).putDouble("triggerTime", triggerTime);
            ((WritableMap) options).putString("soundType", "default");
            ((WritableMap) options).putBoolean("vibration", true);
            ((WritableMap) options).putString("label", "Test Alarm - 30 Second Test");
            
            scheduleExactAlarm(options, promise);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to schedule test alarm", e);
            promise.reject("TEST_ERROR", e.getMessage(), e);
        }
    }
    
    // Helper methods
    
    private boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return alarmManager != null && alarmManager.canScheduleExactAlarms();
        }
        return alarmManager != null; // Earlier versions don't need permission
    }
    
    private boolean isBatteryOptimized() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
            return pm != null && !pm.isIgnoringBatteryOptimizations(reactContext.getPackageName());
        }
        return false; // Earlier versions don't have battery optimization
    }
    
    private boolean canShowOverOtherApps() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(reactContext);
        }
        return true; // Earlier versions don't need permission
    }
    
    private boolean hasNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return reactContext.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) 
                == PackageManager.PERMISSION_GRANTED;
        }
        return true; // Earlier versions don't need runtime permission
    }
}
