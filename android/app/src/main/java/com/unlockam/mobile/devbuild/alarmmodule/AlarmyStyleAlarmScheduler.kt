package com.unlockam.mobile.devbuild.alarmmodule

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.app.AlarmManagerCompat
import java.util.Calendar

/**
 * Alarmy-style alarm scheduler that ensures alarms trigger reliably
 * Uses AlarmManager.setAlarmClock() with exact RTC_WAKEUP for maximum reliability
 */
class AlarmyStyleAlarmScheduler(private val context: Context) {
    
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    private val tag = "AlarmyStyleScheduler"
    
    /**
     * Schedule an alarm using Alarmy's approach:
     * 1. Check exact alarm permissions (Android 12+)
     * 2. Use setAlarmClock() for highest priority
     * 3. Set up proper PendingIntent with broadcast receiver
     */
    fun scheduleAlarm(alarmId: Int, triggerTime: Long, label: String = "Wake up!"): Boolean {
        Log.d(tag, "Scheduling Alarmy-style alarm for ID: $alarmId at $triggerTime")
        
        // Step 1: Check if we can schedule exact alarms (Android 12+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                Log.w(tag, "Cannot schedule exact alarms - requesting permission")
                requestExactAlarmPermission()
                return false
            }
        }
        
        // Step 2: Create the alarm intent (goes to our broadcast receiver)
        val alarmIntent = Intent(context, AlarmyStyleAlarmReceiver::class.java).apply {
            action = "com.unlockam.ALARMY_ALARM_TRIGGER"
            putExtra("alarm_id", alarmId)
            putExtra("alarm_label", label)
            putExtra("trigger_time", triggerTime)
        }
        
        // Step 3: Create PendingIntent with high priority flags
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId,
            alarmIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Step 4: Create show intent for the alarm clock info (required for setAlarmClock)
        val showIntent = Intent(context, AlarmyStyleAlarmActivity::class.java).apply {
            action = "com.unlockam.ALARM_TRIGGERED"
            putExtra("alarm_id", alarmId)
            putExtra("alarm_label", label)
        }
        
        val showPendingIntent = PendingIntent.getActivity(
            context,
            alarmId + 10000, // Offset to avoid conflicts
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Step 5: Use setAlarmClock() - Alarmy's primary method
        // This has the highest priority and will wake the device
        val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTime, showPendingIntent)
        
        try {
            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            Log.i(tag, "Successfully scheduled Alarmy-style alarm for $triggerTime")
            
            // Store alarm info for persistence
            saveAlarmInfo(alarmId, triggerTime, label)
            return true
            
        } catch (e: Exception) {
            Log.e(tag, "Failed to schedule alarm", e)
            return false
        }
    }
    
    /**
     * Cancel a scheduled alarm
     */
    fun cancelAlarm(alarmId: Int) {
        Log.d(tag, "Cancelling alarm ID: $alarmId")
        
        val alarmIntent = Intent(context, AlarmyStyleAlarmReceiver::class.java).apply {
            action = "com.unlockam.ALARMY_ALARM_TRIGGER"
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId,
            alarmIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        alarmManager.cancel(pendingIntent)
        removeAlarmInfo(alarmId)
        Log.i(tag, "Cancelled alarm ID: $alarmId")
    }
    
    /**
     * Request exact alarm permission for Android 12+
     */
    private fun requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = android.net.Uri.parse("package:${context.packageName}")
            }
            context.startActivity(intent)
        }
    }
    
    /**
     * Save alarm information for boot recovery
     */
    private fun saveAlarmInfo(alarmId: Int, triggerTime: Long, label: String) {
        val sharedPrefs = context.getSharedPreferences("alarmy_alarms", Context.MODE_PRIVATE)
        sharedPrefs.edit().apply {
            putLong("alarm_${alarmId}_time", triggerTime)
            putString("alarm_${alarmId}_label", label)
            apply()
        }
    }
    
    /**
     * Remove saved alarm information
     */
    private fun removeAlarmInfo(alarmId: Int) {
        val sharedPrefs = context.getSharedPreferences("alarmy_alarms", Context.MODE_PRIVATE)
        sharedPrefs.edit().apply {
            remove("alarm_${alarmId}_time")
            remove("alarm_${alarmId}_label")
            apply()
        }
    }
    
    /**
     * Restore alarms after boot (called by boot receiver)
     */
    fun restoreAlarmsAfterBoot() {
        Log.d(tag, "Restoring alarms after boot")
        val sharedPrefs = context.getSharedPreferences("alarmy_alarms", Context.MODE_PRIVATE)
        val allPrefs = sharedPrefs.all
        
        for ((key, value) in allPrefs) {
            if (key.endsWith("_time") && value is Long) {
                val alarmId = key.substringAfter("alarm_").substringBefore("_time").toIntOrNull()
                val label = sharedPrefs.getString("alarm_${alarmId}_label", "Wake up!") ?: "Wake up!"
                
                if (alarmId != null && value > System.currentTimeMillis()) {
                    scheduleAlarm(alarmId, value, label)
                }
            }
        }
    }
    
    /**
     * Schedule a test alarm (for development)
     */
    fun scheduleTestAlarm(secondsFromNow: Int = 10): Boolean {
        val triggerTime = System.currentTimeMillis() + (secondsFromNow * 1000)
        return scheduleAlarm(999, triggerTime, "Test Alarm")
    }
}
