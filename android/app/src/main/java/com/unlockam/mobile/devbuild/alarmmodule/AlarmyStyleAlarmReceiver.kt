package com.unlockam.mobile.devbuild.alarmmodule

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Alarmy-style broadcast receiver that handles alarm triggers with maximum reliability
 * This receiver immediately starts the foreground service to ensure continuous playback
 */
class AlarmyStyleAlarmReceiver : BroadcastReceiver() {
    
    private val tag = "AlarmyStyleReceiver"
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(tag, "Received broadcast: ${intent.action}")
        
        when (intent.action) {
            "com.unlockam.ALARMY_ALARM_TRIGGER" -> {
                handleAlarmTrigger(context, intent)
            }
            "android.intent.action.BOOT_COMPLETED",
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON" -> {
                handleBootCompleted(context)
            }
            "android.intent.action.MY_PACKAGE_REPLACED",
            "android.intent.action.PACKAGE_REPLACED" -> {
                if (intent.data?.schemeSpecificPart == context.packageName) {
                    handleAppUpdated(context)
                }
            }
        }
    }
    
    /**
     * Handle alarm trigger - Alarmy's core mechanism
     * 1. Immediately start foreground service
     * 2. Start lock screen activity
     * 3. Ensure all components are running
     */
    private fun handleAlarmTrigger(context: Context, intent: Intent) {
        val alarmId = intent.getIntExtra("alarm_id", -1)
        val alarmLabel = intent.getStringExtra("alarm_label") ?: "Wake up!"
        val triggerTime = intent.getLongExtra("trigger_time", System.currentTimeMillis())
        
        Log.i(tag, "Alarm triggered! ID: $alarmId, Label: $alarmLabel")
        
        // Step 1: Start foreground service immediately (critical for Alarmy-style behavior)
        val serviceIntent = Intent(context, AlarmyStyleAlarmService::class.java).apply {
            action = "START_ALARM"
            putExtra("alarm_id", alarmId)
            putExtra("alarm_label", alarmLabel)
            putExtra("trigger_time", triggerTime)
        }
        
        try {
            // Use startForegroundService for Android O+ (required for background triggers)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.i(tag, "Started AlarmyStyleAlarmService")
        } catch (e: Exception) {
            Log.e(tag, "Failed to start AlarmyStyleAlarmService", e)
        }
        
        // Step 2: Start lock screen activity (primary UI method)
        val activityIntent = Intent(context, AlarmyStyleAlarmActivity::class.java).apply {
            action = "com.unlockam.ALARM_TRIGGERED"
            putExtra("alarm_id", alarmId)
            putExtra("alarm_label", alarmLabel)
            putExtra("trigger_time", triggerTime)
            // Critical flags for showing over lock screen
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
            addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY)
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        
        try {
            context.startActivity(activityIntent)
            Log.i(tag, "Started AlarmyStyleAlarmActivity")
        } catch (e: Exception) {
            Log.e(tag, "Failed to start AlarmyStyleAlarmActivity", e)
        }
        
        // Step 3: If system alert window permission is available, start overlay as backup
        if (AlarmyStyleOverlayManager.hasOverlayPermission(context)) {
            AlarmyStyleOverlayManager.showAlarmOverlay(context, alarmId, alarmLabel)
            Log.i(tag, "Started overlay as additional safety measure")
        }
    }
    
    /**
     * Handle device boot completion - restore scheduled alarms
     */
    private fun handleBootCompleted(context: Context) {
        Log.i(tag, "Device boot completed - restoring alarms")
        
        try {
            val scheduler = AlarmyStyleAlarmScheduler(context)
            scheduler.restoreAlarmsAfterBoot()
            Log.i(tag, "Successfully restored alarms after boot")
        } catch (e: Exception) {
            Log.e(tag, "Failed to restore alarms after boot", e)
        }
    }
    
    /**
     * Handle app update - restore alarms if needed
     */
    private fun handleAppUpdated(context: Context) {
        Log.i(tag, "App updated - checking alarm restoration")
        handleBootCompleted(context) // Same logic as boot
    }
}
