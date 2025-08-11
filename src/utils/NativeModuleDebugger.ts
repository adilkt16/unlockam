import { NativeModules, Platform } from 'react-native';

export class NativeModuleDebugger {
  static testAndroidAlarmAudioAvailability() {
    console.log('🔍 NATIVE MODULE DEBUG STARTED');
    console.log(`Platform: ${Platform.OS}`);
    
    if (Platform.OS !== 'android') {
      console.log('❌ Not on Android - native module not available');
      return false;
    }

    // Check if NativeModules is available
    console.log('📱 NativeModules available:', !!NativeModules);
    
    // List all available native modules
    if (NativeModules) {
      const moduleNames = Object.keys(NativeModules);
      console.log('📋 Available native modules:', moduleNames.slice(0, 10)); // Show first 10 to avoid spam
      console.log(`📊 Total native modules: ${moduleNames.length}`);
      
      // Check specifically for AndroidAlarmAudio
      if (NativeModules.AndroidAlarmAudio) {
        console.log('✅ AndroidAlarmAudio module found!');
        console.log('🔧 Module methods:', Object.keys(NativeModules.AndroidAlarmAudio));
        
        // Test if the method exists
        if (typeof NativeModules.AndroidAlarmAudio.playLockedStateAlarm === 'function') {
          console.log('✅ playLockedStateAlarm method available');
          return true;
        } else {
          console.log('❌ playLockedStateAlarm method not found');
          console.log('Available methods:', Object.keys(NativeModules.AndroidAlarmAudio));
          return false;
        }
      } else {
        console.log('❌ AndroidAlarmAudio module NOT found');
        console.log('🔍 Similar modules:', moduleNames.filter(name => 
          name.toLowerCase().includes('alarm') || name.toLowerCase().includes('audio')
        ));
        return false;
      }
    } else {
      console.log('❌ NativeModules object not available');
      return false;
    }
  }

  static async testNativeServiceCall() {
    console.log('🚀 TESTING NATIVE SERVICE CALL');
    
    if (!this.testAndroidAlarmAudioAvailability()) {
      console.log('❌ Native module not available - cannot test service call');
      return false;
    }

    try {
      console.log('📞 Calling AndroidAlarmAudio.playLockedStateAlarm...');
      const testOptions = {
        alarmId: 'debug_test',
        soundType: 'default',
        volume: 1.0,
        vibration: true,
        showOverLockscreen: true,
        wakeScreen: true
      };
      const result = await NativeModules.AndroidAlarmAudio.playLockedStateAlarm(testOptions);
      console.log('✅ Native service call successful:', result);
      return true;
    } catch (error) {
      console.log('❌ Native service call failed:', error);
      return false;
    }
  }
}
