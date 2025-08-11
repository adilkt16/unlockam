package com.unlockam.alarmmodule;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.app.PendingIntent;
import android.os.PowerManager;

/**
 * Production-ready AlarmReceiver that handles system alarm triggers.
 * This receiver is designed to work reliably even in Doze mode and with strict battery optimizations.
 * 
 * Key design decisions:
 * 1. Uses highest priority for intent filter to ensure it's called first
 * 2. Immediately starts foreground service to avoid background execution limits
 * 3. Handles multiple OEM boot completed actions for compatibility
 * 4. Uses wake locks to ensure execution completes
 */
public class ProductionAlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "ProductionAlarmReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "🚨 ProductionAlarmReceiver triggered: " + intent.getAction());
        
        // Acquire wake lock to ensure we can complete our work
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "UnlockAM:AlarmReceiver");
        wakeLock.acquire(30000); // Hold for 30 seconds max
        
        try {
            String action = intent.getAction();
            
            if ("com.unlockam.ALARM_TRIGGER".equals(action)) {
                handleAlarmTrigger(context, intent);
            } else if (isBootAction(action)) {
                handleBootCompleted(context);
            } else if (isPackageAction(action)) {
                handlePackageReplaced(context);
            }
            
        } finally {
            // Always release wake lock
            if (wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }
    
    /**
     * Handle alarm trigger - the most critical path
     */
    private void handleAlarmTrigger(Context context, Intent intent) {
        Log.d(TAG, "🔔 ALARM TRIGGERED - Starting production alarm service");
        
        // Extract alarm data
        String alarmId = intent.getStringExtra("alarmId");
        String soundType = intent.getStringExtra("soundType");
        boolean vibration = intent.getBooleanExtra("vibration", true);
        String label = intent.getStringExtra("label");
        
        Log.d(TAG, "📋 Alarm details: ID=" + alarmId + ", Sound=" + soundType + ", Label=" + label);
        
        // Start the production alarm service immediately
        Intent serviceIntent = new Intent(context, ProductionAlarmService.class);
        serviceIntent.setAction("TRIGGER_ALARM");
        serviceIntent.putExtra("alarmId", alarmId);
        serviceIntent.putExtra("soundType", soundType);
        serviceIntent.putExtra("vibration", vibration);
        serviceIntent.putExtra("label", label);
        serviceIntent.putExtra("triggerTime", System.currentTimeMillis());
        
        // Start foreground service to avoid background execution limits
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "✅ Production alarm service started successfully");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to start production alarm service", e);
            // Fallback: try to start legacy service
            startFallbackService(context, serviceIntent);
        }
        
        // Also launch full-screen activity for user interaction
        launchFullScreenActivity(context, alarmId, label);
    }
    
    /**
     * Launch full-screen activity for snooze/dismiss controls
     */
    private void launchFullScreenActivity(Context context, String alarmId, String label) {
        try {
            Intent activityIntent = new Intent(context, ProductionAlarmActivity.class);
            activityIntent.setAction("com.unlockam.ALARM_TRIGGERED");
            activityIntent.putExtra("alarmId", alarmId);
            activityIntent.putExtra("label", label);
            activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | 
                                  Intent.FLAG_ACTIVITY_CLEAR_TOP | 
                                  Intent.FLAG_ACTIVITY_SINGLE_TOP);
            
            context.startActivity(activityIntent);
            Log.d(TAG, "✅ Full-screen alarm activity launched");
            
        } catch (Exception e) {
            Log.e(TAG, "⚠️ Failed to launch full-screen activity: " + e.getMessage());
            // This is not critical - audio will still play via service
        }
    }
    
    /**
     * Handle boot completed - reschedule all alarms
     */
    private void handleBootCompleted(Context context) {
        Log.d(TAG, "🔄 Boot completed - rescheduling alarms");
        
        // Start a service to handle alarm rescheduling
        Intent rescheduleIntent = new Intent(context, ProductionAlarmService.class);
        rescheduleIntent.setAction("RESCHEDULE_ALARMS");
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(rescheduleIntent);
            } else {
                context.startService(rescheduleIntent);
            }
            Log.d(TAG, "✅ Alarm rescheduling service started");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to start rescheduling service", e);
        }
    }
    
    /**
     * Handle package replaced - reschedule alarms after app update
     */
    private void handlePackageReplaced(Context context) {
        Log.d(TAG, "📦 Package replaced - rescheduling alarms");
        handleBootCompleted(context); // Same logic as boot
    }
    
    /**
     * Start fallback service if production service fails
     */
    private void startFallbackService(Context context, Intent originalIntent) {
        try {
            Intent fallbackIntent = new Intent(context, AndroidAlarmAudioService.class);
            fallbackIntent.setAction("PLAY_ALARM");
            fallbackIntent.putExtras(originalIntent.getExtras());
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(fallbackIntent);
            } else {
                context.startService(fallbackIntent);
            }
            Log.d(TAG, "✅ Fallback service started");
        } catch (Exception e) {
            Log.e(TAG, "❌ Even fallback service failed", e);
        }
    }
    
    /**
     * Check if this is a boot-related action
     */
    private boolean isBootAction(String action) {
        return "android.intent.action.BOOT_COMPLETED".equals(action) ||
               "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
               "com.htc.intent.action.QUICKBOOT_POWERON".equals(action);
    }
    
    /**
     * Check if this is a package-related action
     */
    private boolean isPackageAction(String action) {
        return "android.intent.action.MY_PACKAGE_REPLACED".equals(action) ||
               "android.intent.action.PACKAGE_REPLACED".equals(action);
    }
}
