package com.unlockam.alarmmodule;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class AndroidAlarmAudioModule extends ReactContextBaseJavaModule {
    
    private static final String MODULE_NAME = "AndroidAlarmAudio";
    private ReactApplicationContext reactContext;
    private AlarmManager alarmManager;

    public AndroidAlarmAudioModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void initialize(Promise promise) {
        try {
            // Initialize the module
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "AndroidAlarmAudio module initialized");
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("INITIALIZATION_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void playLockedStateAlarm(ReadableMap options, Promise promise) {
        try {
            String alarmId = options.getString("alarmId");
            String soundType = options.getString("soundType");
            double volume = options.getDouble("volume");
            boolean vibration = options.getBoolean("vibration");
            boolean showOverLockscreen = options.getBoolean("showOverLockscreen");
            boolean wakeScreen = options.getBoolean("wakeScreen");

            // Create intent for alarm service
            Intent serviceIntent = new Intent(reactContext, AndroidAlarmAudioService.class);
            serviceIntent.setAction("PLAY_ALARM");
            serviceIntent.putExtra("alarmId", alarmId);
            serviceIntent.putExtra("soundType", soundType);
            serviceIntent.putExtra("volume", (float) volume);
            serviceIntent.putExtra("vibration", vibration);
            serviceIntent.putExtra("showOverLockscreen", showOverLockscreen);
            serviceIntent.putExtra("wakeScreen", wakeScreen);

            // Start foreground service
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }

            // Emit event to React Native
            WritableMap eventData = Arguments.createMap();
            eventData.putString("alarmId", alarmId);
            eventData.putString("event", "AlarmTriggered");
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("AlarmTriggered", eventData);

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("PLAY_ALARM_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void stopAlarm(String alarmId, Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, AndroidAlarmAudioService.class);
            serviceIntent.setAction("STOP_ALARM");
            serviceIntent.putExtra("alarmId", alarmId);

            reactContext.startService(serviceIntent);

            // Emit event to React Native
            WritableMap eventData = Arguments.createMap();
            eventData.putString("alarmId", alarmId);
            eventData.putString("event", "AlarmStopped");
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("AlarmStopped", eventData);

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ALARM_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void playAudioFile(ReadableMap options, Promise promise) {
        try {
            String filePath = options.getString("filePath");
            double volume = options.getDouble("volume");
            boolean loop = options.getBoolean("loop");
            String priority = options.getString("priority");
            String usage = options.getString("usage");
            String contentType = options.getString("contentType");

            // This would be handled by the service
            Intent serviceIntent = new Intent(reactContext, AndroidAlarmAudioService.class);
            serviceIntent.setAction("PLAY_AUDIO_FILE");
            serviceIntent.putExtra("filePath", filePath);
            serviceIntent.putExtra("volume", (float) volume);
            serviceIntent.putExtra("loop", loop);
            serviceIntent.putExtra("priority", priority);
            serviceIntent.putExtra("usage", usage);
            serviceIntent.putExtra("contentType", contentType);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("PLAY_AUDIO_FILE_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void triggerVibrationPattern(ReadableMap options, Promise promise) {
        try {
            // This would trigger a vibration pattern
            Intent serviceIntent = new Intent(reactContext, AndroidAlarmAudioService.class);
            serviceIntent.setAction("TRIGGER_VIBRATION");
            
            // Add vibration pattern data to intent
            serviceIntent.putExtra("vibrationPattern", options.getArray("pattern"));
            serviceIntent.putExtra("repeat", options.getBoolean("repeat"));

            reactContext.startService(serviceIntent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("VIBRATION_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void scheduleAlarm(ReadableMap options, Promise promise) {
        try {
            String alarmId = options.getString("alarmId");
            long triggerTime = (long) options.getDouble("triggerTime");
            String soundType = options.getString("soundType");
            boolean vibration = options.getBoolean("vibration");
            String label = options.getString("label");

            // Create pending intent for alarm
            Intent alarmIntent = new Intent(reactContext, AlarmReceiver.class);
            alarmIntent.putExtra("alarmId", alarmId);
            alarmIntent.putExtra("soundType", soundType);
            alarmIntent.putExtra("vibration", vibration);
            alarmIntent.putExtra("label", label);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                alarmId.hashCode(), 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Schedule exact alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SCHEDULE_ALARM_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void scheduleSnoozeAlarm(ReadableMap options, Promise promise) {
        try {
            scheduleAlarm(options, promise);
        } catch (Exception e) {
            promise.reject("SCHEDULE_SNOOZE_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void scheduleNextOccurrence(ReadableMap options, Promise promise) {
        try {
            scheduleAlarm(options, promise);
        } catch (Exception e) {
            promise.reject("SCHEDULE_NEXT_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void startForegroundService(ReadableMap options, Promise promise) {
        try {
            String title = options.getString("title");
            String message = options.getString("message");

            Intent serviceIntent = new Intent(reactContext, AndroidAlarmAudioService.class);
            serviceIntent.setAction("START_FOREGROUND");
            serviceIntent.putExtra("title", title);
            serviceIntent.putExtra("message", message);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("START_FOREGROUND_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void testAlarmPlayback(Promise promise) {
        try {
            // Test alarm playback for 3 seconds
            ReadableMap testOptions = Arguments.createMap();
            testOptions.putString("alarmId", "test_alarm");
            testOptions.putString("soundType", "alert");
            testOptions.putDouble("volume", 0.5);
            testOptions.putBoolean("vibration", false);
            testOptions.putBoolean("showOverLockscreen", false);
            testOptions.putBoolean("wakeScreen", false);

            playLockedStateAlarm(testOptions, new Promise() {
                @Override
                public void resolve(Object value) {
                    // Stop test alarm after 3 seconds
                    new android.os.Handler().postDelayed(() -> {
                        try {
                            stopAlarm("test_alarm", new Promise() {
                                @Override
                                public void resolve(Object value) {}
                                @Override
                                public void reject(String code, String message) {}
                                @Override
                                public void reject(String code, Throwable throwable) {}
                                @Override
                                public void reject(String code, String message, Throwable throwable) {}
                            });
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }, 3000);
                }
                @Override
                public void reject(String code, String message) {}
                @Override
                public void reject(String code, Throwable throwable) {}
                @Override
                public void reject(String code, String message, Throwable throwable) {}
            });

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("TEST_PLAYBACK_ERROR", e.getMessage(), e);
        }
    }
}
