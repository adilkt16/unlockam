package com.unlockam.alarmmodule;

import com.unlockam.mobile.devbuild.R;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
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
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class AndroidAlarmAudioService extends Service {
    private static final String TAG = "AndroidAlarmAudioService";
    private static final String CHANNEL_ID = "UnlockAM_Alarm_Channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private MediaPlayer primaryPlayer;
    private MediaPlayer backupPlayer;
    private Ringtone systemRingtone;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private Vibrator vibrator;
    
    private int originalAlarmVolume;
    private int originalRingerMode;
    private boolean isPlaying = false;
    private String currentAlarmId;
    private Map<String, Integer> soundResources;

    // Audio focus change listener - aggressive for locked state
    private AudioManager.OnAudioFocusChangeListener focusChangeListener = new AudioManager.OnAudioFocusChangeListener() {
        @Override
        public void onAudioFocusChange(int focusChange) {
            Log.d(TAG, "🎯 Audio focus change: " + focusChange);
            
            switch (focusChange) {
                case AudioManager.AUDIOFOCUS_GAIN:
                    Log.d(TAG, "✅ Audio focus GAINED - ensuring alarm continues");
                    // Ensure our alarm is still playing
                    if (isPlaying && primaryPlayer != null && !primaryPlayer.isPlaying()) {
                        try {
                            primaryPlayer.start();
                            Log.d(TAG, "✅ Restarted primary player after focus gain");
                        } catch (Exception e) {
                            Log.e(TAG, "❌ Failed to restart after focus gain", e);
                        }
                    }
                    break;
                    
                case AudioManager.AUDIOFOCUS_LOSS:
                    Log.d(TAG, "⚠️ Audio focus LOST - but alarm must continue!");
                    // For alarms, we should NOT stop - this is critical
                    // Immediately request focus back
                    requestAudioFocusAggressively();
                    break;
                    
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                    Log.d(TAG, "⚠️ Audio focus lost TRANSIENT - alarm continues anyway!");
                    // Don't pause alarm - it's critical for wake-up
                    break;
                    
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    Log.d(TAG, "⚠️ Audio focus can duck - but alarm plays at full volume!");
                    // Don't duck alarm volume - maintain maximum volume
                    break;
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "AndroidAlarmAudioService created");
        
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        
        initializeSoundResources();
        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        Log.d(TAG, "Service started with action: " + action);

        switch (action != null ? action : "") {
            case "PLAY_ALARM":
                handlePlayAlarm(intent);
                break;
            case "STOP_ALARM":
                handleStopAlarm(intent);
                break;
            case "PLAY_AUDIO_FILE":
                handlePlayAudioFile(intent);
                break;
            case "TRIGGER_VIBRATION":
                handleTriggerVibration(intent);
                break;
            case "START_FOREGROUND":
                handleStartForeground(intent);
                break;
            default:
                Log.w(TAG, "Unknown action: " + action);
        }

        return START_NOT_STICKY;
    }

    private void initializeSoundResources() {
        soundResources = new HashMap<>();
        soundResources.put("default", R.raw.alarm_sound);
        // Keep legacy mappings for backward compatibility, all pointing to same sound
        soundResources.put("alert", R.raw.alarm_sound);
        soundResources.put("beep", R.raw.alarm_sound);
        soundResources.put("chime", R.raw.alarm_sound);
        soundResources.put("custom", R.raw.alarm_sound);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Alarm Audio Service",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Background alarm audio service");
            channel.enableVibration(false);
            channel.setSound(null, null);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void handlePlayAlarm(Intent intent) {
        try {
            currentAlarmId = intent.getStringExtra("alarmId");
            String soundType = intent.getStringExtra("soundType");
            float volume = intent.getFloatExtra("volume", 1.0f);
            boolean vibration = intent.getBooleanExtra("vibration", false);
            boolean showOverLockscreen = intent.getBooleanExtra("showOverLockscreen", true);
            boolean wakeScreen = intent.getBooleanExtra("wakeScreen", true);
            
            Log.d(TAG, "🚨 PLAYING LOCKED-STATE ALARM - ID: " + currentAlarmId + ", Sound: " + soundType);
            
            // Stop any existing alarm
            stopAllAlarms();
            
            // CRITICAL: Start as foreground service FIRST for maximum survival
            startForeground(NOTIFICATION_ID, createAlarmNotification("🚨 ALARM ACTIVE", "UnlockAM Alarm Playing - Locked State Ready"));
            Log.d(TAG, "✅ Foreground service started");
            
            // CRITICAL: Acquire wake lock to prevent sleep
            acquireWakeLock();
            Log.d(TAG, "✅ Wake lock acquired");
            
            // CRITICAL: Prepare audio system with maximum privileges
            prepareAudioSystemForLockedState(volume);
            Log.d(TAG, "✅ Audio system prepared for locked state");
            
            // CRITICAL: Request audio focus aggressively
            requestAudioFocusAggressively();
            Log.d(TAG, "✅ Audio focus acquired aggressively");
            
            // CRITICAL: Start alarm sound with multiple redundancy
            startAlarmSoundForLockedState(soundType);
            Log.d(TAG, "✅ Locked-state alarm sound started");
            
            // Start vibration if requested
            if (vibration) {
                startVibration();
                Log.d(TAG, "✅ Vibration started");
            }
            
            isPlaying = true;
            Log.d(TAG, "🔊 LOCKED-STATE ALARM FULLY ACTIVE - Should play even when phone is locked!");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ CRITICAL ERROR playing locked-state alarm", e);
            // Emergency fallback
            emergencyAlarmFallback();
        }
    }

    private void handleStopAlarm(Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        Log.d(TAG, "Stopping alarm: " + alarmId);
        
        if (alarmId == null || alarmId.equals(currentAlarmId)) {
            stopAllAlarms();
            stopSelf();
        }
    }

    private void handlePlayAudioFile(Intent intent) {
        String filePath = intent.getStringExtra("filePath");
        float volume = intent.getFloatExtra("volume", 1.0f);
        boolean loop = intent.getBooleanExtra("loop", true);
        
        Log.d(TAG, "Playing audio file: " + filePath);
        
        try {
            stopAllAlarms();
            prepareAudioSystem(volume);
            
            // Play custom audio file
            primaryPlayer = new MediaPlayer();
            setupMediaPlayerForFile(primaryPlayer, filePath, loop);
            primaryPlayer.start();
            
            isPlaying = true;
            
        } catch (Exception e) {
            Log.e(TAG, "Error playing audio file", e);
        }
    }

    private void handleTriggerVibration(Intent intent) {
        // Handle vibration patterns
        if (vibrator != null) {
            startVibration();
        }
    }

    private void handleStartForeground(Intent intent) {
        String title = intent.getStringExtra("title");
        String message = intent.getStringExtra("message");
        
        startForeground(NOTIFICATION_ID, createAlarmNotification(title, message));
    }

    private void prepareAudioSystem(float volume) {
        if (audioManager != null) {
            // Store original settings
            originalAlarmVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            originalRingerMode = audioManager.getRingerMode();
            
            // Set to normal mode and max alarm volume
            audioManager.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            int targetVolume = Math.round(maxVolume * volume);
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, targetVolume, 0);
        }
    }

    /**
     * Enhanced audio system preparation specifically for locked state
     */
    private void prepareAudioSystemForLockedState(float volume) {
        Log.d(TAG, "🔊 Preparing audio system for LOCKED STATE playback...");
        
        if (audioManager != null) {
            try {
                // Store original settings
                originalAlarmVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
                originalRingerMode = audioManager.getRingerMode();
                
                // Force to normal mode (override silent/vibrate)
                audioManager.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
                
                // Set maximum alarm volume for locked state
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, AudioManager.FLAG_SHOW_UI);
                
                // Also boost media volume for redundancy
                int maxMediaVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxMediaVolume, 0);
                
                Log.d(TAG, "✅ Audio system configured for locked state - Volume: " + maxVolume + "/" + maxVolume);
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Failed to prepare audio for locked state", e);
            }
        }
    }

    /**
     * Aggressive audio focus request for locked state
     */
    private void requestAudioFocusAggressively() {
        Log.d(TAG, "🎯 Requesting AGGRESSIVE audio focus for locked state...");
        
        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    AudioAttributes attributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                            .build();
                    
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                            .setAudioAttributes(attributes)
                            .setWillPauseWhenDucked(false)
                            .setAcceptsDelayedFocusGain(false)
                            .setOnAudioFocusChangeListener(focusChangeListener)
                            .build();
                    
                    int result = audioManager.requestAudioFocus(audioFocusRequest);
                    Log.d(TAG, "✅ Aggressive audio focus result: " + 
                          (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED ? "GRANTED" : "DENIED"));
                } else {
                    int result = audioManager.requestAudioFocus(
                            focusChangeListener,
                            AudioManager.STREAM_ALARM,
                            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE
                    );
                    Log.d(TAG, "✅ Legacy audio focus result: " + 
                          (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED ? "GRANTED" : "DENIED"));
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ Failed to request aggressive audio focus", e);
            }
        }
    }

    private void startAlarmSound(String soundType) {
        try {
            // Primary player with app resource
            Integer resourceId = soundResources.get(soundType);
            if (resourceId == null) {
                resourceId = soundResources.get("default");
            }
            
            if (resourceId != null) {
                primaryPlayer = new MediaPlayer();
                setupMediaPlayer(primaryPlayer, resourceId);
                primaryPlayer.start();
                Log.d(TAG, "Primary alarm player started");
                
                // Backup player for redundancy
                backupPlayer = new MediaPlayer();
                setupMediaPlayer(backupPlayer, resourceId);
                new android.os.Handler().postDelayed(() -> {
                    if (backupPlayer != null && isPlaying) {
                        try {
                            backupPlayer.start();
                            Log.d(TAG, "Backup alarm player started");
                        } catch (Exception e) {
                            Log.w(TAG, "Backup player failed", e);
                        }
                    }
                }, 500);
            }
            
            // System ringtone as ultimate fallback
            startSystemRingtone();
            
        } catch (Exception e) {
            Log.e(TAG, "Error starting alarm sound", e);
            // Try system ringtone as fallback
            startSystemRingtone();
        }
    }

    /**
     * Enhanced alarm sound startup specifically for locked state
     */
    private void startAlarmSoundForLockedState(String soundType) {
        Log.d(TAG, "🔊 Starting LOCKED STATE alarm sound with maximum redundancy...");
        
        try {
            // Get the resource ID
            Integer resourceId = soundResources.get(soundType);
            if (resourceId == null) {
                resourceId = soundResources.get("default");
                Log.d(TAG, "⚠️ Sound type '" + soundType + "' not found, using 'default'");
            }
            
            if (resourceId != null) {
                // PRIMARY PLAYER with enhanced settings for locked state
                primaryPlayer = new MediaPlayer();
                setupMediaPlayerForLockedState(primaryPlayer, resourceId);
                primaryPlayer.start();
                Log.d(TAG, "✅ PRIMARY locked-state player started");
                
                // BACKUP PLAYER with delay for redundancy
                backupPlayer = new MediaPlayer();
                setupMediaPlayerForLockedState(backupPlayer, resourceId);
                new android.os.Handler().postDelayed(() -> {
                    if (backupPlayer != null && isPlaying) {
                        try {
                            backupPlayer.start();
                            Log.d(TAG, "✅ BACKUP locked-state player started");
                        } catch (Exception e) {
                            Log.w(TAG, "⚠️ Backup player failed", e);
                        }
                    }
                }, 1000); // Longer delay for locked state
            }
            
            // SYSTEM RINGTONE as ultimate fallback
            startSystemRingtoneForLockedState();
            
            Log.d(TAG, "🎵 ALL AUDIO LAYERS ACTIVE for locked state");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ CRITICAL: Error starting locked-state alarm sound", e);
            emergencyAlarmFallback();
        }
    }

    /**
     * Enhanced MediaPlayer setup for locked state playback
     */
    private void setupMediaPlayerForLockedState(MediaPlayer player, int resourceId) throws IOException {
        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED | AudioAttributes.FLAG_HW_AV_SYNC)
                .build();
        
        player.setAudioAttributes(attributes);
        
        android.content.res.AssetFileDescriptor afd = getResources().openRawResourceFd(resourceId);
        if (afd != null) {
            player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
        }
        
        // Enhanced settings for locked state
        player.setLooping(true);
        player.setVolume(1.0f, 1.0f); // Maximum volume
        player.prepare();
        
        Log.d(TAG, "✅ MediaPlayer configured for locked state with resource ID: " + resourceId);
    }

    /**
     * Enhanced system ringtone for locked state
     */
    private void startSystemRingtoneForLockedState() {
        try {
            Log.d(TAG, "🔔 Starting system ringtone for locked state...");
            
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            
            if (alarmUri != null) {
                systemRingtone = RingtoneManager.getRingtone(this, alarmUri);
                if (systemRingtone != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        systemRingtone.setLooping(true);
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        systemRingtone.setVolume(1.0f); // Maximum volume
                    }
                    systemRingtone.play();
                    Log.d(TAG, "✅ System ringtone started for locked state");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ System ringtone failed for locked state", e);
        }
    }

    /**
     * Emergency fallback when all else fails
     */
    private void emergencyAlarmFallback() {
        Log.d(TAG, "🚨 EMERGENCY ALARM FALLBACK ACTIVATED!");
        
        // Try to play ANY sound available
        try {
            startSystemRingtoneForLockedState();
            
            // Aggressive vibration
            if (vibrator != null) {
                long[] emergencyPattern = {0, 1000, 500, 1000, 500, 1000, 500, 1000};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(emergencyPattern, 0));
                } else {
                    vibrator.vibrate(emergencyPattern, 0);
                }
            }
            
            Log.d(TAG, "✅ Emergency fallback activated");
        } catch (Exception e) {
            Log.e(TAG, "❌ COMPLETE EMERGENCY FAILURE", e);
        }
    }

    private void setupMediaPlayer(MediaPlayer player, int resourceId) throws IOException {
        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                .build();
        
        player.setAudioAttributes(attributes);
        
        android.content.res.AssetFileDescriptor afd = getResources().openRawResourceFd(resourceId);
        if (afd != null) {
            player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
        }
        
        player.setLooping(true);
        player.prepare();
    }

    private void setupMediaPlayerForFile(MediaPlayer player, String filePath, boolean loop) throws IOException {
        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                .build();
        
        player.setAudioAttributes(attributes);
        player.setDataSource(filePath);
        player.setLooping(loop);
        player.prepare();
    }

    private void startSystemRingtone() {
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            
            if (alarmUri != null) {
                systemRingtone = RingtoneManager.getRingtone(this, alarmUri);
                if (systemRingtone != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        systemRingtone.setLooping(true);
                    }
                    systemRingtone.play();
                    Log.d(TAG, "System ringtone started as fallback");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting system ringtone", e);
        }
    }

    private void startVibration() {
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 1000, 500, 1000, 500}; // Vibration pattern
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(android.os.VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
            Log.d(TAG, "Vibration started");
        }
    }

    private void requestAudioFocus() {
        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build())
                        .build();
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }
        }
    }

    private void stopAllAlarms() {
        try {
            isPlaying = false;
            
            if (primaryPlayer != null) {
                primaryPlayer.stop();
                primaryPlayer.release();
                primaryPlayer = null;
                Log.d(TAG, "Primary player stopped");
            }
            
            if (backupPlayer != null) {
                backupPlayer.stop();
                backupPlayer.release();
                backupPlayer = null;
                Log.d(TAG, "Backup player stopped");
            }
            
            if (systemRingtone != null) {
                systemRingtone.stop();
                systemRingtone = null;
                Log.d(TAG, "System ringtone stopped");
            }
            
            if (vibrator != null) {
                vibrator.cancel();
                Log.d(TAG, "Vibration stopped");
            }
            
            // Release audio focus
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            }
            
            // Restore original audio settings
            restoreAudioSystem();
            
        } catch (Exception e) {
            Log.e(TAG, "Error stopping alarms", e);
        }
    }

    private void restoreAudioSystem() {
        if (audioManager != null) {
            try {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, originalAlarmVolume, 0);
                audioManager.setRingerMode(originalRingerMode);
            } catch (Exception e) {
                Log.e(TAG, "Error restoring audio system", e);
            }
        }
    }

    private Notification createAlarmNotification(String title, String message) {
        Intent intent = new Intent(this, AlarmActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(pendingIntent, true)
                .build();
    }

    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                        "UnlockAM:AlarmAudioWakeLock"
                );
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(10 * 60 * 1000L); // 10 minutes max
                Log.d(TAG, "Wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to acquire wake lock", e);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.d(TAG, "Wake lock released");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error releasing wake lock", e);
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "AndroidAlarmAudioService destroyed");
        stopAllAlarms();
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // This is not a bound service
    }
}
