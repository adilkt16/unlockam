/**
 * Test script for Bulletproof Alarm System
 * Run this in React Native to verify the alarm system works
 */

import { BulletproofAlarmService } from '../src/services/BulletproofAlarmService';
import { AlarmService } from '../src/services/AlarmService';

export class BulletproofAlarmTest {
  private bulletproofService = BulletproofAlarmService.getInstance();
  private alarmService = AlarmService.getInstance();

  /**
   * Test 1: Immediate alarm trigger (for testing)
   */
  async testImmediateAlarm(): Promise<void> {
    console.log('🧪 TEST 1: Testing immediate alarm trigger...');
    
    try {
      await this.bulletproofService.triggerBulletproofAlarm();
      console.log('✅ Immediate alarm triggered successfully');
      
      // Stop after 10 seconds
      setTimeout(async () => {
        await this.bulletproofService.stopAlarm();
        console.log('⏹️ Test alarm stopped');
      }, 10000);
      
    } catch (error) {
      console.error('❌ Immediate alarm test failed:', error);
    }
  }

  /**
   * Test 2: Scheduled alarm (1 minute from now)
   */
  async testScheduledAlarm(): Promise<void> {
    console.log('🧪 TEST 2: Testing scheduled alarm...');
    
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60000); // 1 minute from now
      const endTime = new Date(now.getTime() + 120000); // 2 minutes from now
      
      const scheduled = await this.bulletproofService.scheduleAlarm(
        startTime.toISOString(),
        endTime.toISOString()
      );
      
      if (scheduled) {
        console.log('✅ Scheduled alarm set for:', startTime.toLocaleTimeString());
        console.log('📱 Lock your phone and wait for the alarm!');
      } else {
        console.error('❌ Failed to schedule alarm');
      }
      
    } catch (error) {
      console.error('❌ Scheduled alarm test failed:', error);
    }
  }

  /**
   * Test 3: Enhanced AlarmService integration
   */
  async testEnhancedAlarmService(): Promise<void> {
    console.log('🧪 TEST 3: Testing enhanced AlarmService integration...');
    
    try {
      // Create a test alarm using the enhanced AlarmService
      const now = new Date();
      const startTime = new Date(now.getTime() + 30000); // 30 seconds from now
      const endTime = new Date(now.getTime() + 90000); // 90 seconds from now
      
      // Schedule using the enhanced AlarmService
      const scheduled = await this.alarmService.scheduleAlarm(
        startTime.toISOString(),
        endTime.toISOString()
      );
      
      if (scheduled) {
        console.log('✅ Test alarm created with enhanced AlarmService');
        console.log('📱 Enhanced alarm will trigger in 30 seconds!');
      } else {
        console.error('❌ Failed to schedule alarm with AlarmService');
      }
      
    } catch (error) {
      console.error('❌ Enhanced AlarmService test failed:', error);
    }
  }

  /**
   * Test 4: Stop all alarms
   */
  async testStopAllAlarms(): Promise<void> {
    console.log('🧪 TEST 4: Stopping all alarms...');
    
    try {
      await this.bulletproofService.stopAlarm();
      await this.alarmService.forceStopEverything();
      console.log('✅ All alarms stopped successfully');
      
    } catch (error) {
      console.error('❌ Stop alarms test failed:', error);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Bulletproof Alarm System Tests...');
    console.log('=' .repeat(50));
    
    // Test immediate trigger (comment out if you don't want immediate sound)
    // await this.testImmediateAlarm();
    
    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test scheduled alarm
    await this.testScheduledAlarm();
    
    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test enhanced AlarmService
    await this.testEnhancedAlarmService();
    
    console.log('=' .repeat(50));
    console.log('🎉 All tests initiated! Check logs for results.');
    console.log('💡 To stop all alarms manually, call: testStopAllAlarms()');
  }
}

// Export for easy usage
export const testBulletproofAlarm = new BulletproofAlarmTest();

// Usage in React Native:
// import { testBulletproofAlarm } from './tests/BulletproofAlarmTest';
// testBulletproofAlarm.runAllTests();
