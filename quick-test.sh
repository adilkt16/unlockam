#!/bin/bash

# UnlockAM Alarm Test Script
# This script provides local development testing while EAS builds complete

echo "🚀 UnlockAM Alarm System - Local Development Test"
echo "=================================================="

# Check if Metro is running
if ! pgrep -f "metro" > /dev/null; then
    echo "📱 Starting Metro bundler..."
    npm start &
    METRO_PID=$!
    echo "⏳ Waiting for Metro to start (30 seconds)..."
    sleep 30
else
    echo "✅ Metro bundler is already running"
fi

echo ""
echo "🔧 Quick Test Options:"
echo ""
echo "1. 📱 Development Build (requires Android device/emulator):"
echo "   npx expo run:android"
echo ""
echo "2. 🌐 Expo Go Testing (limited native features):"
echo "   npx expo start --tunnel"
echo ""
echo "3. ☁️ EAS Build Status:"
echo "   eas build:list --platform android --limit 3"
echo ""
echo "📋 Testing Instructions Once App Is Running:"
echo "=============================================="
echo ""
echo "✅ Test 1: 'Test Alarm in 30 Seconds'"
echo "   - Tap the button"
echo "   - IMMEDIATELY lock your phone"
echo "   - Wait 30 seconds"
echo "   - Alarm should play even with phone locked"
echo ""
echo "✅ Test 2: 'Test Native Service NOW'"
echo "   - Tap the button"
echo "   - IMMEDIATELY lock your phone" 
echo "   - Audio should play immediately"
echo ""
echo "✅ Test 3: 'Test Lock Screen Interface'"
echo "   - Shows full alarm screen with math puzzle"
echo "   - Tests complete wake-up experience"
echo ""
echo "🔧 If Tests Don't Work:"
echo "======================"
echo "• Native modules need compilation (EAS Build or expo run:android)"
echo "• Metro refresh won't work for native features"
echo "• Check permissions in Android Settings"
echo "• Disable battery optimization for the app"
echo ""
echo "💡 Current Build Status:"
echo "EAS Build is running in the background with optimized settings for your laptop specs."
echo ""

read -p "Press Enter to check current EAS build status..."

cd /home/user/Desktop/projects/unlock-both/unlockam
eas build:list --platform android --limit 3
