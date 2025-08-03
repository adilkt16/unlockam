import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AndroidPermissions from '../utils/AndroidPermissions';

interface DooaStatusCardProps {
  onDismiss?: () => void;
}

const DooaStatusCard: React.FC<DooaStatusCardProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    checkShouldShowCard();
  }, []);

  const checkShouldShowCard = async () => {
    try {
      // Only show on Android
      if (Platform.OS !== 'android') {
        return;
      }

      // Check if onboarding is complete
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      if (onboardingComplete !== 'true') {
        return;
      }

      // Check if user has dismissed this card permanently
      const cardDismissed = await AsyncStorage.getItem('dooaStatusCardDismissed');
      if (cardDismissed === 'true') {
        return;
      }

      // Check if DOOA permission was already handled during onboarding
      const dooaHandled = await AsyncStorage.getItem('dooaPermissionHandled');
      if (dooaHandled === 'true') {
        return;
      }

      // Show the card with animation
      setIsVisible(true);
      showCard();
    } catch (error) {
      console.error('Error checking DOOA status card visibility:', error);
    }
  };

  const showCard = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideCard = (permanent: boolean = false) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      if (permanent && onDismiss) {
        onDismiss();
      }
    });
  };

  const handleEnableDooa = async () => {
    try {
      const success = await AndroidPermissions.openDooaSettings();
      if (success) {
        // Mark DOOA as handled and hide card permanently
        await AsyncStorage.setItem('dooaPermissionHandled', 'true');
        hideCard(true);
      }
    } catch (error) {
      console.error('Error opening DOOA settings:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem('dooaStatusCardDismissed', 'true');
      hideCard(true);
    } catch (error) {
      console.error('Error dismissing DOOA card:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.card}>
        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
        >
          <Ionicons name="close" size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Card content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="phone-portrait-outline" size={32} color="#3b82f6" />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Enhance Your Alarm Experience</Text>
            <Text style={styles.subtitle}>
              Enable display over other apps for full-screen alarms that work even when locked
            </Text>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEnableDooa}
          >
            <Ionicons name="settings-outline" size={18} color="white" />
            <Text style={styles.actionButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 32, // Make space for dismiss button
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DooaStatusCard;
