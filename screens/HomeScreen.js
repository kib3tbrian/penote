import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Plus, Search, Star, Trash2 } from 'lucide-react-native';
import NoteCard from '../components/NoteCard';
import { theme } from '../theme';
import {
  buildNoteDocumentHtml,
  getBodyPreview,
  getNoteContent,
  getNoteDateLabel,
  getSearchableText,
  orderNotesWithFavoritesFirst,
  sanitizePdfFileName,
} from '../utils/noteHelpers';
import {
  loadNotes,
  moveNoteToTrash,
  saveNotes,
} from '../utils/noteStorage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const styles = useMemo(() => getStyles(colors), [colors]);

  const loadData = useCallback(async () => {
    try {
      const storedNotes = await loadNotes();
      setNotes(storedNotes);
    } catch (error) { }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={styles.headerButton} activeOpacity={0.8} onPress={() => navigation.navigate('Trash')}>
          <Trash2 color={colors.text} size={18} />
        </TouchableOpacity>
      ),
    });
  }, [colors.text, navigation, styles.headerButton]);

  const handleToggleFavorite = async (noteId) => {
    const updatedNotes = notes.map((note) => (
      note.id === noteId ? { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() } : note
    ));
    setNotes(updatedNotes);
    await saveNotes(updatedNotes);
  };

  const handleMoveToTrash = async (noteId) => {
    const result = await moveNoteToTrash(noteId);
    setNotes(result.notes);
  };

  const exportPDF = async (note) => {
    try {
      const { uri } = await Print.printToFileAsync({ html: buildNoteDocumentHtml(note) });
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
    const query = searchQuery.trim().toLowerCase();
    const searchedNotes = query
      ? notes.filter((note) => getSearchableText(note).includes(query))
      : notes;

    return orderNotesWithFavoritesFirst(searchedNotes);
  }, [notes, searchQuery]);

  const renderItem = ({ item }) => (
    <NoteCard
      colors={colors}
      title={item.title}
      preview={getBodyPreview(getNoteContent(item))}
      dateLabel={getNoteDateLabel(item)}
      onPress={() => navigation.navigate('Edit', { note: item })}
      topRightAction={{
        onPress: () => handleToggleFavorite(item.id),
        icon: <Star color={item.isPinned ? colors.star : colors.faint} fill={item.isPinned ? colors.star : 'none'} size={16} />,
      }}
      actions={[
        {
          label: 'Export',
          onPress: () => exportPDF(item),
          icon: <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>PDF</Text>,
        },
        {
          label: 'Trash',
          onPress: () => handleMoveToTrash(item.id),
          icon: <Trash2 color={colors.danger} size={15} />,
          color: colors.danger,
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search color={colors.muted} size={18} style={styles.searchIcon} />
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
          <Text style={styles.emptyMessage}>No notes found</Text>
          <Text style={styles.emptyHint}>{searchQuery ? 'Try a different search' : 'Tap the + button to create a note.'}</Text>
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
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Edit', { note: null })}
      >
        <Plus color={colors.accentText} size={28} />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyMessage: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
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
});
