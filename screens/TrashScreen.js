import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2 } from 'lucide-react-native';
import NoteCard from '../components/NoteCard';
import { theme } from '../theme';
import { getBodyPreview, getNoteContent } from '../utils/noteHelpers';
import {
  emptyTrash,
  loadTrash,
  permanentlyDeleteTrashNote,
  restoreTrashNote,
} from '../utils/noteStorage';

export default function TrashScreen() {
  const [trashNotes, setTrashNotes] = useState([]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const styles = useMemo(() => getStyles(colors), [colors]);

  const getDaysRemaining = (deletedAt) => {
    const elapsed = Date.now() - new Date(deletedAt).getTime();
    const remaining = Math.ceil((7 * 24 * 60 * 60 * 1000 - elapsed) / (1000 * 60 * 60 * 24));
    return Math.max(remaining, 0);
  };

  const getCountdownLabel = (deletedAt) => {
    const remaining = getDaysRemaining(deletedAt);

    if (remaining > 1) {
      return `Deletes in ${remaining} days`;
    }

    if (remaining === 1) {
      return 'Deletes tomorrow';
    }

    return 'Deletes today';
  };

  const loadTrashNotes = useCallback(async () => {
    try {
      const storedTrash = await loadTrash();
      setTrashNotes(storedTrash.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0)));
    } catch (error) { }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrashNotes();
    }, [loadTrashNotes])
  );

  const handleRestore = async (noteId) => {
    const result = await restoreTrashNote(noteId);
    setTrashNotes(result.trash.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0)));
  };

  const handlePermanentDelete = async (noteId) => {
    Alert.alert(
      'Delete Forever',
      'This note will be permanently removed from trash.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedTrash = await permanentlyDeleteTrashNote(noteId);
            setTrashNotes(updatedTrash.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0)));
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (trashNotes.length === 0) return;

    Alert.alert(
      'Empty Trash',
      'All deleted notes will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            const clearedTrash = await emptyTrash();
            setTrashNotes(clearedTrash);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <NoteCard
      colors={colors}
      title={item.title}
      preview={getBodyPreview(getNoteContent(item))}
      dateLabel={getCountdownLabel(item.deletedAt)}
      dateColor={getDaysRemaining(item.deletedAt) === 0 ? colors.danger : colors.faint}
      onPress={() => {}}
      actions={[
        {
          label: 'Restore',
          onPress: () => handleRestore(item.id),
          icon: <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: '700' }}>+</Text>,
          active: true,
        },
        {
          label: 'Delete',
          onPress: () => handlePermanentDelete(item.id),
          icon: <Trash2 color={colors.danger} size={15} />,
          color: colors.danger,
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>Recently Deleted</Text>
          <Text style={styles.topBarHint}>Notes are auto-deleted after 7 days.</Text>
        </View>
        <TouchableOpacity style={styles.emptyButton} activeOpacity={0.8} onPress={handleEmptyTrash}>
          <Trash2 color={colors.danger} size={16} />
          <Text style={styles.emptyButtonText}> Empty Trash</Text>
        </TouchableOpacity>
      </View>

      {trashNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyMessage}>Trash is empty</Text>
          <Text style={styles.emptyHint}>Deleted notes will stay here for 7 days.</Text>
        </View>
      ) : (
        <FlatList
          data={trashNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  topBarHint: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
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
});
