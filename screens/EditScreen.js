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
  useColorScheme
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ← add this
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Save } from 'lucide-react-native';
import { theme } from '../theme';

export default function EditScreen({ route, navigation }) {
  const { note, storageKey } = route.params;
  const [title, setTitle] = useState(note ? note.title : '');
  const [body, setBody] = useState(note ? note.body : '');
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const insets = useSafeAreaInsets(); // ← add this
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) {
      setShowEmptyWarning(true);
      return;
    }

    try {
      const storedNotes = await AsyncStorage.getItem(storageKey);
      let notes = storedNotes ? JSON.parse(storedNotes) : [];

      if (note) {
        notes = notes.map(n =>
          n.id === note.id
            ? { ...n, title: title.trim(), body: body.trim(), updatedAt: new Date().toISOString() }
            : n
        );
      } else {
        const newNote = {
          id: uuidv4(),
          title: title.trim(),
          body: body.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPinned: false
        };
        notes.unshift(newNote);
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(notes));
      navigation.goBack();
    } catch (e) { }
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}> {/* ← updated */}
        <TouchableOpacity style={styles.saveButton} activeOpacity={0.7} onPress={handleSave}>
          <Save color={colors.accentText} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Save Note</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent={true} visible={showEmptyWarning} onRequestClose={() => setShowEmptyWarning(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Empty Note</Text>
            <Text style={styles.modalBodyText}>Please provide a title or your thoughts in the body to save the note securely.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalOkayButton} activeOpacity={0.7} onPress={() => setShowEmptyWarning(false)}>
                <Text style={styles.modalOkayText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24, flexGrow: 1 },
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
    minHeight: 300,
    lineHeight: 28,
  },
  footer: {
    padding: 20,
    paddingBottom: 20, // ← base, insets added dynamically above
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
  modalOkayButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 9999,
  },
  modalOkayText: { color: colors.accentText, fontSize: 16, fontWeight: 'bold' }
});