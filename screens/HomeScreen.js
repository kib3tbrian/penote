import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  useColorScheme,
  LayoutAnimation,
  UIManager,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Bell, FileText, Trash2, Plus, Star, Search } from 'lucide-react-native';
import { theme } from '../theme';
import {
  escapeHtml,
  getReminderLabel,
  sanitizePdfFileName,
} from '../utils/noteHelpers';
import { cancelScheduledReminder } from '../utils/reminderHelpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [noteToDelete, setNoteToDelete] = useState(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const loadNotes = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem('notes_v1');
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      } else {
        setNotes([]);
      }
    } catch (error) { }
  };

  const togglePin = async (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedNotes = notes.map((existingNote) => (
      existingNote.id === id ? { ...existingNote, isPinned: !existingNote.isPinned } : existingNote
    ));
    await AsyncStorage.setItem('notes_v1', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const noteToRemove = notes.find((existingNote) => existingNote.id === noteToDelete);
    if (noteToRemove?.notificationId) {
      await cancelScheduledReminder(noteToRemove.notificationId);
    }

    const updatedNotes = notes.filter((existingNote) => existingNote.id !== noteToDelete);
    await AsyncStorage.setItem('notes_v1', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
    setNoteToDelete(null);
  };

  const exportPDF = async (note) => {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Georgia', serif; padding: 48px; color: #1a1a1a; background: #fff; }
      h1 { font-size: 28px; font-weight: bold; border-bottom: 2px solid #0D0D0D; padding-bottom: 12px; margin-bottom: 6px; }
      .meta { font-size: 12px; color: #999; margin-bottom: 12px; }
      .reminder { display: inline-block; margin-bottom: 24px; padding: 8px 12px; background: #F4F4F4; border-radius: 999px; font-size: 12px; color: #444; }
      p { font-size: 16px; line-height: 1.9; white-space: pre-wrap; }
      .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid #E0E0E0; text-align: center; color: #888; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(note.title || 'Untitled Note')}</h1>
    <div class="meta">${new Date(note.createdAt).toLocaleDateString()}</div>
    ${note.reminderAt ? `<div class="reminder">Reminder: ${escapeHtml(getReminderLabel(note.reminderAt) || '')}</div>` : ''}
    <p>${escapeHtml(note.body || '')}</p>
    <div class="footer">Exported securely via <strong>Penote</strong></div>
  </body>
</html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const shareUri = `${FileSystem.cacheDirectory}${sanitizePdfFileName(note.title)}`;
      const existingFile = await FileSystem.getInfoAsync(shareUri);
      if (existingFile.exists) {
        await FileSystem.deleteAsync(shareUri, { idempotent: true });
      }

      await FileSystem.copyAsync({ from: uri, to: shareUri });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing Unavailable', 'PDF was created, but sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: note.title || 'Share PDF',
      });
    } catch (error) {
      Alert.alert('PDF Export Failed', error.message || 'Unable to export this note as a PDF right now.');
    }
  };

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter((existingNote) => (
        (existingNote.title || '').toLowerCase().includes(query) ||
        (existingNote.body || '').toLowerCase().includes(query)
      ));
    }

    return result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [notes, searchQuery]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Edit', { note: item, storageKey: 'notes_v1' })}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled Note'}</Text>
        <TouchableOpacity style={styles.pinButton} onPress={() => togglePin(item.id)}>
          <Star color={item.isPinned ? colors.star : colors.faint} fill={item.isPinned ? colors.star : 'none'} size={24} />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      {item.reminderAt ? (
        <View style={styles.reminderPill}>
          <Bell color={colors.primary} size={14} />
          <Text style={styles.reminderPillText}>{` ${getReminderLabel(item.reminderAt)}`}</Text>
        </View>
      ) : null}
      <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => exportPDF(item)}>
          <FileText color={colors.accentText} size={16} />
          <Text style={styles.actionPdf}>  PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonDanger} activeOpacity={0.7} onPress={() => setNoteToDelete(item.id)}>
          <Trash2 color={colors.danger} size={16} />
          <Text style={styles.actionDelete}>  Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search color={colors.muted} size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectionColor={colors.primary}
        />
      </View>

      {filteredNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <FileText color={colors.faint} size={48} />
          </View>
          <Text style={styles.emptyMessage}>No notes found</Text>
          <Text style={styles.emptyHint}>{searchQuery ? 'Try a different search' : 'Tap + to create a new note'}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Edit', { note: null, storageKey: 'notes_v1' })}
      >
        <Plus color={colors.accentText} size={32} />
      </TouchableOpacity>

      <Modal animationType="fade" transparent visible={!!noteToDelete} onRequestClose={() => setNoteToDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Note</Text>
            <Text style={styles.modalBodyText}>
              Are you sure you want to permanently delete this note? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} activeOpacity={0.7} onPress={() => setNoteToDelete(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteButton} activeOpacity={0.7} onPress={confirmDelete}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    flex: 1,
    marginRight: 12,
  },
  pinButton: { padding: 4, marginRight: -8, marginTop: -4 },
  cardDate: { color: colors.faint, fontSize: 13, marginTop: 2, marginBottom: 8 },
  reminderPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  reminderPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: { color: colors.muted, fontSize: 16, marginBottom: 16, lineHeight: 22 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, paddingBottom: 6 },
  actionButton: {
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  actionButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  actionPdf: { color: colors.accentText, fontSize: 14, fontWeight: '600' },
  actionDelete: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.accent,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 6 },
    }),
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyMessage: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: colors.muted, fontSize: 16 },
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
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    marginRight: 12,
  },
  modalCancelText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  modalDeleteButton: {
    backgroundColor: colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999,
  },
  modalDeleteText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
