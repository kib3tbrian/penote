import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Star, Trash2 } from 'lucide-react-native';
import NoteCard from '../components/NoteCard';
import { theme } from '../theme';
import {
  buildNoteDocumentHtml,
  getBodyPreview,
  getNoteContent,
  getNoteDateLabel,
  sanitizePdfFileName,
} from '../utils/noteHelpers';
import {
  loadNotes,
  moveNoteToTrash,
  saveNotes,
} from '../utils/noteStorage';

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const styles = useMemo(() => getStyles(colors), [colors]);

  const loadData = useCallback(async () => {
    try {
      const storedNotes = await loadNotes();
      setFavorites(storedNotes.filter((note) => note.isPinned));
    } catch (error) { }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleFavorite = async (noteId) => {
    const storedNotes = await loadNotes();
    const updatedNotes = storedNotes.map((note) => (
      note.id === noteId ? { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() } : note
    ));
    const savedNotes = await saveNotes(updatedNotes);
    setFavorites(savedNotes.filter((note) => note.isPinned));
  };

  const handleMoveToTrash = async (noteId) => {
    const result = await moveNoteToTrash(noteId);
    setFavorites(result.notes.filter((note) => note.isPinned));
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

  const renderItem = ({ item }) => (
    <NoteCard
      colors={colors}
      title={item.title}
      preview={getBodyPreview(getNoteContent(item))}
      previewHtml={getNoteContent(item)}
      dateLabel={getNoteDateLabel(item)}
      onPress={() => navigation.navigate('Edit', { note: item })}
      topRightAction={{
        onPress: () => handleToggleFavorite(item.id),
        icon: <Star color={colors.star} fill={colors.star} size={16} />,
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
      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Star color={colors.faint} size={42} />
          </View>
          <Text style={styles.emptyMessage}>No favorites yet</Text>
          <Text style={styles.emptyHint}>Tap Favorite on a note card to keep it here.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
});
