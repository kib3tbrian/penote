import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { FileText, ArrowRight } from 'lucide-react-native';

export default function Logo({ size = 80, color, backgroundColor }) {
  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor, borderRadius: size * 0.28 }]}>
      <FileText color={color} size={size * 0.5} strokeWidth={2.5} />
      <View style={[styles.badge, { backgroundColor: color }]}>
        <ArrowRight color={backgroundColor} size={size * 0.22} strokeWidth={3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14 },
      android: { elevation: 12 },
    }),
  },
  badge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    borderRadius: 9999,
    padding: 3,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  }
});
