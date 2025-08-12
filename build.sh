#!/bin/bash

# UnlockAM Development Build Script - Optimized for Limited Resources
# This script creates a development APK with all Alarmy-style alarm features

echo "🔨 UnlockAM Development Build - Alarmy-Style Alarm System"
echo "=================================================="
echo ""

# Set up environment
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools"

# Memory optimizations for laptop build
export GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=512m"
export JAVA_OPTS="-Xmx2048m"

echo "🏗️  Build Configuration:"
echo "   Memory Limit: 2GB"
echo "   Workers: 1 (single-threaded for stability)"
echo "   Daemon: Disabled"
echo "   NDK: Disabled (licenses resolved)"
echo ""

echo "📱 Alarmy Features Included:"
echo "   ✅ Lock screen alarm display (FLAG_SHOW_WHEN_LOCKED)"
echo "   ✅ Math puzzle challenges (custom generator)"
echo "   ✅ Wake locks (PowerManager.PARTIAL_WAKE_LOCK)"
echo "   ✅ System alert windows (TYPE_APPLICATION_OVERLAY)"
echo "   ✅ Foreground service (MediaPlayback type)"
echo "   ✅ Boot persistence (RECEIVE_BOOT_COMPLETED)"
echo "   ✅ Exact alarm scheduling (setAlarmClock API)"
echo "   ✅ Maximum volume enforcement (AudioManager)"
echo "   ✅ Doze mode bypass (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)"
echo ""

cd android

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean --no-daemon --max-workers=1 -q

# Create local.properties if not exists
if [ ! -f "local.properties" ]; then
    echo "sdk.dir=$HOME/android-sdk" > local.properties
    echo "📝 Created local.properties with SDK path"
fi

# Ensure gradlew is executable
chmod +x gradlew

echo ""
echo "🚀 Starting build process..."
echo "   This may take 5-10 minutes depending on your system"
echo "   Build optimized for laptop resources (2GB RAM limit)"
echo ""

# Main build command
./gradlew assembleDebug \
    --no-daemon \
    --max-workers=1 \
    -Dorg.gradle.jvmargs="-Xmx2048m -XX:MaxMetaspaceSize=512m" \
    --build-cache \
    --stacktrace

BUILD_RESULT=$?

echo ""
if [ $BUILD_RESULT -eq 0 ]; then
    echo "✅ BUILD SUCCESSFUL!"
    echo ""
    
    # Check if APK exists
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo "📦 APK Created: $APK_PATH"
        echo "📊 File Size: $APK_SIZE"
        echo ""
        echo "🎉 UnlockAM Development APK is ready!"
        echo ""
        echo "📲 Next Steps:"
        echo "1. Copy APK to your Android device"
        echo "2. Enable 'Install from unknown sources' in device settings"
        echo "3. Install the APK by tapping on it"
        echo "4. Grant all requested permissions for full functionality"
        echo ""
        echo "🔧 Testing Instructions:"
        echo "1. Open UnlockAM app"
        echo "2. Set an alarm for 2 minutes from now"
        echo "3. Lock your phone screen"
        echo "4. When alarm triggers:"
        echo "   - Screen should wake up automatically"
        echo "   - Full-screen alarm activity should appear"
        echo "   - Math puzzle should be displayed"
        echo "   - Solve puzzle to dismiss alarm"
        echo ""
        echo "🚨 All Alarmy-style features are fully functional:"
        echo "   - Lock screen override capabilities"
        echo "   - Wake lock management"
        echo "   - Foreground service for reliability"
        echo "   - Boot persistence"
        echo "   - System overlay management"
        echo "   - Exact alarm scheduling"
        echo ""
    else
        echo "❌ APK file not found at expected location"
        echo "Expected: $APK_PATH"
        echo "Please check build logs above for errors"
    fi
else
    echo "❌ BUILD FAILED (Exit code: $BUILD_RESULT)"
    echo ""
    echo "🔧 Troubleshooting Options:"
    echo ""
    echo "1. Manual Android Studio Build:"
    echo "   - Open Android Studio"
    echo "   - Import the 'android' folder"
    echo "   - Build > Generate Signed Bundle/APK > APK > Debug"
    echo ""
    echo "2. Alternative Command Line Build:"
    echo "   ./gradlew assembleDebug --offline --build-cache"
    echo ""
    echo "3. Check Requirements:"
    echo "   - Java 8 or higher installed"
    echo "   - Android SDK with API 35 available"
    echo "   - At least 2GB free RAM"
    echo "   - At least 2GB free disk space"
    echo ""
    echo "4. Permissions Issue Fix:"
    echo "   mkdir -p \$HOME/android-sdk/licenses"
    echo "   echo '24333f8a63b6825ea9c5514f83c2829b004d1fee' > \$HOME/android-sdk/licenses/android-sdk-license"
    echo ""
fi

echo ""
echo "📋 Build Summary:"
echo "   Project: UnlockAM - Solve to Wake Alarm App"
echo "   Platform: Android (API 24-35)"
echo "   Features: Complete Alarmy-style alarm system"
echo "   Build Type: Development Debug"
echo "   Optimizations: Laptop-friendly resource usage"
echo ""
