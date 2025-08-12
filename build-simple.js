const { exec } = require('child_process');
const path = require('path');

console.log('🔨 Building UnlockAM Development APK...');
console.log('📱 This includes all Alarmy-style features:');
console.log('   ✅ Lock screen alarms with math puzzles');
console.log('   ✅ Wake locks and system alert windows');
console.log('   ✅ Maximum volume alarm playback');
console.log('   ✅ Foreground service for reliability');
console.log('   ✅ Boot receiver for alarm persistence');

const buildCommands = [
  'cd android',
  'export ANDROID_HOME="$HOME/android-sdk"',
  'export ANDROID_SDK_ROOT="$ANDROID_HOME"',
  'chmod +x gradlew',
  './gradlew clean',
  './gradlew assembleDebug --no-daemon --max-workers=1'
];

const command = buildCommands.join(' && ');

exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Build failed:', error.message);
    console.log('📋 Build output:', stdout);
    console.log('⚠️  Build errors:', stderr);
    
    // Try alternative build
    console.log('🔄 Trying alternative build method...');
    
    const altCommand = 'cd android && ./gradlew assembleDebug --offline --build-cache --no-daemon';
    exec(altCommand, (altError, altStdout, altStderr) => {
      if (altError) {
        console.error('❌ Alternative build also failed:', altError.message);
        console.log('💡 Manual build instructions:');
        console.log('1. Open Android Studio');
        console.log('2. Import the android/ folder');
        console.log('3. Build > Generate Signed Bundle/APK');
        console.log('4. Choose APK > Debug variant');
      } else {
        console.log('✅ Alternative build succeeded!');
        console.log(altStdout);
        checkForAPK();
      }
    });
  } else {
    console.log('✅ Build succeeded!');
    console.log(stdout);
    checkForAPK();
  }
});

function checkForAPK() {
  const fs = require('fs');
  const apkPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
  
  if (fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('🎉 APK created successfully!');
    console.log(`📦 File: ${apkPath}`);
    console.log(`📊 Size: ${fileSizeInMB} MB`);
    console.log('');
    console.log('📲 Installation instructions:');
    console.log('1. Enable "Install from unknown sources" on your Android device');
    console.log('2. Transfer the APK to your phone');
    console.log('3. Tap the APK file to install');
    console.log('');
    console.log('🔧 Testing the Alarmy features:');
    console.log('1. Set an alarm for 1-2 minutes from now');
    console.log('2. Lock your phone screen');
    console.log('3. The alarm should wake the screen and show math puzzle');
    console.log('4. Solve the puzzle to dismiss the alarm');
    console.log('');
    console.log('🚨 All permissions will be requested automatically for:');
    console.log('   - System alert window (for lock screen display)');
    console.log('   - Exact alarms (for reliable triggering)');
    console.log('   - Battery optimization exemption (for background operation)');
  } else {
    console.log('❌ APK not found. Build may have failed.');
    console.log('📁 Expected location:', apkPath);
  }
}
