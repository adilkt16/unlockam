package com.unlockam.mobile.devbuild.alarmmodule

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.app.NotificationCompat
import com.unlockam.mobile.devbuild.R

/**
 * Alarmy-style foreground service that ensures alarm playback continues
 * even under the most restrictive conditions:
 * - Doze mode
 * - Do Not Disturb
 * - App killed
 * - Screen off
 * - Battery optimization
 */
class AlarmyStyleAlarmService : Service() {
    
    private val tag = "AlarmyStyleService"
    private val notificationId = 12345
    private val channelId = "alarmy_alarm_channel"
    
    // Wake locks to keep CPU and screen alive
    private var wakeLock: PowerManager.WakeLock? = null
    
    // Audio components
    private var mediaPlayer: MediaPlayer? = null
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    
    // Vibrator for additional wake-up mechanism
    private var vibrator: Vibrator? = null
    
    // Current alarm info
    private var currentAlarmId: Int = -1
    private var currentAlarmLabel: String = ""
    
    override fun onCreate() {
        super.onCreate()
        Log.d(tag, "AlarmyStyleAlarmService created")
        
        // Initialize audio manager
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        
        // Initialize vibrator
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as android.os.VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        
        // Create notification channel for foreground service
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(tag, "onStartCommand: ${intent?.action}")
        
        when (intent?.action) {
            "START_ALARM" -> {
                currentAlarmId = intent.getIntExtra("alarm_id", -1)
                currentAlarmLabel = intent.getStringExtra("alarm_label") ?: "Wake up!"
                startAlarmPlayback()
            }
            "STOP_ALARM" -> {
                stopAlarmPlayback()
                stopSelf()
            }
        }
        
        // Return START_NOT_STICKY so service doesn't restart if killed
        // (alarm scheduling will handle re-triggering)
        return START_NOT_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        Log.d(tag, "AlarmyStyleAlarmService destroyed")
        stopAlarmPlayback()
        super.onDestroy()
    }
    
    /**
     * Start alarm playback with all Alarmy-style mechanisms
     */
    private fun startAlarmPlayback() {
        Log.i(tag, "Starting Alarmy-style alarm playback for ID: $currentAlarmId")
        
        // Step 1: Start as foreground service with high-priority notification
        val notification = createForegroundNotification()
        startForeground(notificationId, notification)
        
        // Step 2: Acquire wake locks to prevent sleep
        acquireWakeLocks()
        
        // Step 3: Request audio focus with highest priority
        requestAudioFocus()
        
        // Step 4: Set audio to maximum volume for alarm stream
        setMaximumAlarmVolume()
        
        // Step 5: Start media playback
        startMediaPlayback()
        
        // Step 6: Start vibration pattern
        startVibration()
        
        Log.i(tag, "All alarm playback mechanisms started successfully")
    }
    
    /**
     * Stop all alarm playback mechanisms
     */
    private fun stopAlarmPlayback() {
        Log.i(tag, "Stopping all alarm playback mechanisms")
        
        // Stop media playback
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (e: Exception) {
            Log.w(tag, "Error stopping media player", e)
        }
        
        // Stop vibration
        vibrator?.cancel()
        
        // Release audio focus
        releaseAudioFocus()
        
        // Release wake locks
        releaseWakeLocks()
        
        Log.i(tag, "All alarm mechanisms stopped")
    }
    
    /**
     * Acquire CPU and screen wake locks (Alarmy's approach)
     */
    private fun acquireWakeLocks() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            
            // Acquire partial wake lock to keep CPU running
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "UnlockAM:AlarmWakeLock"
            )
            wakeLock?.acquire(10 * 60 * 1000L) // 10 minutes max
            
            Log.d(tag, "Wake locks acquired")
        } catch (e: Exception) {
            Log.e(tag, "Failed to acquire wake locks", e)
        }
    }
    
    /**
     * Release wake locks
     */
    private fun releaseWakeLocks() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                }
            }
            wakeLock = null
            Log.d(tag, "Wake locks released")
        } catch (e: Exception) {
            Log.e(tag, "Error releasing wake locks", e)
        }
    }
    
    /**
     * Request audio focus with highest priority (ALARM stream)
     */
    private fun requestAudioFocus() {
        try {
            audioManager?.let { am ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Android O+ approach
                    val audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                    
                    audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(audioAttributes)
                        .setAcceptsDelayedFocusGain(false)
                        .setOnAudioFocusChangeListener { focusChange ->
                            Log.d(tag, "Audio focus changed: $focusChange")
                            // Don't stop alarm even if focus is lost - this is Alarmy's approach
                        }
                        .build()
                    
                    am.requestAudioFocus(audioFocusRequest!!)
                } else {
                    // Legacy approach
                    @Suppress("DEPRECATION")
                    am.requestAudioFocus(
                        { focusChange -> 
                            Log.d(tag, "Audio focus changed: $focusChange")
                        },
                        AudioManager.STREAM_ALARM,
                        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
                    )
                }
                Log.d(tag, "Audio focus requested for ALARM stream")
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to request audio focus", e)
        }
    }
    
    /**
     * Release audio focus
     */
    private fun releaseAudioFocus() {
        try {
            audioManager?.let { am ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    am.abandonAudioFocusRequest(audioFocusRequest!!)
                } else {
                    @Suppress("DEPRECATION")
                    am.abandonAudioFocus { }
                }
            }
            Log.d(tag, "Audio focus released")
        } catch (e: Exception) {
            Log.e(tag, "Error releasing audio focus", e)
        }
    }
    
    /**
     * Set audio to maximum volume for alarm stream (Alarmy's approach)
     */
    private fun setMaximumAlarmVolume() {
        try {
            audioManager?.let { am ->
                val maxVolume = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
                am.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)
                Log.d(tag, "Set alarm volume to maximum: $maxVolume")
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to set maximum alarm volume", e)
        }
    }
    
    /**
     * Start media playback using MediaPlayer with alarm audio attributes
     */
    private fun startMediaPlayback() {
        try {
            // Use default alarm sound or custom sound
            val alarmUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM)
            
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                
                setDataSource(applicationContext, alarmUri)
                isLooping = true // Loop until manually stopped
                prepare()
                start()
            }
            
            Log.d(tag, "MediaPlayer started with alarm audio attributes")
        } catch (e: Exception) {
            Log.e(tag, "Failed to start media playback", e)
        }
    }
    
    /**
     * Start vibration pattern (Alarmy-style)
     */
    private fun startVibration() {
        try {
            if (vibrator?.hasVibrator() == true) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Modern vibration pattern
                    val pattern = longArrayOf(0, 1000, 500, 1000, 500) // On-off pattern
                    val effect = VibrationEffect.createWaveform(pattern, 0) // Repeat from index 0
                    vibrator?.vibrate(effect)
                } else {
                    // Legacy vibration
                    val pattern = longArrayOf(0, 1000, 500, 1000, 500)
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(pattern, 0)
                }
                Log.d(tag, "Vibration pattern started")
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to start vibration", e)
        }
    }
    
    /**
     * Create high-priority notification channel for alarms
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                getString(R.string.alarmy_notification_channel_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.alarmy_notification_channel_description)
                setBypassDnd(true) // Allow to override Do Not Disturb
                enableVibration(true)
                enableLights(true)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    /**
     * Create foreground service notification
     */
    private fun createForegroundNotification(): Notification {
        // Intent to open alarm activity
        val intent = Intent(this, AlarmyStyleAlarmActivity::class.java).apply {
            action = "com.unlockam.ALARM_TRIGGERED"
            putExtra("alarm_id", currentAlarmId)
            putExtra("alarm_label", currentAlarmLabel)
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            currentAlarmId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Create full-screen intent for lock screen
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            currentAlarmId + 20000,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle(getString(R.string.alarmy_foreground_notification_title))
            .setContentText("$currentAlarmLabel - ${getString(R.string.alarmy_foreground_notification_text)}")
            .setSmallIcon(R.drawable.notification_icon)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true) // Key for lock screen
            .setOngoing(true)
            .setAutoCancel(false)
            .build()
    }
}
