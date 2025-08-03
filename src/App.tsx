import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AlarmService } from './services/AlarmService';
import { LoadingScreen } from './components/LoadingScreen';
import OnboardingFlow from './components/OnboardingFlow';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);
  const alarmService = AlarmService.getInstance();
  const alarmCheckInterval = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Configure notification behavior (for when permissions are granted)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Set up notification categories for alarm actions
    setupNotificationCategories();
    
    // Start continuous alarm monitoring
    startAlarmMonitoring();
    
    // Set up notification listeners (for when permissions are available)
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      // If it's an alarm notification, trigger the full alarm experience
      if (notification.request.content.data?.type === 'alarm') {
        console.log('Alarm notification received - triggering full alarm');
        handleAlarmNotification();
      }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data;
      if (data?.type === 'alarm' || data?.type === 'alarm_active') {
        // Navigate to home screen when alarm notification is tapped
        navigationRef.current?.navigate('Home');
      }
    });

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      notificationListener.remove();
      responseListener.remove();
      subscription?.remove();
      // Clean up alarm monitoring
      if (alarmCheckInterval.current) {
        clearInterval(alarmCheckInterval.current);
      }
    };
  }, []);

  const startAlarmMonitoring = () => {
    console.log('Starting continuous alarm monitoring...');
    
    // Check for alarms every 2 seconds for more precision
    alarmCheckInterval.current = setInterval(async () => {
      try {
        const activeAlarm = await alarmService.getActiveAlarm();
        if (activeAlarm) {
          const now = Date.now();
          const alarmTime = activeAlarm.scheduledFor;
          const endTime = activeAlarm.endTimeTimestamp;
          
          // Check if end time has been reached - stop alarm if it's playing
          if (endTime && now >= endTime) {
            console.log('⏰ END TIME REACHED! App.tsx stopping alarm automatically...');
            
            // Nuclear option: Stop everything immediately
            try {
              await alarmService.forceStopEverything();
              
              console.log('✅ App.tsx: All alarm components stopped');
            } catch (error) {
              console.error('❌ Error stopping alarm in App.tsx:', error);
            }
            return;
          }
          
          // If alarm time has arrived (within 2 second window)
          if (now >= alarmTime && now <= alarmTime + 2000) {
            console.log('⏰ ALARM TIME REACHED! Triggering full alarm experience...');
            await triggerFullAlarmExperience();
          }
        }
      } catch (error) {
        console.error('Error in alarm monitoring:', error);
      }
    }, 2000); // Check every 2 seconds for better precision
  };

  const triggerFullAlarmExperience = async () => {
    try {
      console.log('🚨 Starting full alarm experience...');
      
      // Start the alarm sound and wake features
      await alarmService.triggerFullScreenAlarm();
      
      // Navigate to home screen and trigger alarm modal
      if (navigationRef.current) {
        navigationRef.current.navigate('Home', { triggerAlarm: true });
      }
      
      console.log('🚨 Full alarm experience activated (no notifications needed)');
      
    } catch (error) {
      console.error('Failed to trigger full alarm experience:', error);
    }
  };

  const setupNotificationCategories = async () => {
    try {
      await Notifications.setNotificationCategoryAsync('ALARM_CATEGORY', [
        {
          identifier: 'STOP_ALARM',
          buttonTitle: 'Stop Alarm',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'SNOOZE_ALARM',
          buttonTitle: 'Snooze',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    } catch (error) {
      console.log('Notification categories setup skipped (no permission)');
    }
  };

  const handleAlarmNotification = () => {
    // Bring app to foreground and navigate to home
    if (navigationRef.current) {
      navigationRef.current.navigate('Home');
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground
      console.log('App has come to the foreground');
      // Check if there's an active alarm that should be shown
      checkForActiveAlarm();
    }
    appState.current = nextAppState;
  };

  const checkForActiveAlarm = async () => {
    try {
      const activeAlarm = await alarmService.getActiveAlarm();
      if (activeAlarm) {
        const now = Date.now();
        const alarmTime = activeAlarm.scheduledFor;
        
        // If alarm time has passed, show alarm interface
        if (now >= alarmTime) {
          navigationRef.current?.navigate('Home');
        }
      }
    } catch (error) {
      console.error('Failed to check for active alarm:', error);
    }
  };

  const handleLoadingComplete = () => {
    console.log('🚀 App: Loading complete, setting showOnboarding to true');
    setIsLoading(false);
    // Show onboarding after loading is complete
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    console.log('✅ App: Onboarding complete, hiding onboarding flow');
    setShowOnboarding(false);
  };

  // Show loading screen while app is initializing
  if (isLoading) {
    console.log('📱 App: Showing loading screen');
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  console.log('📱 App: Rendering main app, showOnboarding =', showOnboarding);

  if (showOnboarding) {
    console.log('🎯 App: OnboardingFlow should be rendered');
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar 
          style="light"
          translucent 
          backgroundColor="transparent" 
        />
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#3b82f6',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      
      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
    </SafeAreaProvider>
  );
}
