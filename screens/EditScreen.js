import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as StoreReview from 'expo-store-review';
import { v4 as uuidv4 } from 'uuid';
import { Save } from 'lucide-react-native';
import { theme } from '../theme';
import {
  REVIEW_COUNT_KEY,
  REVIEW_PROMPTED_KEY,
  getBodyPreview,
  ensureHtmlContent,
  isHtmlContentEmpty,
} from '../utils/noteHelpers';
import { loadNotes, saveNotes } from '../utils/noteStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditScreen({ route, navigation }) {
  const { note } = route.params || {};
  const initialTitle = note ? note.title : '';
  const initialBody = getBodyPreview(note?.body || '');

  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [isPromptVisible, setIsPromptVisible] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const styles = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const pendingActionRef = useRef(null);
  const bypassPromptRef = useRef(false);

  const hasUnsavedChanges = title !== initialTitle || body !== initialBody;

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

  const persistNote = async () => {
    const currentHtml = ensureHtmlContent(body || '');

    if (!title.trim() && isHtmlContentEmpty(currentHtml)) {
      Alert.alert('Empty Note', 'Please add a title or some content before saving.');
      return false;
    }

    const timestamp = new Date().toISOString();
    const existingNotes = await loadNotes();

    let updatedNotes;
    if (note) {
      updatedNotes = existingNotes.map((existingNote) => (
        existingNote.id === note.id
          ? {
              ...existingNote,
              title: title.trim(),
              body: currentHtml,
              updatedAt: timestamp,
            }
          : existingNote
      ));
    } else {
      updatedNotes = [
        {
          id: uuidv4(),
          title: title.trim(),
          body: currentHtml,
          createdAt: timestamp,
          updatedAt: timestamp,
          isPinned: false,
        },
        ...existingNotes,
      ];
    }

    await saveNotes(updatedNotes);
    if (!note) {
      await maybeRequestReview();
    }

    return true;
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!hasUnsavedChanges || bypassPromptRef.current) {
        return;
      }

      event.preventDefault();
      pendingActionRef.current = event.data.action;
      setIsPromptVisible(true);
    });

    return unsubscribe;
  }, [hasUnsavedChanges, navigation]);

  const handleSave = async () => {
    try {
      const didSave = await persistNote();
      if (!didSave) {
        return;
      }

      bypassPromptRef.current = true;
      navigation.goBack();
    } catch (error) {
      Alert.alert('Unable to Save', error.message || 'Unable to save your note right now.');
    }
  };

  const handlePromptDismiss = () => {
    pendingActionRef.current = null;
    setIsPromptVisible(false);
  };

  const handlePromptSave = async () => {
    try {
      const didSave = await persistNote();
      if (!didSave) {
        return;
      }

      const pendingAction = pendingActionRef.current;
      bypassPromptRef.current = true;
      setIsPromptVisible(false);

      if (pendingAction) {
        navigation.dispatch(pendingAction);
        return;
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Unable to Save', error.message || 'Unable to save your note right now.');
    }
  };

  const handlePromptDiscard = () => {
    const pendingAction = pendingActionRef.current;
    bypassPromptRef.current = true;
    setIsPromptVisible(false);

    if (pendingAction) {
      navigation.dispatch(pendingAction);
      return;
    }

    navigation.goBack();
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.content}>
          <TextInput
            style={styles.titleInput}
            placeholder="Note Title"
            placeholderTextColor={colors.faint}
            value={title}
            onChangeText={setTitle}
            selectionColor={colors.primary}
          />

          <View style={styles.editorShell}>
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
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSave}>
            <Save color={colors.accentText} size={18} />
            <Text style={styles.saveButtonText}> Save Note</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePromptDismiss}
      >
        <Pressable style={styles.modalOverlay} onPress={handlePromptDismiss}>
          <Pressable style={styles.dialogCard} onPress={() => {}}>
            <Text style={styles.dialogTitle}>Unsaved Changes</Text>
            <Text style={styles.dialogMessage}>
              You have unsaved changes. What would you like to do?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.secondaryDialogButton]}
                activeOpacity={0.85}
                onPress={handlePromptDiscard}
              >
                <Text style={[styles.dialogButtonText, styles.secondaryDialogButtonText]}>Don't Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.primaryDialogButton]}
                activeOpacity={0.85}
                onPress={handlePromptSave}
              >
                <Text style={styles.dialogButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  titleInput: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    paddingVertical: 10,
    marginBottom: 16,
  },
  editorShell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  bodyInput: {
    flex: 1,
    minHeight: 320,
    color: colors.text,
    fontSize: 18,
    lineHeight: 28,
    paddingBottom: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 16,
    ...Platform.select({
      ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  saveButtonText: {
    color: colors.accentText,
    fontSize: 17,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  dialogTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  dialogMessage: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  dialogButton: {
    minWidth: 110,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDialogButton: {
    backgroundColor: colors.accent,
  },
  secondaryDialogButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dialogButtonText: {
    color: colors.accentText,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryDialogButtonText: {
    color: colors.text,
  },
});
