import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NOTES_STORAGE_KEY,
  TRASH_STORAGE_KEY,
  isTrashExpired,
  normalizeNote,
  normalizeTrashNote,
  parseStoredNotes,
  parseStoredTrash,
} from './noteHelpers';

const writeIfChanged = async (storageKey, originalValue, nextValue) => {
  const serializedValue = JSON.stringify(nextValue);
  if (originalValue !== serializedValue) {
    await AsyncStorage.setItem(storageKey, serializedValue);
  }
  return nextValue;
};

export const loadNotes = async () => {
  const storedValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
  const notes = parseStoredNotes(storedValue);
  await writeIfChanged(NOTES_STORAGE_KEY, storedValue, notes);
  return notes;
};

export const saveNotes = async (notes) => {
  const normalizedNotes = notes.map(normalizeNote);
  await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(normalizedNotes));
  return normalizedNotes;
};

export const saveNote = async (noteInput) => {
  const existingNotes = await loadNotes();
  const existingNote = noteInput?.id
    ? existingNotes.find((note) => note.id === noteInput.id)
    : null;
  const timestamp = new Date().toISOString();
  const savedNote = normalizeNote({
    ...existingNote,
    ...noteInput,
    createdAt: noteInput?.createdAt || existingNote?.createdAt || timestamp,
    updatedAt: timestamp,
  });

  const updatedNotes = existingNote
    ? existingNotes.map((note) => (note.id === savedNote.id ? savedNote : note))
    : [savedNote, ...existingNotes];

  await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
  return savedNote;
};

export const loadTrash = async () => {
  const storedValue = await AsyncStorage.getItem(TRASH_STORAGE_KEY);
  const trashNotes = parseStoredTrash(storedValue);
  return cleanupExpiredTrash(trashNotes, storedValue);
};

export const saveTrash = async (trashNotes) => {
  const normalizedTrashNotes = trashNotes.map(normalizeTrashNote);
  await AsyncStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(normalizedTrashNotes));
  return normalizedTrashNotes;
};

export const cleanupExpiredTrash = async (trashNotes, originalValue) => {
  const normalizedTrashNotes = (trashNotes || []).map(normalizeTrashNote);
  const cleanedTrashNotes = normalizedTrashNotes.filter((note) => !isTrashExpired(note));
  const previousValue = originalValue ?? JSON.stringify(normalizedTrashNotes);
  await writeIfChanged(TRASH_STORAGE_KEY, previousValue, cleanedTrashNotes);
  return cleanedTrashNotes;
};

export const cleanupExpiredTrashStorage = async () => {
  const storedValue = await AsyncStorage.getItem(TRASH_STORAGE_KEY);
  const trashNotes = parseStoredTrash(storedValue);
  return cleanupExpiredTrash(trashNotes, storedValue);
};

export const moveNoteToTrash = async (noteId) => {
  const notes = await loadNotes();
  const trashNotes = await loadTrash();
  const noteToTrash = notes.find((note) => note.id === noteId);
  if (!noteToTrash) {
    return { notes, trash: trashNotes, movedNote: null };
  }

  const updatedNotes = notes.filter((note) => note.id !== noteId);
  const updatedTrash = [
    {
      ...noteToTrash,
      deletedAt: new Date().toISOString(),
    },
    ...trashNotes.filter((note) => note.id !== noteId),
  ].map(normalizeTrashNote);

  await AsyncStorage.multiSet([
    [NOTES_STORAGE_KEY, JSON.stringify(updatedNotes)],
    [TRASH_STORAGE_KEY, JSON.stringify(updatedTrash)],
  ]);

  return {
    notes: updatedNotes,
    trash: updatedTrash,
    movedNote: normalizeTrashNote({ ...noteToTrash, deletedAt: new Date().toISOString() }),
  };
};

export const restoreTrashNote = async (noteId) => {
  const notes = await loadNotes();
  const trashNotes = await loadTrash();
  const noteToRestore = trashNotes.find((note) => note.id === noteId);
  if (!noteToRestore) {
    return { notes, trash: trashNotes, restoredNote: null };
  }

  const updatedTrash = trashNotes.filter((note) => note.id !== noteId);
  const { deletedAt, ...restoredNote } = noteToRestore;
  const updatedNotes = [normalizeNote({ ...restoredNote, updatedAt: new Date().toISOString() }), ...notes];

  await AsyncStorage.multiSet([
    [NOTES_STORAGE_KEY, JSON.stringify(updatedNotes)],
    [TRASH_STORAGE_KEY, JSON.stringify(updatedTrash)],
  ]);

  return { notes: updatedNotes, trash: updatedTrash, restoredNote };
};

export const permanentlyDeleteTrashNote = async (noteId) => {
  const trashNotes = await loadTrash();
  const updatedTrash = trashNotes.filter((note) => note.id !== noteId);
  await AsyncStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updatedTrash));
  return updatedTrash;
};

export const emptyTrash = async () => {
  await AsyncStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify([]));
  return [];
};
