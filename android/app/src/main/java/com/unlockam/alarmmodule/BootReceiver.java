package com.unlockam.alarmmodule;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Boot receiver specifically for handling device boot events.
 * Separated from main alarm receiver for clarity and reliability.
 * 
 * This receiver ensures alarms are rescheduled after:
 * - Normal boot
 * - Quick boot (OEM specific)
 * - App updates
 */
public class BootReceiver extends BroadcastReceiver {
    
    private static final String TAG = "BootReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "🔄 BootReceiver triggered: " + action);
        
        if (isBootAction(action)) {
            Log.d(TAG, "📱 Device booted - initiating alarm rescheduling");
            rescheduleAlarmsAfterBoot(context);
        }
    }
    
    /**
     * Reschedule all alarms after device boot
     */
    private void rescheduleAlarmsAfterBoot(Context context) {
        Intent serviceIntent = new Intent(context, ProductionAlarmService.class);
        serviceIntent.setAction("RESCHEDULE_AFTER_BOOT");
        serviceIntent.putExtra("bootTime", System.currentTimeMillis());
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "✅ Boot rescheduling service started");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to start boot rescheduling service", e);
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
}
