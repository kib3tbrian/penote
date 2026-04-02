import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, useColorScheme, LayoutAnimation, UIManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Star } from 'lucide-react-native';
import { theme } from '../theme';
import { getReminderLabel } from '../utils/noteHelpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const styles = useMemo(() => getStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem('notes_v1');
      if (storedNotes) {
        const parsed = JSON.parse(storedNotes);
        setFavorites(parsed.filter((note) => note.isPinned));
      } else {
        setFavorites([]);
      }
    } catch (error) { }
  };

  const togglePin = async (id) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const storedNotes = await AsyncStorage.getItem('notes_v1');
      if (storedNotes) {
        let parsed = JSON.parse(storedNotes);
        parsed = parsed.map((note) => (note.id === id ? { ...note, isPinned: !note.isPinned } : note));
        await AsyncStorage.setItem('notes_v1', JSON.stringify(parsed));
        setFavorites(parsed.filter((note) => note.isPinned));
      }
    } catch (error) { }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Edit', { note: item, storageKey: 'notes_v1' })}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled Note'}</Text>
        <TouchableOpacity style={styles.pinButton} onPress={() => togglePin(item.id)}>
          <Star color={colors.star} fill={colors.star} size={24} />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      {item.reminderAt ? (
        <View style={styles.reminderPill}>
          <Bell color={colors.primary} size={14} />
          <Text style={styles.reminderPillText}>{` ${getReminderLabel(item.reminderAt)}`}</Text>
        </View>
      ) : null}
      <Text style={styles.cardBody} numberOfLines={3}>{item.body}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Star color={colors.faint} size={48} />
          </View>
          <Text style={styles.emptyMessage}>No favorites yet</Text>
          <Text style={styles.emptyHint}>Pin a note to see it here</Text>
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
  listContent: { padding: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
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
  cardDate: { color: colors.faint, fontSize: 13, marginTop: 2, marginBottom: 12 },
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
    marginBottom: 12,
  },
  reminderPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: { color: colors.muted, fontSize: 16, lineHeight: 22 },
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
});
