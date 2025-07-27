import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerModalProps {
  visible: boolean;
  type: 'start' | 'end';
  currentTime: string;
  onTimeChange: (time: string) => void;
  onClose: () => void;
}

export default function TimePickerModal({
  visible,
  type,
  currentTime,
  onTimeChange,
  onClose,
}: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState(() => {
    const [hours] = currentTime.split(':');
    const hour24 = parseInt(hours);
    return hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  });

  const [selectedMinute, setSelectedMinute] = useState(() => {
    const [, minutes] = currentTime.split(':');
    return parseInt(minutes);
  });

  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const [hours] = currentTime.split(':');
    return parseInt(hours) >= 12 ? 'PM' : 'AM';
  });

  const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12 for 12-hour format
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  const handleConfirm = () => {
    // Convert 12-hour format to 24-hour format
    let hour24 = selectedHour;
    if (selectedPeriod === 'AM') {
      if (selectedHour === 12) {
        hour24 = 0; // 12 AM = 0 hours
      }
    } else { // PM
      if (selectedHour !== 12) {
        hour24 = selectedHour + 12; // 1 PM = 13, 2 PM = 14, etc.
      }
      // 12 PM stays as 12
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onTimeChange(timeString);
  };

  const formatTime = (hour: number, minute: number, period: string) => {
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Set {type === 'start' ? 'Start' : 'End'} Time
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>
              {formatTime(selectedHour, selectedMinute, selectedPeriod)}
            </Text>
          </View>

          <View style={styles.pickerContainer}>
            {/* Hours Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      selectedHour === hour && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedHour === hour && styles.selectedPickerItemText,
                      ]}
                    >
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Minutes Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.pickerItem,
                      selectedMinute === minute && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedMinute === minute && styles.selectedPickerItemText,
                      ]}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Period</Text>
              <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                {periods.map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.pickerItem,
                      selectedPeriod === period && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedPeriod === period && styles.selectedPickerItemText,
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  previewContainer: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 10,
  },
  picker: {
    height: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  pickerItem: {
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedPickerItem: {
    backgroundColor: '#3b82f6',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedPickerItemText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
