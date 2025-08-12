#!/bin/bash

echo "🔥 UnlockAM - Development Build with Download Link Generator"
echo "=========================================================="
echo ""
echo "📱 Creating APK with all Alarmy features for direct download"
echo ""

# Build locally first as backup
echo "🏗️  Building locally as backup..."
cd android

# Clean and build
./gradlew clean --no-daemon --max-workers=1 -q
./gradlew assembleDebug --no-daemon --max-workers=1

if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    APK_SIZE=$(du -h "app/build/outputs/apk/debug/app-debug.apk" | cut -f1)
    echo "✅ Local APK built successfully!"
    echo "📦 Size: $APK_SIZE"
    echo "📍 Location: android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    
    # Copy to easily accessible location
    cp "app/build/outputs/apk/debug/app-debug.apk" "../UnlockAM-DevBuild.apk"
    echo "📋 Copied to: UnlockAM-DevBuild.apk (in project root)"
    echo ""
    
    echo "📲 Installation Options:"
    echo ""
    echo "Option 1 - Direct Transfer:"
    echo "• Copy UnlockAM-DevBuild.apk to your phone"
    echo "• Enable 'Unknown Sources' in Android settings"
    echo "• Install the APK"
    echo ""
    echo "Option 2 - Cloud Upload (manual):"
    echo "• Upload UnlockAM-DevBuild.apk to Google Drive/Dropbox"
    echo "• Share link to your phone"
    echo "• Download and install"
    echo ""
    
else
    echo "❌ Local build failed. Trying cloud build..."
fi

cd ..

echo "☁️  Attempting EAS Cloud Build for download link..."
echo "This will create a shareable download link for your phone"
echo ""

# Try cloud build
npx eas build --platform android --profile development --non-interactive

echo ""
echo "🎯 Build Summary:"
echo "• All Alarmy features included (lock screen, math puzzles, wake locks)"
echo "• Development client enabled for testing"
echo "• APK format for direct installation"
echo "• Internal distribution (private download link)"
echo ""
echo "📱 Once cloud build completes:"
echo "• You'll get a download link from Expo"
echo "• Open link on your Android phone"
echo "• Download and install directly"
echo "• No Play Store required!"
echo ""
