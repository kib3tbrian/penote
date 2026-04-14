import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getRichPreviewSegments } from '../utils/noteHelpers';

export default function NoteCard({
  colors,
  title,
  preview,
  previewHtml,
  dateLabel,
  dateColor,
  onPress,
  topRightAction,
  actions = [],
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const previewSegments = useMemo(
    () => getRichPreviewSegments(previewHtml || ''),
    [previewHtml]
  );

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'Untitled Note'}
          </Text>
          <Text style={[styles.date, dateColor ? { color: dateColor } : null]}>{dateLabel}</Text>
        </View>
        {topRightAction ? (
          <TouchableOpacity style={styles.topRightButton} activeOpacity={0.8} onPress={topRightAction.onPress}>
            {topRightAction.icon}
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.preview} numberOfLines={2}>
        {previewSegments.length > 0 ? previewSegments.map((segment, index) => (
          <Text
            key={`${segment.text}-${index}`}
            style={[
              segment.bold ? styles.previewBold : null,
              segment.italic ? styles.previewItalic : null,
              segment.underline ? styles.previewUnderline : null,
            ]}
          >
            {segment.text}
          </Text>
        )) : (preview || 'No additional content')}
      </Text>

      {actions.length > 0 ? (
        <View style={styles.footer}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[
                styles.actionButton,
                action.active && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              activeOpacity={0.8}
              onPress={action.onPress}
            >
              {action.icon}
              <Text
                style={[
                  styles.actionText,
                  { color: action.active ? colors.accentText : action.color || colors.text },
                ]}
              >
                {` ${action.label}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const getStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleWrap: {
    flex: 1,
    marginRight: 12,
  },
  topRightButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
  },
  date: {
    color: colors.faint,
    fontSize: 12,
  },
  preview: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  previewBold: {
    fontWeight: '700',
  },
  previewItalic: {
    fontStyle: 'italic',
  },
  previewUnderline: {
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
