package com.unlockam.mobile.devbuild.alarmmodule

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import com.unlockam.mobile.devbuild.R

/**
 * Alarmy-style overlay manager for fallback alarm display
 * Used when SYSTEM_ALERT_WINDOW permission is granted
 * This ensures alarm shows even over other apps and lock screen
 */
object AlarmyStyleOverlayManager {
    
    private val tag = "AlarmyOverlayManager"
    private var overlayView: View? = null
    private var windowManager: WindowManager? = null
    
    /**
     * Check if overlay permission is granted
     */
    fun hasOverlayPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true // Permission not required on older versions
        }
    }
    
    /**
     * Request overlay permission
     */
    fun requestOverlayPermission(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !hasOverlayPermission(context)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
    }
    
    /**
     * Show alarm overlay (Alarmy's fallback method)
     */
    fun showAlarmOverlay(context: Context, alarmId: Int, alarmLabel: String) {
        if (!hasOverlayPermission(context)) {
            Log.w(tag, "Cannot show overlay - permission not granted")
            return
        }
        
        try {
            // Remove any existing overlay
            hideAlarmOverlay()
            
            // Get window manager
            windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            
            // Inflate overlay layout
            val inflater = LayoutInflater.from(context)
            overlayView = inflater.inflate(R.layout.overlay_alarm, null)
            
            // Setup overlay content
            setupOverlayContent(context, overlayView!!, alarmId, alarmLabel)
            
            // Setup window parameters for maximum visibility
            val layoutParams = WindowManager.LayoutParams().apply {
                width = WindowManager.LayoutParams.MATCH_PARENT
                height = WindowManager.LayoutParams.MATCH_PARENT
                
                // Use appropriate window type based on Android version
                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
                }
                
                // Flags for maximum visibility and interaction
                flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                
                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.CENTER
            }
            
            // Add overlay to window manager
            windowManager?.addView(overlayView, layoutParams)
            Log.i(tag, "Alarm overlay displayed for ID: $alarmId")
            
        } catch (e: Exception) {
            Log.e(tag, "Failed to show alarm overlay", e)
            overlayView = null
            windowManager = null
        }
    }
    
    /**
     * Hide alarm overlay
     */
    fun hideAlarmOverlay() {
        try {
            overlayView?.let { view ->
                windowManager?.removeView(view)
                Log.i(tag, "Alarm overlay hidden")
            }
        } catch (e: Exception) {
            Log.e(tag, "Error hiding alarm overlay", e)
        } finally {
            overlayView = null
            windowManager = null
        }
    }
    
    /**
     * Setup overlay content and interactions
     */
    private fun setupOverlayContent(context: Context, view: View, alarmId: Int, alarmLabel: String) {
        // Set alarm label
        val labelTextView = view.findViewById<TextView>(R.id.overlay_alarm_label)
        labelTextView.text = alarmLabel
        
        // Set current time
        val timeTextView = view.findViewById<TextView>(R.id.overlay_alarm_time)
        val currentTime = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
            .format(java.util.Date())
        timeTextView.text = currentTime
        
        // Setup dismiss button (opens main activity)
        val dismissButton = view.findViewById<Button>(R.id.overlay_dismiss_button)
        dismissButton.setOnClickListener {
            // Start the main alarm activity for proper puzzle solving
            val activityIntent = Intent(context, AlarmyStyleAlarmActivity::class.java).apply {
                action = "com.unlockam.ALARM_TRIGGERED"
                putExtra("alarm_id", alarmId)
                putExtra("alarm_label", alarmLabel)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            
            try {
                context.startActivity(activityIntent)
                hideAlarmOverlay() // Hide overlay when opening activity
            } catch (e: Exception) {
                Log.e(tag, "Failed to start alarm activity from overlay", e)
            }
        }
        
        Log.d(tag, "Overlay content setup complete")
    }
}
