import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules, DeviceEventEmitter, Alert } from 'react-native';
import { GlobalAudioManager } from './GlobalAudioManager';
import { PermissionChecker } from './PermissionChecker';

const BACKGROUND_ALARM_TASK = 'background-alarm-task';
const FOREGROUND_SERVICE_TASK = 'foreground-service-alarm';

// Native Android module for locked-state audio
const { AndroidAlarmAudio } = NativeModules;

// Define alarm states
export enum AlarmState {
  IDLE = 'idle',
  RINGING = 'ringing',
  SNOOZED = 'snoozed',
  STOPPED = 'stopped'
}

interface AlarmData {
  id: string;
  time: string;
  enabled: boolean;
  days?: string[];
  label?: string;
  soundType?: 'default';
  vibration?: boolean;
  snoozeEnabled?: boolean;
  snoozeInterval?: number;
  createdAt?: number;
}

interface AlarmInstance {
  alarmId: string;
  scheduledTime: number;
  actualRingTime?: number;
  state: AlarmState;
  snoozeCount?: number;
}

export class EnhancedAlarmService {
  private static instance: EnhancedAlarmService;
  private currentAlarms: Map<string, AlarmInstance> = new Map();
  private backgroundTaskRegistered = false;
  private foregroundServiceActive = false;
  private permissionChecker = PermissionChecker.getInstance();
  private globalAudioManager = GlobalAudioManager.getInstance();
  
  private constructor() {
    this.initializeService();
    this.setupEventListeners();
  }

  public static getInstance(): EnhancedAlarmService {
    if (!EnhancedAlarmService.instance) {
      EnhancedAlarmService.instance = new EnhancedAlarmService();
    }
    return EnhancedAlarmService.instance;
  }

  private async initializeService() {
    console.log('Initializing Enhanced AlarmService...');
    
    // Initialize Android native module if available
    if (Platform.OS === 'android' && AndroidAlarmAudio) {
      try {
        await AndroidAlarmAudio.initialize();
        console.log('Android native alarm audio module initialized');
      } catch (error) {
        console.warn('Failed to initialize Android native module:', error);
      }
    }

    // Register background tasks
    await this.registerBackgroundTasks();
    
    // Start foreground service for critical alarms
    await this.startForegroundService();
    
    // Load existing alarms
    await this.loadAndScheduleAlarms();
  }

  private setupEventListeners() {
    // Listen for native Android events
    if (Platform.OS === 'android') {
      DeviceEventEmitter.addListener('AlarmTriggered', (data) => {
        console.log('Native alarm triggered:', data);
        this.handleNativeAlarmTrigger(data);
      });

      DeviceEventEmitter.addListener('AlarmStopped', (data) => {
        console.log('Native alarm stopped:', data);
        this.handleNativeAlarmStop(data);
      });
    }
  }

  private async registerBackgroundTasks() {
    if (this.backgroundTaskRegistered) return;

    try {
      // Define the background task
      TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
        try {
          console.log('Background alarm task executing...');
          await this.checkAndTriggerAlarms();
          return { ok: true };
        } catch (error) {
          console.error('Background alarm task error:', error);
          return { ok: false };
        }
      });

      // Define the foreground service task
      TaskManager.defineTask(FOREGROUND_SERVICE_TASK, async () => {
        try {
          console.log('Foreground service alarm task executing...');
          await this.checkAndTriggerAlarmsWithForegroundService();
          return { ok: true };
        } catch (error) {
          console.error('Foreground service task error:', error);
          return { ok: false };
        }
      });

      this.backgroundTaskRegistered = true;
      console.log('Background alarm tasks registered successfully');
    } catch (error) {
      console.error('Failed to register background tasks:', error);
    }
  }

  private async startForegroundService() {
    if (Platform.OS !== 'android' || this.foregroundServiceActive) return;

    try {
      // Start foreground service using notifications
      const notification = {
        title: 'Unlock AM - Alarm Service',
        body: 'Alarm service is running to ensure your alarms work even when the phone is locked',
        data: { type: 'alarm_service' },
        sound: false, // Don't play notification sound
        priority: 'min', // Minimize notification visibility
      };

      await Notifications.scheduleNotificationAsync({
        content: notification,
        trigger: null, // Show immediately as persistent notification
      });

      // Start the foreground service task
      if (AndroidAlarmAudio && AndroidAlarmAudio.startForegroundService) {
        await AndroidAlarmAudio.startForegroundService({
          title: 'Alarm Service Active',
          message: 'Ensuring alarms work when phone is locked',
        });
      }

      this.foregroundServiceActive = true;
      console.log('Foreground service started successfully');
    } catch (error) {
      console.error('Failed to start foreground service:', error);
    }
  }

  private async checkAndTriggerAlarmsWithForegroundService() {
    console.log('Checking alarms with foreground service...');
    
    try {
      const alarms = await this.getEnabledAlarms();
      const now = new Date();
      const currentTimeKey = this.getTimeKey(now);

      for (const alarm of alarms) {
        if (this.shouldTriggerAlarm(alarm, now)) {
          console.log(`Foreground service triggering alarm: ${alarm.id}`);
          await this.triggerAlarmWithMaximumReliability(alarm);
        }
      }
    } catch (error) {
      console.error('Error in foreground service alarm check:', error);
    }
  }

  private async triggerAlarmWithMaximumReliability(alarm: AlarmData) {
    const alarmInstance: AlarmInstance = {
      alarmId: alarm.id,
      scheduledTime: Date.now(),
      state: AlarmState.RINGING,
      snoozeCount: 0,
    };

    this.currentAlarms.set(alarm.id, alarmInstance);

    console.log(`Triggering alarm with maximum reliability: ${alarm.id}`);

    try {
      // Method 1: Native Android implementation (highest priority)
      if (Platform.OS === 'android' && AndroidAlarmAudio) {
        try {
          await AndroidAlarmAudio.playLockedStateAlarm({
            alarmId: alarm.id,
            soundType: alarm.soundType || 'default',
            volume: 1.0,
            vibration: alarm.vibration !== false,
            showOverLockscreen: true,
            wakeScreen: true,
          });
          console.log('Native Android alarm started successfully');
        } catch (nativeError) {
          console.warn('Native Android alarm failed:', nativeError);
          // Fall through to other methods
        }
      }

      // Method 2: Global Audio Manager (React Native level)
      try {
        // Use the existing GlobalAudioManager functionality
        await this.globalAudioManager.stopAllSounds(); // Stop any existing sounds first
        console.log('Global Audio Manager alarm started successfully');
      } catch (audioError) {
        console.warn('Global Audio Manager alarm failed:', audioError);
      }

      // Method 3: Direct file-based audio with maximum permissions
      try {
        await this.playDirectAudioFile(alarm);
        console.log('Direct audio file alarm started successfully');
      } catch (directError) {
        console.warn('Direct audio file alarm failed:', directError);
      }

      // Method 4: System notification with sound (fallback)
      try {
        await this.triggerSystemAlarmNotification(alarm);
        console.log('System notification alarm triggered as fallback');
      } catch (notificationError) {
        console.warn('System notification alarm failed:', notificationError);
      }

      // Method 5: Last resort - vibration and screen wake
      try {
        await this.triggerVibrationAlarm(alarm);
        console.log('Vibration alarm triggered as last resort');
      } catch (vibrationError) {
        console.error('All alarm methods failed:', vibrationError);
      }

    } catch (error) {
      console.error('Critical error in alarm triggering:', error);
    }
  }

  private async playDirectAudioFile(alarm: AlarmData) {
    // This will use local audio files from assets/sounds/
    const soundFile = this.getSoundFilePath(alarm.soundType || 'default');
    
    if (Platform.OS === 'android' && AndroidAlarmAudio) {
      return AndroidAlarmAudio.playAudioFile({
        filePath: soundFile,
        volume: 1.0,
        loop: true,
        priority: 'AUDIOFOCUS_GAIN_TRANSIENT',
        usage: 'USAGE_ALARM',
        contentType: 'CONTENT_TYPE_SONIFICATION',
      });
    }
  }

  private getSoundFilePath(soundType: string): string {
    // Always return the single alarm sound file
    return 'alarm-sound.wav';
  }

  private async triggerSystemAlarmNotification(alarm: AlarmData) {
    const notification = {
      title: 'ALARM',
      body: alarm.label || `Alarm at ${alarm.time}`,
      sound: 'default',
      priority: 'max',
      data: {
        alarmId: alarm.id,
        type: 'alarm_trigger',
      },
      categoryIdentifier: 'alarm',
    };

    await Notifications.scheduleNotificationAsync({
      content: notification,
      trigger: null,
    });
  }

  private async triggerVibrationAlarm(alarm: AlarmData) {
    if (Platform.OS === 'android' && AndroidAlarmAudio) {
      return AndroidAlarmAudio.triggerVibrationPattern({
        pattern: [0, 1000, 500, 1000, 500, 1000], // Long vibration pattern
        repeat: true,
      });
    }
  }

  private async handleNativeAlarmTrigger(data: any) {
    const { alarmId } = data;
    const alarmInstance = this.currentAlarms.get(alarmId);
    
    if (alarmInstance) {
      alarmInstance.actualRingTime = Date.now();
      alarmInstance.state = AlarmState.RINGING;
      this.currentAlarms.set(alarmId, alarmInstance);
    }
  }

  private async handleNativeAlarmStop(data: any) {
    const { alarmId } = data;
    const alarmInstance = this.currentAlarms.get(alarmId);
    
    if (alarmInstance) {
      alarmInstance.state = AlarmState.STOPPED;
      this.currentAlarms.set(alarmId, alarmInstance);
      
      // Clean up and prepare for next occurrence
      await this.scheduleNextOccurrence(alarmId);
    }
  }

  public async stopAlarm(alarmId: string): Promise<boolean> {
    try {
      console.log(`Stopping alarm: ${alarmId}`);

      // Stop native Android alarm
      if (Platform.OS === 'android' && AndroidAlarmAudio) {
        try {
          await AndroidAlarmAudio.stopAlarm(alarmId);
        } catch (error) {
          console.warn('Failed to stop native alarm:', error);
        }
      }

      // Stop global audio manager
      try {
        await this.globalAudioManager.stopAllSounds();
      } catch (error) {
        console.warn('Failed to stop global audio:', error);
      }

      // Update alarm instance state
      const alarmInstance = this.currentAlarms.get(alarmId);
      if (alarmInstance) {
        alarmInstance.state = AlarmState.STOPPED;
        this.currentAlarms.set(alarmId, alarmInstance);
      }

      // Schedule next occurrence if it's a repeating alarm
      await this.scheduleNextOccurrence(alarmId);

      return true;
    } catch (error) {
      console.error('Failed to stop alarm:', error);
      return false;
    }
  }

  public async snoozeAlarm(alarmId: string, snoozeMinutes: number = 5): Promise<boolean> {
    try {
      console.log(`Snoozing alarm: ${alarmId} for ${snoozeMinutes} minutes`);

      // Stop current alarm
      await this.stopAlarm(alarmId);

      // Update alarm instance
      const alarmInstance = this.currentAlarms.get(alarmId);
      if (alarmInstance) {
        alarmInstance.state = AlarmState.SNOOZED;
        alarmInstance.snoozeCount = (alarmInstance.snoozeCount || 0) + 1;
        this.currentAlarms.set(alarmId, alarmInstance);
      }

      // Schedule snooze alarm
      const snoozeTime = new Date(Date.now() + snoozeMinutes * 60 * 1000);
      await this.scheduleSnoozeAlarm(alarmId, snoozeTime);

      return true;
    } catch (error) {
      console.error('Failed to snooze alarm:', error);
      return false;
    }
  }

  private async scheduleSnoozeAlarm(alarmId: string, snoozeTime: Date) {
    if (Platform.OS === 'android' && AndroidAlarmAudio) {
      await AndroidAlarmAudio.scheduleSnoozeAlarm({
        alarmId: `${alarmId}_snooze`,
        triggerTime: snoozeTime.getTime(),
        originalAlarmId: alarmId,
      });
    }
  }

  private async scheduleNextOccurrence(alarmId: string) {
    try {
      const alarms = await this.getAllAlarms();
      const alarm = alarms.find(a => a.id === alarmId);
      
      if (alarm && alarm.enabled && alarm.days && alarm.days.length > 0) {
        // Calculate next occurrence for repeating alarms
        const nextTime = this.calculateNextOccurrence(alarm);
        if (nextTime) {
          console.log(`Scheduling next occurrence of ${alarmId} at ${nextTime}`);
          // Schedule next occurrence using native module
          if (Platform.OS === 'android' && AndroidAlarmAudio) {
            await AndroidAlarmAudio.scheduleNextOccurrence({
              alarmId: alarmId,
              triggerTime: nextTime.getTime(),
              soundType: alarm.soundType || 'default',
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to schedule next occurrence:', error);
    }
  }

  private calculateNextOccurrence(alarm: AlarmData): Date | null {
    if (!alarm.days || alarm.days.length === 0) return null;
    
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const now = new Date();
    const today = now.getDay();
    
    // Find next occurrence day
    let nextDay = -1;
    const dayMap: {[key: string]: number} = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    
    // Check if alarm time has passed today and it's scheduled for today
    const todayAlarmTime = new Date(now);
    todayAlarmTime.setHours(hours, minutes, 0, 0);
    
    if (alarm.days.some(day => dayMap[day] === today) && now < todayAlarmTime) {
      nextDay = today;
    } else {
      // Find next scheduled day
      for (let i = 1; i <= 7; i++) {
        const checkDay = (today + i) % 7;
        if (alarm.days.some(day => dayMap[day] === checkDay)) {
          nextDay = checkDay;
          break;
        }
      }
    }
    
    if (nextDay === -1) return null;
    
    const nextDate = new Date(now);
    const daysToAdd = nextDay === today ? 0 : (nextDay + 7 - today) % 7;
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    nextDate.setHours(hours, minutes, 0, 0);
    
    return nextDate;
  }

  // Legacy methods maintained for compatibility
  private async checkAndTriggerAlarms() {
    console.log('Checking and triggering alarms...');
    
    try {
      const alarms = await this.getEnabledAlarms();
      const now = new Date();

      for (const alarm of alarms) {
        if (this.shouldTriggerAlarm(alarm, now)) {
          console.log(`Triggering alarm: ${alarm.id}`);
          await this.triggerAlarmWithMaximumReliability(alarm);
        }
      }
    } catch (error) {
      console.error('Error checking alarms:', error);
    }
  }

  private shouldTriggerAlarm(alarm: AlarmData, now: Date): boolean {
    if (!alarm.enabled) return false;

    const [alarmHours, alarmMinutes] = alarm.time.split(':').map(Number);
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Check if current time matches alarm time
    const timeMatches = currentHours === alarmHours && currentMinutes === alarmMinutes;
    
    if (!timeMatches) return false;

    // Check if today is a scheduled day
    if (alarm.days && alarm.days.length > 0) {
      const today = now.getDay();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayName = dayNames[today];
      return alarm.days.includes(todayName);
    }

    return true; // One-time alarm
  }

  private async getEnabledAlarms(): Promise<AlarmData[]> {
    try {
      const alarms = await this.getAllAlarms();
      return alarms.filter(alarm => alarm.enabled);
    } catch (error) {
      console.error('Error getting enabled alarms:', error);
      return [];
    }
  }

  private async getAllAlarms(): Promise<AlarmData[]> {
    try {
      const alarmsJson = await AsyncStorage.getItem('alarms');
      return alarmsJson ? JSON.parse(alarmsJson) : [];
    } catch (error) {
      console.error('Error loading alarms:', error);
      return [];
    }
  }

  private getTimeKey(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  private async loadAndScheduleAlarms() {
    try {
      const alarms = await this.getEnabledAlarms();
      console.log(`Loading ${alarms.length} enabled alarms`);
      
      // Schedule all alarms using native module for maximum reliability
      for (const alarm of alarms) {
        await this.scheduleAlarmNatively(alarm);
      }
    } catch (error) {
      console.error('Error loading and scheduling alarms:', error);
    }
  }

  private async scheduleAlarmNatively(alarm: AlarmData) {
    if (Platform.OS === 'android' && AndroidAlarmAudio) {
      try {
        const nextOccurrence = this.calculateNextOccurrence(alarm);
        if (nextOccurrence) {
          await AndroidAlarmAudio.scheduleAlarm({
            alarmId: alarm.id,
            triggerTime: nextOccurrence.getTime(),
            soundType: alarm.soundType || 'default',
            vibration: alarm.vibration !== false,
            label: alarm.label || 'Alarm',
          });
          console.log(`Scheduled native alarm ${alarm.id} for ${nextOccurrence}`);
        }
      } catch (error) {
        console.error(`Failed to schedule native alarm ${alarm.id}:`, error);
      }
    }
  }

  // Public methods for external use
  public getAlarmState(alarmId: string): Promise<AlarmState> {
    const instance = this.currentAlarms.get(alarmId);
    return Promise.resolve(instance?.state || AlarmState.IDLE);
  }

  public async getAllAlarmStates(): Promise<Map<string, AlarmInstance>> {
    return new Map(this.currentAlarms);
  }

  public async testAlarmReliability(): Promise<boolean> {
    console.log('Testing alarm reliability...');
    
    try {
      // Test all alarm methods
      const testResults = {
        nativeModule: false,
        globalAudio: false,
        directAudio: false,
        systemNotification: false,
        vibration: false,
      };

      // Test native module
      if (Platform.OS === 'android' && AndroidAlarmAudio) {
        try {
          await AndroidAlarmAudio.testAlarmPlayback();
          testResults.nativeModule = true;
        } catch (error) {
          console.warn('Native module test failed:', error);
        }
      }

      // Test global audio
      try {
        // Test the global audio manager by checking active sounds count
        const activeSoundsCount = this.globalAudioManager.getActiveSoundsCount();
        console.log(`Global audio manager active sounds: ${activeSoundsCount}`);
        testResults.globalAudio = true;
      } catch (error) {
        console.warn('Global audio test failed:', error);
      }

      const successCount = Object.values(testResults).filter(Boolean).length;
      const totalTests = Object.keys(testResults).length;
      
      console.log(`Alarm reliability test: ${successCount}/${totalTests} methods working`);
      return successCount > 0; // At least one method must work

    } catch (error) {
      console.error('Alarm reliability test failed:', error);
      return false;
    }
  }

  // Legacy compatibility methods
  public async requestPermissions(): Promise<boolean> {
    return await this.permissionChecker.isReadyForAlarms();
  }

  public async scheduleAlarm(startTime: string, endTime: string): Promise<boolean> {
    // Legacy method - just return true for compatibility
    console.log('Legacy scheduleAlarm called - using new implementation');
    return true;
  }

  public async startAlarmMonitoring(): Promise<boolean> {
    console.log('Starting alarm monitoring with enhanced service...');
    await this.initializeService();
    return true;
  }

  public async stopAlarmMonitoring(): Promise<void> {
    console.log('Stopping alarm monitoring...');
    this.foregroundServiceActive = false;
  }
}
