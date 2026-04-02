import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  Alert,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { v4 as uuidv4 } from 'uuid';
import { Bell, BellOff, Save } from 'lucide-react-native';
import { theme } from '../theme';
import {
  getReminderLabel,
  getReminderOptions,
  REVIEW_COUNT_KEY,
  REVIEW_PROMPTED_KEY,
} from '../utils/noteHelpers';
import {
  cancelScheduledReminder,
  scheduleNoteReminder,
} from '../utils/reminderHelpers';

export default function EditScreen({ route, navigation }) {
  const { note, storageKey } = route.params;
  const initialReminderDate = note?.reminderAt ? new Date(note.reminderAt) : new Date(Date.now() + 60 * 60 * 1000);
  const [title, setTitle] = useState(note ? note.title : '');
  const [body, setBody] = useState(note ? note.body : '');
  const [selectedReminderAt, setSelectedReminderAt] = useState(note?.reminderAt || null);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showCustomReminderModal, setShowCustomReminderModal] = useState(false);
  const [customReminderDate, setCustomReminderDate] = useState(formatDateInput(initialReminderDate));
  const [customReminderTime, setCustomReminderTime] = useState(formatTimeInput(initialReminderDate));

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const reminderOptions = useMemo(() => getReminderOptions(), []);

  const activeReminderKey = useMemo(() => {
    if (!selectedReminderAt) return null;

    const selectedTime = new Date(selectedReminderAt).getTime();
    const matchingOption = reminderOptions.find(
      (option) => Math.abs(option.date.getTime() - selectedTime) < 60 * 1000
    );

    return matchingOption?.key || 'custom';
  }, [reminderOptions, selectedReminderAt]);

  const maybeRequestReview = async () => {
    const currentCount = Number(await AsyncStorage.getItem(REVIEW_COUNT_KEY) || '0');
    const nextCount = currentCount + 1;
    await AsyncStorage.setItem(REVIEW_COUNT_KEY, String(nextCount));

    const hasPrompted = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
    if (hasPrompted || nextCount < 5) return;

    const canPrompt = await StoreReview.isAvailableAsync();
    if (!canPrompt) return;

    await StoreReview.requestReview();
    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, 'true');
  };

  const applyCustomReminder = () => {
    const dateValue = customReminderDate.trim();
    const timeValue = customReminderTime.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      Alert.alert('Invalid Date', 'Use the date format YYYY-MM-DD.');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(timeValue)) {
      Alert.alert('Invalid Time', 'Use the time format HH:MM.');
      return;
    }

    const reminderDate = new Date(`${dateValue}T${timeValue}:00`);
    if (Number.isNaN(reminderDate.getTime())) {
      Alert.alert('Invalid Reminder', 'Enter a valid date and time.');
      return;
    }

    if (reminderDate <= new Date()) {
      Alert.alert('Invalid Reminder', 'Choose a time in the future.');
      return;
    }

    setSelectedReminderAt(reminderDate.toISOString());
    setShowCustomReminderModal(false);
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) {
      setShowEmptyWarning(true);
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const timestamp = new Date().toISOString();

    try {
      const storedNotes = await AsyncStorage.getItem(storageKey);
      let notes = storedNotes ? JSON.parse(storedNotes) : [];

      let notificationId = note?.notificationId ?? null;
      const reminderChanged = (note?.reminderAt || null) !== (selectedReminderAt || null);

      if (selectedReminderAt && reminderChanged) {
        notificationId = await scheduleNoteReminder(
          {
            title: trimmedTitle || 'Untitled Note',
            body: trimmedBody || 'Open Penote to view this reminder.',
          },
          new Date(selectedReminderAt)
        );

        if (note?.notificationId) {
          await cancelScheduledReminder(note.notificationId);
        }
      } else if (!selectedReminderAt && note?.notificationId) {
        await cancelScheduledReminder(note.notificationId);
        notificationId = null;
      }

      let savedNote;
      if (note) {
        savedNote = {
          ...note,
          title: trimmedTitle,
          body: trimmedBody,
          updatedAt: timestamp,
          reminderAt: selectedReminderAt,
          notificationId,
        };
        notes = notes.map((existingNote) => (
          existingNote.id === note.id ? savedNote : existingNote
        ));
      } else {
        savedNote = {
          id: uuidv4(),
          title: trimmedTitle,
          body: trimmedBody,
          createdAt: timestamp,
          updatedAt: timestamp,
          isPinned: false,
          reminderAt: selectedReminderAt,
          notificationId,
        };
        notes.unshift(savedNote);
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(notes));
      if (!note) {
        await maybeRequestReview();
      }

      if (selectedReminderAt) {
        Alert.alert(
          'Reminder Set',
          `You will get a notification at ${getReminderLabel(selectedReminderAt)}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Unable to Save', error.message || 'Unable to save your note right now.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={styles.titleInput}
          placeholder="Note Title"
          placeholderTextColor={colors.faint}
          value={title}
          onChangeText={setTitle}
          selectionColor={colors.primary}
        />
        <TextInput
          style={styles.bodyInput}
          placeholder="Start typing your thoughts..."
          placeholderTextColor={colors.muted}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          selectionColor={colors.primary}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder</Text>
          <Text style={styles.sectionHint}>
            Pick a reminder time and Penote will notify you about this note.
          </Text>
          <View style={styles.reminderRow}>
            {reminderOptions.map((option) => {
              const isActive = activeReminderKey === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.reminderChip, isActive && styles.reminderChipActive]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedReminderAt(option.date.toISOString())}
                >
                  <Bell color={isActive ? colors.accentText : colors.text} size={16} />
                  <Text style={[styles.reminderChipText, isActive && styles.reminderChipTextActive]}>
                    {` ${option.label}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.reminderChip, activeReminderKey === 'custom' && styles.reminderChipActive]}
              activeOpacity={0.7}
              onPress={() => setShowCustomReminderModal(true)}
            >
              <Bell color={activeReminderKey === 'custom' ? colors.accentText : colors.text} size={16} />
              <Text style={[styles.reminderChipText, activeReminderKey === 'custom' && styles.reminderChipTextActive]}>
                {' Custom time'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reminderChip, !selectedReminderAt && styles.reminderChipClear]}
              activeOpacity={0.7}
              onPress={() => setSelectedReminderAt(null)}
            >
              <BellOff color={!selectedReminderAt ? colors.accentText : colors.text} size={16} />
              <Text style={[styles.reminderChipText, !selectedReminderAt && styles.reminderChipTextActive]}>
                {' Clear'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.reminderSummary}>
            {selectedReminderAt
              ? `Reminder set for ${getReminderLabel(selectedReminderAt)}`
              : 'No reminder set for this note.'}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.saveButton} activeOpacity={0.7} onPress={handleSave}>
          <Save color={colors.accentText} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Save Note</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent visible={showEmptyWarning} onRequestClose={() => setShowEmptyWarning(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Empty Note</Text>
            <Text style={styles.modalBodyText}>
              Please provide a title or your thoughts in the body to save the note securely.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalOkayButton} activeOpacity={0.7} onPress={() => setShowEmptyWarning(false)}>
                <Text style={styles.modalOkayText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={showCustomReminderModal}
        onRequestClose={() => setShowCustomReminderModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Custom Reminder</Text>
                <Text style={styles.modalBodyText}>
                  Enter the reminder date and time. Use 24-hour time.
                </Text>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.customInput}
                  value={customReminderDate}
                  onChangeText={setCustomReminderDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputLabel}>Time</Text>
                <TextInput
                  style={styles.customInput}
                  value={customReminderTime}
                  onChangeText={setCustomReminderTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelButton} activeOpacity={0.7} onPress={() => setShowCustomReminderModal(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalOkayButton} activeOpacity={0.7} onPress={applyCustomReminder}>
                    <Text style={styles.modalOkayText}>Set Time</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24, paddingBottom: 36 },
  titleInput: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 24,
    paddingVertical: 12,
  },
  bodyInput: {
    color: colors.text,
    fontSize: 18,
    minHeight: 260,
    lineHeight: 28,
    marginBottom: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 10,
    marginBottom: 10,
  },
  reminderChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  reminderChipClear: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  reminderChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  reminderChipTextActive: {
    color: colors.accentText,
  },
  reminderSummary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  customInput: {
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  saveButtonText: {
    color: colors.accentText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalKeyboardContainer: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  modalBodyText: { color: colors.muted, fontSize: 16, lineHeight: 24, marginBottom: 28 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    marginRight: 12,
  },
  modalCancelText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  modalOkayButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 9999,
  },
  modalOkayText: { color: colors.accentText, fontSize: 16, fontWeight: 'bold' },
});
