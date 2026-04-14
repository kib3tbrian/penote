import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X } from 'lucide-react-native';
import { theme } from '../theme';
import Logo from '../components/Logo';
import { LEGACY_ONBOARDING_KEY, ONBOARDING_COMPLETE_KEY } from '../utils/noteHelpers';

export default function OnboardingScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [page, setPage] = useState(0);
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const formattedDate = useMemo(
    () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    []
  );

  const handleStart = async () => {
    try {
      await AsyncStorage.multiSet([
        [ONBOARDING_COMPLETE_KEY, 'true'],
        [LEGACY_ONBOARDING_KEY, 'true'],
      ]);
      navigation.replace('Main');
    } catch (error) {
      navigation.replace('Main');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerBlock}>
        {page === 0 ? (
          <>
            <View style={styles.logoWrapper}>
              <Logo size={132} color={colors.background} backgroundColor={colors.text} />
            </View>
            <Text style={styles.title}>Penote</Text>
            <Text style={styles.subtitle}>
              Capture your thoughts instantly, pin your favorites, and export securely as beautifully formatted PDFs.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Private by Default</Text>
            <Text style={styles.subtitle}>
              Your notes stay on your device, and you stay in control of what gets kept, restored, or removed.
            </Text>
          </>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {page === 1 ? (
          <Text style={styles.privacyText}>
            By continuing, you agree to our{' '}
            <Text style={styles.privacyLink} onPress={() => setIsPolicyVisible(true)}>
              Privacy Policy
            </Text>
            . Your notes are stored locally on your device. We do not collect, transmit, or share any of your data.
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={page === 0 ? () => setPage(1) : handleStart}
        >
          <Text style={styles.buttonText}>{page === 0 ? 'Continue' : 'Get Started'}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isPolicyVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPolicyVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsPolicyVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              activeOpacity={0.8}
              onPress={() => setIsPolicyVisible(false)}
            >
              <X color={colors.text} size={18} />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>
                {'Privacy Policy\n\n'}
                {`Last updated: ${formattedDate}\n\n`}
                {'Penote is a local-first notes application. All notes you create are stored exclusively on your device using local storage.\n\n'}
                {'Data collection: Penote does not collect any personal data. We do not have access to your notes, your device information, or your usage patterns.\n\n'}
                {'Data storage: All data remains on your device. Uninstalling the app will permanently delete all your notes. We recommend using the export feature to back up important notes before uninstalling.\n\n'}
                {'Third-party services: Penote does not use any third-party analytics, advertising, or tracking services.\n\n'}
                {'Changes to this policy: If this policy changes in a future version, we will notify you within the app.\n\n'}
                {'Contact: support@penote.app'}
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrapper: {
    marginBottom: 44,
  },
  title: {
    fontSize: 44,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 24,
  },
  privacyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  privacyLink: {
    color: colors.primary,
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 20,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  buttonText: {
    color: colors.accentText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    maxHeight: '84%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  modalText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
});
