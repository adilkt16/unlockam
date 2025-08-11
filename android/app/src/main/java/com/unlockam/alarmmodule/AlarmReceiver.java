package com.unlockam.alarmmodule;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        String soundType = intent.getStringExtra("soundType");
        boolean vibration = intent.getBooleanExtra("vibration", true);
        String label = intent.getStringExtra("label");

        Intent serviceIntent = new Intent(context, AndroidAlarmAudioService.class);
        
        // Handle stop alarm requests
        if ("stop".equals(soundType)) {
            serviceIntent.setAction("STOP_ALARM");
            serviceIntent.putExtra("alarmId", alarmId.replace("-stop", ""));
        } else {
            // Handle play alarm requests
            serviceIntent.setAction("PLAY_ALARM");
            serviceIntent.putExtra("soundType", soundType);
            serviceIntent.putExtra("vibration", vibration);
            serviceIntent.putExtra("label", label);
        }
        
        serviceIntent.putExtra("alarmId", alarmId);

        // Start the alarm service
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
