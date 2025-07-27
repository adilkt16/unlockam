import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useAudio } from '../hooks/useAudio';
import { AlarmService } from '../services/AlarmService';
import { GlobalAudioManager } from '../services/GlobalAudioManager';

interface AlarmModalProps {
  visible: boolean;
  puzzle: {
    type: 'math' | 'pattern';
    question: string;
    answer: string | boolean[];
    targetPattern?: boolean[];
  };
  onSolve: () => void;
  onClose: () => void;
}

export default function AlarmModal({
  visible,
  puzzle,
  onSolve,
  onClose,
}: AlarmModalProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [userPattern, setUserPattern] = useState<boolean[]>(Array(16).fill(false));
  const [attempts, setAttempts] = useState(0);
  const [timeUntilStop, setTimeUntilStop] = useState<string>('');
  const [isInputError, setIsInputError] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideInAnim = useRef(new Animated.Value(-50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const { playAlarm, stopAlarm, playCorrectSound, playIncorrectSound } = useAudio();
  const alarmService = AlarmService.getInstance();
  const globalAudio = GlobalAudioManager.getInstance();

  useEffect(() => {
    if (visible) {
      setUserAnswer('');
      setUserPattern(Array(16).fill(false));
      setAttempts(0);
      setIsInputError(false);
      playAlarm();
      
      // Start entrance animations
      Animated.parallel([
        Animated.spring(slideInAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Start pulsing animation for alarm icon
      const startPulse = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      startPulse();
      
      // Start countdown timer for auto-stop
      const updateCountdown = async () => {
        const activeAlarm = await alarmService.getActiveAlarm();
        if (activeAlarm && activeAlarm.endTimeTimestamp) {
          const now = Date.now();
          const timeLeft = activeAlarm.endTimeTimestamp - now;
          
          if (timeLeft <= 0) {
            console.log('🔴 AlarmModal: End time reached, initiating complete alarm shutdown...');
            setTimeUntilStop('Alarm stopping...');
            
            try {
              // Multi-step shutdown process
              console.log('🔴 Step 1: Stopping all audio...');
              await globalAudio.stopAllSounds();
              
              console.log('🔴 Step 2: Force stopping alarm service...');
              await alarmService.forceStopEverything();
              
              console.log('🔴 Step 3: Clearing notifications...');
              await Notifications.cancelAllScheduledNotificationsAsync();
              await Notifications.dismissAllNotificationsAsync();
              
              console.log('🔴 Step 4: Closing modal...');
              onClose();
              
              console.log('✅ AlarmModal: Complete shutdown successful');
            } catch (error) {
              console.error('❌ Error during alarm shutdown:', error);
              // Force close anyway
              onClose();
            }
            return;
          }
          
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          setTimeUntilStop(`Auto-stop in ${minutes}m ${seconds}s`);
        } else {
          console.log('🟡 AlarmModal: No active alarm found or no end time');
        }
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      
      return () => clearInterval(interval);
    } else {
      // When modal becomes invisible, stop all sounds
      console.log('🔴 AlarmModal becoming invisible, stopping all sounds...');
      stopAlarm();
      globalAudio.stopAllSounds();
      alarmService.stopAlarmSound();
      setTimeUntilStop('');
    }
  }, [visible, playAlarm, stopAlarm]);

  // Cleanup on unmount - ensure all sounds are stopped
  useEffect(() => {
    return () => {
      console.log('🔴 AlarmModal unmounting, stopping all sounds...');
      stopAlarm();
      globalAudio.stopAllSounds();
      alarmService.stopAlarmSound();
    };
  }, []);

  const handleSubmit = async () => {
    // Add haptic feedback for interaction
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    let isCorrect = false;

    if (puzzle.type === 'math') {
      isCorrect = userAnswer.trim() === puzzle.answer;
    } else if (puzzle.type === 'pattern' && Array.isArray(puzzle.answer)) {
      isCorrect = userPattern.every((val, index) => val === puzzle.answer[index]);
    }

    if (isCorrect) {
      console.log('🟢 Puzzle solved correctly! Stopping all alarm sounds...');
      
      // Success haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Success animation
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }).start(() => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }).start();
      });
      
      await playCorrectSound();
      
      // Triple nuclear option to ensure EVERYTHING stops
      await stopAlarm(); // Stop useAudio hook's sound
      await globalAudio.stopAllSounds(); // Stop ALL sounds via global manager
      await alarmService.forceStopEverything(); // AlarmService nuclear option
      
      console.log('🟢 All alarm sounds stopped');
      Alert.alert('Correct!', 'Alarm stopped. Good morning!', [
        { text: 'OK', onPress: onSolve }
      ]);
    } else {
      // Error haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      // Shake animation for wrong answer
      setIsInputError(true);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        setIsInputError(false);
      });
      
      await playIncorrectSound();
      setAttempts(prev => prev + 1);
      
      if (attempts >= 2) {
        Alert.alert(
          'Keep Trying! 💪',
          `Incorrect answer. This is attempt ${attempts + 1}. You can do this!`,
          [{ text: 'Try Again', style: 'default' }]
        );
      } else {
        Alert.alert('Almost There! 🤔', 'Try again!', [
          { text: 'Got It', style: 'default' }
        ]);
      }
      
      // Reset input
      if (puzzle.type === 'math') {
        setUserAnswer('');
      }
    }
  };

  const togglePatternCell = async (index: number) => {
    // Add haptic feedback for pattern cell tap
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newPattern = [...userPattern];
    newPattern[index] = !newPattern[index];
    setUserPattern(newPattern);
  };

  const renderPatternGrid = (pattern: boolean[], isTarget: boolean = false) => {
    return (
      <View style={styles.gridContainer}>
        {pattern.map((active, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.gridCell,
              active && (isTarget ? styles.gridCellTarget : styles.gridCellActive),
            ]}
            onPress={isTarget ? undefined : () => togglePatternCell(index)}
            disabled={isTarget}
            activeOpacity={0.7}
          >
            {active && (
              <View style={[
                styles.gridDot,
                { backgroundColor: isTarget ? "#10b981" : "#3b82f6" }
              ]} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}} // Prevent dismissing alarm modal
    >
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Minimal Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                transform: [{ translateY: slideInAnim }]
              }
            ]}
          >
            <Animated.View
              style={[
                styles.alarmIcon,
                {
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <Ionicons name="alarm-outline" size={20} color="#ef4444" />
            </Animated.View>
            <Text style={styles.title}>Alarm Challenge</Text>
          </Animated.View>

          {/* Clean Puzzle Card */}
          <Animated.View 
            style={[
              styles.puzzleCard,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateX: shakeAnim }
                ]
              }
            ]}
          >
            {/* Question */}
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>{puzzle.question}</Text>
            </View>

            {/* Answer Section */}
            {puzzle.type === 'math' ? (
              <View style={styles.answerSection}>
                <TextInput
                  style={[
                    styles.answerInput,
                    isInputError && styles.answerInputError
                  ]}
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  placeholder="?"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  autoFocus={true}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  maxLength={10}
                />
              </View>
            ) : (
              <View style={styles.answerSection}>
                <Text style={styles.patternTitle}>Match the pattern:</Text>
                <View style={styles.patternContainer}>
                  <View style={styles.targetPattern}>
                    {renderPatternGrid(puzzle.targetPattern || [], true)}
                  </View>
                  <View style={styles.userPattern}>
                    {renderPatternGrid(userPattern, false)}
                  </View>
                </View>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity 
              style={[
                styles.solveButton,
                attempts >= 2 && styles.solveButtonUrgent
              ]} 
              onPress={handleSubmit}
              activeOpacity={0.9}
            >
              <Text style={styles.solveButtonText}>
                {attempts === 0 ? 'Solve' : 'Try Again'}
              </Text>
            </TouchableOpacity>

            {/* Progress Indicator */}
            {attempts > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressDots}>
                  {[...Array(3)].map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.progressDot,
                        index < attempts && styles.progressDotActive
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Auto-stop Timer */}
            {timeUntilStop && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{timeUntilStop}</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alarmIcon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  puzzleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  questionSection: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#f1f5f9',
    textAlign: 'center',
    lineHeight: 28,
  },
  answerSection: {
    marginBottom: 24,
  },
  answerInput: {
    fontSize: 48,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    backgroundColor: '#334155',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#475569',
    minHeight: 100,
  },
  answerInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#7f1d1d',
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  patternContainer: {
    gap: 24,
  },
  targetPattern: {
    alignItems: 'center',
  },
  userPattern: {
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 160,
    justifyContent: 'center',
    gap: 4,
  },
  gridCell: {
    width: 36,
    height: 36,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  gridCellActive: {
    backgroundColor: '#1e40af',
    borderColor: '#3b82f6',
  },
  gridCellTarget: {
    backgroundColor: '#166534',
    borderColor: '#22c55e',
  },
  gridDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  solveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  solveButtonUrgent: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  solveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#475569',
  },
  progressDotActive: {
    backgroundColor: '#f59e0b',
  },
  timerContainer: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
});
