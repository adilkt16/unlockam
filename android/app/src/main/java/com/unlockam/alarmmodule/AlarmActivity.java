package com.unlockam.alarmmodule;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Toast;

public class AlarmActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Set flags to show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        // Get alarm details from intent
        String alarmId = getIntent().getStringExtra("alarmId");
        String label = getIntent().getStringExtra("label");

        // Show a toast notification that alarm is playing
        Toast.makeText(this, "Alarm: " + (label != null ? label : "Wake up!"), Toast.LENGTH_LONG).show();

        // Start the main app activity
        try {
            Intent mainIntent = new Intent();
            mainIntent.setClassName(this, "com.unlockam.MainActivity");
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(mainIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Finish this activity after starting main activity
        finish();
    }
}
