import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { Plus } from 'lucide-react-native';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import {
  REVIEW_COUNT_KEY,
  REVIEW_PROMPTED_KEY,
  ensureHtmlContent,
  isHtmlContentEmpty,
} from '../utils/noteHelpers';
import * as noteStorage from '../utils/noteStorage';

export default function EditScreen({ route, navigation }) {
  const { note } = route.params || {};
  const initialTitle = note?.title || '';
  const initialContent = ensureHtmlContent(note?.content ?? note?.body ?? '');
  const formattingActions = useMemo(() => ([
    { key: actions.setBold, label: 'Bold' },
    { key: actions.setItalic, label: 'Italic' },
    { key: actions.setUnderline, label: 'Underline' },
    { key: actions.insertBulletsList, label: 'Bullet list' },
    { key: actions.insertOrderedList, label: 'Ordered list' },
    { key: actions.checkboxList, label: 'Checkbox' },
  ]), []);

  const [title, setTitle] = useState(initialTitle);
  const [contentHtml, setContentHtml] = useState(initialContent);
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [isFormatMenuVisible, setIsFormatMenuVisible] = useState(false);
  const [activeFormats, setActiveFormats] = useState([]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const styles = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const pendingActionRef = useRef(null);
  const bypassPromptRef = useRef(false);
  const editorRef = useRef(null);

  const hasUnsavedChanges = title !== initialTitle || contentHtml !== initialContent;

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

  const getCurrentHtml = useCallback(async () => {
    const editorHtml = await editorRef.current?.getContentHtml?.();
    return ensureHtmlContent(editorHtml ?? contentHtml ?? '');
  }, [contentHtml]);

  const persistNote = useCallback(async () => {
    const currentHtml = await getCurrentHtml();

    if (!title.trim() && isHtmlContentEmpty(currentHtml)) {
      Alert.alert('Empty Note', 'Please add a title or some content before saving.');
      return false;
    }

    setContentHtml(currentHtml);
    await noteStorage.saveNote({
      ...note,
      id: note?.id || uuidv4(),
      title: title.trim(),
      body: currentHtml,
      content: currentHtml,
      isPinned: note?.isPinned ?? false,
    });

    if (!note) {
      await maybeRequestReview();
    }

    return true;
  }, [getCurrentHtml, note, title]);

  const handleSave = useCallback(async () => {
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
  }, [navigation, persistNote]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerTitle: '',
      headerLeft: () => <Text style={styles.headerTitleText}>New Note</Text>,
      headerRight: () => (
        <TouchableOpacity style={styles.headerSaveButton} activeOpacity={0.8} onPress={handleSave}>
          <Text style={styles.headerSaveText}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [handleSave, navigation, styles.headerSaveButton, styles.headerSaveText, styles.headerTitleText]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.registerToolbar((items) => {
      const nextActiveFormats = items
        .map((item) => (typeof item === 'string' ? item : item?.type))
        .filter(Boolean);
      setActiveFormats(nextActiveFormats);
    });
  }, []);

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

  const handleFormatPress = (formatAction) => {
    editorRef.current?.sendAction?.(formatAction, 'result');
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
            <RichEditor
              ref={editorRef}
              style={styles.richEditor}
              placeholder="Start writing..."
              initialHeight={0}
              editorInitializedCallback={() => {
                editorRef.current?.setContentHTML(initialContent);
              }}
              onChange={(html) => setContentHtml(ensureHtmlContent(html))}
              editorStyle={{
                backgroundColor: colors.surface,
                color: colors.text,
                caretColor: colors.primary,
                placeholderColor: colors.muted,
                contentCSSText: `
                  font-size: 18px;
                  line-height: 1.7;
                  padding: 0 0 20px 0;
                `,
              }}
            />
          </View>
        </View>


        {isFormatMenuVisible ? (
          <Pressable style={styles.floatingOverlay} onPress={() => setIsFormatMenuVisible(false)} />
        ) : null}

        <View style={[styles.floatingFormatContainer, { bottom: Math.max(insets.bottom, 16) + 12 }]}>
          {isFormatMenuVisible ? (
            <View style={styles.formatMenu}>
              {formattingActions.map((actionItem) => {
                const isActive = activeFormats.includes(actionItem.key);

                return (
                  <TouchableOpacity
                    key={actionItem.key}
                    style={[styles.formatMenuItem, isActive ? styles.formatMenuItemActive : null]}
                    activeOpacity={0.85}
                    onPress={() => handleFormatPress(actionItem.key)}
                  >
                    <Text style={[styles.formatMenuText, isActive ? styles.formatMenuTextActive : null]}>
                      {actionItem.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.formatFab}
            activeOpacity={0.85}
            onPress={() => setIsFormatMenuVisible((currentValue) => !currentValue)}
          >
            <Plus color={colors.accentText} size={28} />
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
    paddingBottom: 12,
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
    paddingBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  richEditor: {
    flex: 1,
  },
  headerTitleText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerSaveText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSaveButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  floatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  floatingFormatContainer: {
    position: 'absolute',
    right: 24,
    alignItems: 'flex-end',
  },
  formatMenu: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    minWidth: 180,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  formatMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  formatMenuItemActive: {
    backgroundColor: colors.accent,
  },
  formatMenuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  formatMenuTextActive: {
    color: colors.accentText,
  },
  formatFab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    ...Platform.select({
      ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 6 },
    }),
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
