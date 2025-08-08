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

        // Create intent to start the alarm service
        Intent serviceIntent = new Intent(context, AndroidAlarmAudioService.class);
        serviceIntent.setAction("PLAY_ALARM");
        serviceIntent.putExtra("alarmId", alarmId);
        serviceIntent.putExtra("soundType", soundType);
        serviceIntent.putExtra("vibration", vibration);
        serviceIntent.putExtra("label", label);

        // Start the alarm service
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
