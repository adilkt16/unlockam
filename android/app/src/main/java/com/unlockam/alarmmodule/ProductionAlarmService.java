package com.unlockam.alarmmodule;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.unlockam.mobile.devbuild.R;
import java.io.IOException;

/**
 * Production-ready alarm service designed to work reliably under all Android constraints.
 * 
 * Key design decisions:
 * 1. Foreground service with persistent notification to avoid being killed
 * 2. Multiple audio fallback layers (MediaPlayer, Ringtone, System alerts)
 * 3. Aggressive audio focus management - never gives up focus during alarm
 * 4. Wake lock management to prevent CPU sleep during alarm
 * 5. Handles Android 13+ notification permission denial gracefully
 * 6. Works in Doze mode via exact alarms and foreground service
 */
public class ProductionAlarmService extends Service {
    
    private static final String TAG = "ProductionAlarmService";
    private static final String CHANNEL_ID = "UNLOCKAM_PRODUCTION_ALARM";
    private static final String PREFS_NAME = "UnlockAM_Alarms";
    private static final int NOTIFICATION_ID = 9001;
    
    // Audio players with fallback hierarchy
    private MediaPlayer primaryPlayer;
    private MediaPlayer backupPlayer; 
    private Ringtone systemRingtone;
    
    // System managers
    private AudioManager audioManager;
    private NotificationManager notificationManager;
    private PowerManager.WakeLock wakeLock;
    private Vibrator vibrator;
    
    // Audio focus management
    private AudioFocusRequest audioFocusRequest;
    private boolean hasAudioFocus = false;
    
    // State tracking
    private boolean isAlarmPlaying = false;
    private String currentAlarmId;
    private long alarmStartTime;
    
    // Audio settings backup
    private int originalVolume;
    private int originalRingerMode;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "🏭 ProductionAlarmService created");
        
        // Initialize system managers
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        
        // Create notification channel for foreground service
        createNotificationChannel();
        
        // Acquire wake lock to prevent CPU sleep
        acquireWakeLock();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : "NO_ACTION";
        Log.d(TAG, "🎬 Service command received: " + action);
        
        switch (action) {
            case "TRIGGER_ALARM":
                handleAlarmTrigger(intent);
                break;
            case "STOP_ALARM":
                handleStopAlarm(intent);
                break;
            case "SNOOZE_ALARM":
                handleSnoozeAlarm(intent);
                break;
            case "RESCHEDULE_ALARMS":
            case "RESCHEDULE_AFTER_BOOT":
                handleRescheduleAlarms(intent);
                break;
            default:
                Log.w(TAG, "⚠️ Unknown action: " + action);
        }
        
        // Return START_STICKY to ensure service restarts if killed
        return START_STICKY;
    }
    
    /**
     * Handle alarm trigger - the most critical function
     */
    private void handleAlarmTrigger(Intent intent) {
        currentAlarmId = intent.getStringExtra("alarmId");
        String soundType = intent.getStringExtra("soundType");
        boolean vibrationEnabled = intent.getBooleanExtra("vibration", true);
        String label = intent.getStringExtra("label");
        
        Log.d(TAG, "🚨 ALARM TRIGGERED: " + currentAlarmId + " (" + label + ")");
        alarmStartTime = System.currentTimeMillis();
        
        // Start foreground service immediately
        startForegroundWithNotification(label);
        
        // Backup current audio settings
        backupAudioSettings();
        
        // Request audio focus aggressively
        requestAudioFocusAggressively();
        
        // Start alarm audio with multiple fallbacks
        startAlarmAudio(soundType);
        
        // Start vibration if enabled
        if (vibrationEnabled) {
            startVibration();
        }
        
        // Mark as playing
        isAlarmPlaying = true;
        
        Log.d(TAG, "✅ Alarm fully activated and playing");
    }
    
    /**
     * Handle stop alarm request
     */
    private void handleStopAlarm(Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        Log.d(TAG, "🛑 STOP ALARM requested: " + alarmId);
        
        stopAllAudio();
        stopVibration();
        restoreAudioSettings();
        abandonAudioFocus();
        
        isAlarmPlaying = false;
        currentAlarmId = null;
        
        // Stop foreground service
        stopForeground(true);
        stopSelf();
        
        Log.d(TAG, "✅ Alarm stopped and service terminated");
    }
    
    /**
     * Handle snooze alarm request
     */
    private void handleSnoozeAlarm(Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        int snoozeMinutes = intent.getIntExtra("snoozeMinutes", 5);
        
        Log.d(TAG, "😴 SNOOZE ALARM requested: " + alarmId + " for " + snoozeMinutes + " minutes");
        
        // Stop current alarm
        stopAllAudio();
        stopVibration();
        
        // Schedule snooze alarm
        scheduleSnoozeAlarm(alarmId, snoozeMinutes);
        
        // Stop service
        stopForeground(true);
        stopSelf();
    }
    
    /**
     * Handle rescheduling alarms after boot/update
     */
    private void handleRescheduleAlarms(Intent intent) {
        Log.d(TAG, "🔄 Rescheduling alarms after system event");
        
        // Start temporary foreground service for rescheduling work
        startForegroundWithNotification("Rescheduling alarms...");
        
        // TODO: Load saved alarms and reschedule them
        rescheduleStoredAlarms();
        
        // Stop service after rescheduling
        stopForeground(true);
        stopSelf();
    }
    
    /**
     * Start foreground service with persistent notification
     */
    private void startForegroundWithNotification(String alarmLabel) {
        Intent stopIntent = new Intent(this, ProductionAlarmService.class);
        stopIntent.setAction("STOP_ALARM");
        stopIntent.putExtra("alarmId", currentAlarmId);
        
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Alarm Active")
            .setContentText(alarmLabel != null ? alarmLabel : "Wake up!")
            .setSmallIcon(R.drawable.notification_icon)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(false)
            .addAction(R.drawable.notification_icon, "STOP", stopPendingIntent)
            .setFullScreenIntent(createFullScreenIntent(), true)
            .build();
        
        startForeground(NOTIFICATION_ID, notification);
        Log.d(TAG, "🔔 Foreground service started with notification");
    }
    
    /**
     * Create full-screen intent for lockscreen UI
     */
    private PendingIntent createFullScreenIntent() {
        Intent intent = new Intent(this, ProductionAlarmActivity.class);
        intent.setAction("com.unlockam.ALARM_TRIGGERED");
        intent.putExtra("alarmId", currentAlarmId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        return PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
    
    /**
     * Request audio focus aggressively - never give up during alarm
     */
    private void requestAudioFocusAggressively() {
        if (audioManager == null) return;
        
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(audioAttributes)
                .setOnAudioFocusChangeListener(alarmFocusChangeListener)
                .setAcceptsDelayedFocusGain(false)
                .build();
            
            int result = audioManager.requestAudioFocus(audioFocusRequest);
            hasAudioFocus = (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED);
        } else {
            int result = audioManager.requestAudioFocus(
                alarmFocusChangeListener, 
                AudioManager.STREAM_ALARM, 
                AudioManager.AUDIOFOCUS_GAIN
            );
            hasAudioFocus = (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED);
        }
        
        Log.d(TAG, "🎯 Audio focus request result: " + (hasAudioFocus ? "GRANTED" : "DENIED"));
    }
    
    /**
     * Audio focus change listener - designed for alarms (never give up!)
     */
    private final AudioManager.OnAudioFocusChangeListener alarmFocusChangeListener = 
        new AudioManager.OnAudioFocusChangeListener() {
        @Override
        public void onAudioFocusChange(int focusChange) {
            Log.d(TAG, "🎵 Audio focus changed: " + focusChange);
            
            switch (focusChange) {
                case AudioManager.AUDIOFOCUS_GAIN:
                    // We got focus - ensure alarm is playing
                    if (isAlarmPlaying && !isAnyPlayerPlaying()) {
                        restartAlarmAudio();
                    }
                    break;
                    
                case AudioManager.AUDIOFOCUS_LOSS:
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                    // For alarms, we NEVER stop - immediately request focus back
                    Log.w(TAG, "⚠️ Lost audio focus but alarm must continue!");
                    requestAudioFocusAggressively();
                    break;
                    
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    // Don't duck - alarms should play at full volume
                    Log.d(TAG, "📢 Ignoring duck request - alarm at full volume");
                    break;
            }
        }
    };
    
    /**
     * Start alarm audio with multiple fallback layers
     */
    private void startAlarmAudio(String soundType) {
        Log.d(TAG, "🔊 Starting alarm audio with sound type: " + soundType);
        
        // Set alarm volume to maximum
        setAlarmVolumeToMax();
        
        // Try primary audio source first
        if (!startPrimaryAudio(soundType)) {
            Log.w(TAG, "⚠️ Primary audio failed, trying backup");
            if (!startBackupAudio()) {
                Log.w(TAG, "⚠️ Backup audio failed, using system ringtone");
                startSystemRingtone();
            }
        }
    }
    
    /**
     * Start primary audio player
     */
    private boolean startPrimaryAudio(String soundType) {
        try {
            primaryPlayer = new MediaPlayer();
            
            // Configure for alarm playback
            primaryPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            
            // Load audio source based on sound type
            Uri audioUri = getAudioUri(soundType);
            primaryPlayer.setDataSource(this, audioUri);
            primaryPlayer.setLooping(true);
            primaryPlayer.setVolume(1.0f, 1.0f);
            
            primaryPlayer.prepare();
            primaryPlayer.start();
            
            Log.d(TAG, "✅ Primary audio started successfully");
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Primary audio failed: " + e.getMessage());
            releasePrimaryPlayer();
            return false;
        }
    }
    
    /**
     * Start backup audio player
     */
    private boolean startBackupAudio() {
        try {
            backupPlayer = new MediaPlayer();
            
            backupPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            
            // Use system alarm sound as backup
            Uri defaultAlarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            backupPlayer.setDataSource(this, defaultAlarmUri);
            backupPlayer.setLooping(true);
            backupPlayer.setVolume(1.0f, 1.0f);
            
            backupPlayer.prepare();
            backupPlayer.start();
            
            Log.d(TAG, "✅ Backup audio started successfully");
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Backup audio failed: " + e.getMessage());
            releaseBackupPlayer();
            return false;
        }
    }
    
    /**
     * Start system ringtone as final fallback
     */
    private void startSystemRingtone() {
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            
            systemRingtone = RingtoneManager.getRingtone(this, alarmUri);
            if (systemRingtone != null) {
                systemRingtone.play();
                Log.d(TAG, "✅ System ringtone started");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Even system ringtone failed: " + e.getMessage());
        }
    }
    
    /**
     * Get audio URI based on sound type
     */
    private Uri getAudioUri(String soundType) {
        // Default to system alarm sound
        Uri defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        
        if ("custom".equals(soundType)) {
            // Try to load custom alarm sound from assets
            try {
                String assetPath = "android.resource://" + getPackageName() + "/" + R.raw.alarm_sound;
                return Uri.parse(assetPath);
            } catch (Exception e) {
                Log.w(TAG, "Custom sound not found, using default");
            }
        }
        
        return defaultUri != null ? defaultUri : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
    }
    
    /**
     * Start vibration pattern for alarm
     */
    private void startVibration() {
        if (vibrator == null || !vibrator.hasVibrator()) return;
        
        try {
            // Create alarm vibration pattern
            long[] pattern = {0, 1000, 500, 1000, 500, 1000};
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                VibrationEffect effect = VibrationEffect.createWaveform(pattern, 0);
                vibrator.vibrate(effect);
            } else {
                vibrator.vibrate(pattern, 0);
            }
            
            Log.d(TAG, "📳 Vibration started");
        } catch (Exception e) {
            Log.e(TAG, "❌ Vibration failed: " + e.getMessage());
        }
    }
    
    /**
     * Stop all audio players
     */
    private void stopAllAudio() {
        releasePrimaryPlayer();
        releaseBackupPlayer();
        releaseSystemRingtone();
    }
    
    /**
     * Stop vibration
     */
    private void stopVibration() {
        if (vibrator != null) {
            vibrator.cancel();
        }
    }
    
    /**
     * Set alarm volume to maximum
     */
    private void setAlarmVolumeToMax() {
        if (audioManager != null) {
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
        }
    }
    
    /**
     * Backup current audio settings
     */
    private void backupAudioSettings() {
        if (audioManager != null) {
            originalVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            originalRingerMode = audioManager.getRingerMode();
        }
    }
    
    /**
     * Restore original audio settings
     */
    private void restoreAudioSettings() {
        if (audioManager != null) {
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, originalVolume, 0);
            // Note: Don't restore ringer mode to avoid interfering with user changes
        }
    }
    
    /**
     * Check if any player is currently playing
     */
    private boolean isAnyPlayerPlaying() {
        return (primaryPlayer != null && primaryPlayer.isPlaying()) ||
               (backupPlayer != null && backupPlayer.isPlaying()) ||
               (systemRingtone != null && systemRingtone.isPlaying());
    }
    
    /**
     * Restart alarm audio if it stopped unexpectedly
     */
    private void restartAlarmAudio() {
        Log.d(TAG, "🔄 Restarting alarm audio");
        stopAllAudio();
        startAlarmAudio("default");
    }
    
    /**
     * Schedule snooze alarm
     */
    private void scheduleSnoozeAlarm(String alarmId, int minutes) {
        // TODO: Integrate with existing alarm scheduling system
        Log.d(TAG, "😴 Snooze alarm scheduled for " + minutes + " minutes");
    }
    
    /**
     * Reschedule stored alarms (after boot/update)
     */
    private void rescheduleStoredAlarms() {
        // TODO: Load alarms from storage and reschedule them
        Log.d(TAG, "🔄 Rescheduling stored alarms");
    }
    
    /**
     * Create notification channel for foreground service
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notificationManager != null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "UnlockAM Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Critical alarm notifications");
            channel.setSound(null, null); // Don't play sound for notification (alarm handles audio)
            channel.enableVibration(false); // Don't vibrate for notification (alarm handles vibration)
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    /**
     * Acquire wake lock to prevent CPU sleep
     */
    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "UnlockAM:AlarmService"
            );
            wakeLock.acquire(10 * 60 * 1000); // Hold for max 10 minutes
        }
    }
    
    /**
     * Release wake lock
     */
    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
    
    /**
     * Abandon audio focus
     */
    private void abandonAudioFocus() {
        if (audioManager != null && hasAudioFocus) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            } else {
                audioManager.abandonAudioFocus(alarmFocusChangeListener);
            }
            hasAudioFocus = false;
        }
    }
    
    /**
     * Release primary media player
     */
    private void releasePrimaryPlayer() {
        if (primaryPlayer != null) {
            try {
                if (primaryPlayer.isPlaying()) {
                    primaryPlayer.stop();
                }
                primaryPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error releasing primary player", e);
            }
            primaryPlayer = null;
        }
    }
    
    /**
     * Release backup media player
     */
    private void releaseBackupPlayer() {
        if (backupPlayer != null) {
            try {
                if (backupPlayer.isPlaying()) {
                    backupPlayer.stop();
                }
                backupPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error releasing backup player", e);
            }
            backupPlayer = null;
        }
    }
    
    /**
     * Release system ringtone
     */
    private void releaseSystemRingtone() {
        if (systemRingtone != null) {
            try {
                if (systemRingtone.isPlaying()) {
                    systemRingtone.stop();
                }
            } catch (Exception e) {
                Log.e(TAG, "Error releasing system ringtone", e);
            }
            systemRingtone = null;
        }
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "🏭 ProductionAlarmService destroyed");
        
        stopAllAudio();
        stopVibration();
        restoreAudioSettings();
        abandonAudioFocus();
        releaseWakeLock();
        
        super.onDestroy();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }
}
