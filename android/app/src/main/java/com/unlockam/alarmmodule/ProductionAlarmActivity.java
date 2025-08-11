package com.unlockam.alarmmodule;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.unlockam.mobile.devbuild.R;

/**
 * Production-ready alarm activity that displays over lock screen.
 * 
 * Key design decisions:
 * 1. Uses proper flags for showing over lock screen across Android versions
 * 2. Handles keyguard dismissal when possible
 * 3. Provides snooze/dismiss controls with clear feedback
 * 4. Falls back gracefully if lockscreen permissions are denied
 * 5. Wakes screen and keeps it on during alarm
 */
public class ProductionAlarmActivity extends Activity {
    
    private static final String TAG = "ProductionAlarmActivity";
    private static final int SNOOZE_MINUTES = 5;
    
    private String alarmId;
    private String alarmLabel;
    private PowerManager.WakeLock screenWakeLock;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "🏃 Production alarm activity created");
        
        // Extract alarm details
        Intent intent = getIntent();
        alarmId = intent.getStringExtra("alarmId");
        alarmLabel = intent.getStringExtra("label");
        
        if (alarmId == null) {
            Log.e(TAG, "❌ No alarm ID provided, finishing activity");
            finish();
            return;
        }
        
        Log.d(TAG, "📋 Alarm details: ID=" + alarmId + ", Label=" + alarmLabel);
        
        // Configure for lockscreen display
        configureLockScreenDisplay();
        
        // Wake up screen
        wakeUpScreen();
        
        // Setup UI
        setupAlarmUI();
    }
    
    /**
     * Configure activity to display over lock screen
     */
    private void configureLockScreenDisplay() {
        Log.d(TAG, "🔒 Configuring lockscreen display");
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                // Android 8.1+ approach
                setShowWhenLocked(true);
                setTurnScreenOn(true);
                
                // Also dismiss keyguard if possible
                KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                if (keyguardManager != null) {
                    keyguardManager.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                        @Override
                        public void onDismissSucceeded() {
                            Log.d(TAG, "✅ Keyguard dismissed successfully");
                        }
                        
                        @Override
                        public void onDismissCancelled() {
                            Log.d(TAG, "⚠️ Keyguard dismiss cancelled");
                        }
                        
                        @Override
                        public void onDismissError() {
                            Log.d(TAG, "❌ Keyguard dismiss error");
                        }
                    });
                }
                
            } else {
                // Legacy Android approach
                getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    WindowManager.LayoutParams.FLAG_FULLSCREEN
                );
            }
            
            // Always keep screen on during alarm
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            
            Log.d(TAG, "✅ Lockscreen display configured");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to configure lockscreen display: " + e.getMessage());
            // Continue anyway - at least show the activity if possible
        }
    }
    
    /**
     * Wake up the screen using PowerManager
     */
    private void wakeUpScreen() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                screenWakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "UnlockAM:AlarmScreen"
                );
                screenWakeLock.acquire(10 * 60 * 1000); // Keep for 10 minutes max
                
                Log.d(TAG, "✅ Screen wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to wake screen: " + e.getMessage());
        }
    }
    
    /**
     * Setup alarm UI with snooze/dismiss controls
     */
    private void setupAlarmUI() {
        try {
            // Create programmatic UI (safer than XML for production alarms)
            LinearLayout mainLayout = new LinearLayout(this);
            mainLayout.setOrientation(LinearLayout.VERTICAL);
            mainLayout.setPadding(40, 100, 40, 100);
            mainLayout.setBackgroundColor(0xFF1A1A1A); // Dark background
            
            // Alarm title
            TextView titleText = new TextView(this);
            titleText.setText("🚨 ALARM");
            titleText.setTextSize(36);
            titleText.setTextColor(0xFFFFFFFF);
            titleText.setGravity(android.view.Gravity.CENTER);
            titleText.setPadding(0, 0, 0, 40);
            mainLayout.addView(titleText);
            
            // Alarm label
            TextView labelText = new TextView(this);
            labelText.setText(alarmLabel != null ? alarmLabel : "Wake up!");
            labelText.setTextSize(24);
            labelText.setTextColor(0xFFCCCCCC);
            labelText.setGravity(android.view.Gravity.CENTER);
            labelText.setPadding(0, 0, 0, 80);
            mainLayout.addView(labelText);
            
            // Dismiss button
            Button dismissButton = new Button(this);
            dismissButton.setText("DISMISS ALARM");
            dismissButton.setTextSize(20);
            dismissButton.setBackgroundColor(0xFFFF4444);
            dismissButton.setTextColor(0xFFFFFFFF);
            dismissButton.setPadding(40, 30, 40, 30);
            dismissButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    dismissAlarm();
                }
            });
            
            LinearLayout.LayoutParams dismissParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            dismissParams.setMargins(0, 0, 0, 20);
            dismissButton.setLayoutParams(dismissParams);
            mainLayout.addView(dismissButton);
            
            // Snooze button
            Button snoozeButton = new Button(this);
            snoozeButton.setText("SNOOZE (" + SNOOZE_MINUTES + " MIN)");
            snoozeButton.setTextSize(20);
            snoozeButton.setBackgroundColor(0xFF4444FF);
            snoozeButton.setTextColor(0xFFFFFFFF);
            snoozeButton.setPadding(40, 30, 40, 30);
            snoozeButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    snoozeAlarm();
                }
            });
            
            LinearLayout.LayoutParams snoozeParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            snoozeButton.setLayoutParams(snoozeParams);
            mainLayout.addView(snoozeButton);
            
            setContentView(mainLayout);
            Log.d(TAG, "✅ Alarm UI created programmatically");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to setup UI: " + e.getMessage());
            // Fallback: just show a basic message
            setupFallbackUI();
        }
    }
    
    /**
     * Setup fallback UI if main UI fails
     */
    private void setupFallbackUI() {
        TextView fallbackText = new TextView(this);
        fallbackText.setText("🚨 ALARM ACTIVE 🚨\n\n" + (alarmLabel != null ? alarmLabel : "Wake up!"));
        fallbackText.setTextSize(24);
        fallbackText.setTextColor(0xFFFFFFFF);
        fallbackText.setBackgroundColor(0xFF1A1A1A);
        fallbackText.setGravity(android.view.Gravity.CENTER);
        fallbackText.setPadding(40, 40, 40, 40);
        
        // Make it clickable to dismiss
        fallbackText.setClickable(true);
        fallbackText.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismissAlarm();
            }
        });
        
        setContentView(fallbackText);
        Log.d(TAG, "✅ Fallback UI created");
    }
    
    /**
     * Dismiss alarm
     */
    private void dismissAlarm() {
        Log.d(TAG, "🛑 User dismissed alarm: " + alarmId);
        
        // Send stop command to service
        Intent stopIntent = new Intent(this, ProductionAlarmService.class);
        stopIntent.setAction("STOP_ALARM");
        stopIntent.putExtra("alarmId", alarmId);
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(stopIntent);
            } else {
                startService(stopIntent);
            }
            
            Log.d(TAG, "✅ Stop command sent to service");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to send stop command: " + e.getMessage());
        }
        
        // Also try to start main app
        launchMainApp();
        
        // Finish this activity
        finish();
    }
    
    /**
     * Snooze alarm
     */
    private void snoozeAlarm() {
        Log.d(TAG, "😴 User snoozed alarm: " + alarmId + " for " + SNOOZE_MINUTES + " minutes");
        
        // Send snooze command to service
        Intent snoozeIntent = new Intent(this, ProductionAlarmService.class);
        snoozeIntent.setAction("SNOOZE_ALARM");
        snoozeIntent.putExtra("alarmId", alarmId);
        snoozeIntent.putExtra("snoozeMinutes", SNOOZE_MINUTES);
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(snoozeIntent);
            } else {
                startService(snoozeIntent);
            }
            
            Log.d(TAG, "✅ Snooze command sent to service");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to send snooze command: " + e.getMessage());
        }
        
        // Finish this activity
        finish();
    }
    
    /**
     * Launch main app when alarm is dismissed
     */
    private void launchMainApp() {
        try {
            Intent mainIntent = new Intent();
            mainIntent.setClassName(this, "com.unlockam.MainActivity");
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(mainIntent);
            
            Log.d(TAG, "✅ Main app launched");
        } catch (Exception e) {
            Log.e(TAG, "⚠️ Failed to launch main app: " + e.getMessage());
            // Not critical - user can manually open app
        }
    }
    
    @Override
    public void onBackPressed() {
        // Prevent back button from dismissing alarm
        Log.d(TAG, "⚠️ Back button pressed - ignoring during alarm");
        // Don't call super.onBackPressed()
    }
    
    @Override
    protected void onDestroy() {
        Log.d(TAG, "🏃 Production alarm activity destroyed");
        
        // Release screen wake lock
        if (screenWakeLock != null && screenWakeLock.isHeld()) {
            screenWakeLock.release();
        }
        
        super.onDestroy();
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        // Don't do anything special - let the activity stay visible if possible
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "🏃 Production alarm activity resumed");
    }
}
