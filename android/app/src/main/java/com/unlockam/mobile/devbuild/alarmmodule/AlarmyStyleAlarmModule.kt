package com.unlockam.mobile.devbuild.alarmmodule

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Calendar

/**
 * React Native module for Alarmy-style alarm functionality
 * Provides JavaScript interface to native Android alarm capabilities
 */
class AlarmyStyleAlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val tag = "AlarmyStyleModule"
    private var alarmScheduler: AlarmyStyleAlarmScheduler? = null
    
    override fun getName(): String = "AlarmyStyleAlarmModule"
    
    init {
        alarmScheduler = AlarmyStyleAlarmScheduler(reactContext)
    }
    
    /**
     * Schedule an Alarmy-style alarm
     */
    @ReactMethod
    fun scheduleAlarm(alarmId: Int, hour: Int, minute: Int, label: String, promise: Promise) {
        try {
            Log.d(tag, "Scheduling Alarmy-style alarm: ID=$alarmId, Time=$hour:$minute, Label=$label")
            
            // Calculate trigger time
            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                
                // If time is in the past, schedule for tomorrow
                if (timeInMillis <= System.currentTimeMillis()) {
                    add(Calendar.DAY_OF_MONTH, 1)
                }
            }
            
            val success = alarmScheduler?.scheduleAlarm(alarmId, calendar.timeInMillis, label) ?: false
            
            if (success) {
                Log.i(tag, "Successfully scheduled alarm for ${calendar.time}")
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Alarm scheduled successfully")
                    putDouble("triggerTime", calendar.timeInMillis.toDouble())
                })
            } else {
                promise.reject("SCHEDULE_FAILED", "Failed to schedule alarm - check exact alarm permissions")
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Error scheduling alarm", e)
            promise.reject("SCHEDULE_ERROR", e.message)
        }
    }
    
    /**
     * Schedule a test alarm for immediate testing
     */
    @ReactMethod
    fun scheduleTestAlarm(secondsFromNow: Int, promise: Promise) {
        try {
            Log.d(tag, "Scheduling test alarm in $secondsFromNow seconds")
            
            val success = alarmScheduler?.scheduleTestAlarm(secondsFromNow) ?: false
            
            if (success) {
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Test alarm scheduled successfully")
                })
            } else {
                promise.reject("SCHEDULE_FAILED", "Failed to schedule test alarm")
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Error scheduling test alarm", e)
            promise.reject("SCHEDULE_ERROR", e.message)
        }
    }
    
    /**
     * Cancel an alarm
     */
    @ReactMethod
    fun cancelAlarm(alarmId: Int, promise: Promise) {
        try {
            Log.d(tag, "Cancelling alarm ID: $alarmId")
            
            alarmScheduler?.cancelAlarm(alarmId)
            
            promise.resolve(WritableNativeMap().apply {
                putBoolean("success", true)
                putString("message", "Alarm cancelled successfully")
            })
            
        } catch (e: Exception) {
            Log.e(tag, "Error cancelling alarm", e)
            promise.reject("CANCEL_ERROR", e.message)
        }
    }
    
    /**
     * Check if exact alarm permissions are granted (Android 12+)
     */
    @ReactMethod
    fun checkExactAlarmPermission(promise: Promise) {
        try {
            val hasPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                alarmManager.canScheduleExactAlarms()
            } else {
                true // Not required on older versions
            }
            
            promise.resolve(WritableNativeMap().apply {
                putBoolean("hasPermission", hasPermission)
                putBoolean("isRequired", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            })
            
        } catch (e: Exception) {
            Log.e(tag, "Error checking exact alarm permission", e)
            promise.reject("PERMISSION_CHECK_ERROR", e.message)
        }
    }
    
    /**
     * Request exact alarm permission (opens system settings)
     */
    @ReactMethod
    fun requestExactAlarmPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                
                reactApplicationContext.startActivity(intent)
                
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Exact alarm permission dialog opened")
                })
            } else {
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Exact alarm permission not required on this Android version")
                })
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Error requesting exact alarm permission", e)
            promise.reject("PERMISSION_REQUEST_ERROR", e.message)
        }
    }
    
    /**
     * Check if overlay permission is granted
     */
    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            val hasPermission = AlarmyStyleOverlayManager.hasOverlayPermission(reactApplicationContext)
            
            promise.resolve(WritableNativeMap().apply {
                putBoolean("hasPermission", hasPermission)
                putBoolean("isRequired", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            })
            
        } catch (e: Exception) {
            Log.e(tag, "Error checking overlay permission", e)
            promise.reject("PERMISSION_CHECK_ERROR", e.message)
        }
    }
    
    /**
     * Request overlay permission (opens system settings)
     */
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            AlarmyStyleOverlayManager.requestOverlayPermission(reactApplicationContext)
            
            promise.resolve(WritableNativeMap().apply {
                putBoolean("success", true)
                putString("message", "Overlay permission dialog opened")
            })
            
        } catch (e: Exception) {
            Log.e(tag, "Error requesting overlay permission", e)
            promise.reject("PERMISSION_REQUEST_ERROR", e.message)
        }
    }
    
    /**
     * Request battery optimization exemption
     */
    @ReactMethod
    fun requestBatteryOptimizationExemption(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                
                reactApplicationContext.startActivity(intent)
                
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Battery optimization exemption dialog opened")
                })
            } else {
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Battery optimization not applicable on this Android version")
                })
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Error requesting battery optimization exemption", e)
            promise.reject("BATTERY_REQUEST_ERROR", e.message)
        }
    }
    
    /**
     * Get alarm system status and capabilities
     */
    @ReactMethod
    fun getSystemStatus(promise: Promise) {
        try {
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val status = WritableNativeMap().apply {
                putBoolean("canScheduleExactAlarms", 
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        alarmManager.canScheduleExactAlarms()
                    } else {
                        true
                    }
                )
                putBoolean("hasOverlayPermission", AlarmyStyleOverlayManager.hasOverlayPermission(reactApplicationContext))
                putInt("androidVersion", Build.VERSION.SDK_INT)
                putString("deviceModel", Build.MODEL)
                putString("manufacturer", Build.MANUFACTURER)
            }
            
            promise.resolve(status)
            
        } catch (e: Exception) {
            Log.e(tag, "Error getting system status", e)
            promise.reject("SYSTEM_STATUS_ERROR", e.message)
        }
    }
    
    /**
     * Send event to JavaScript
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
