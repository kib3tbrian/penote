import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useColorScheme, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import Logo from '../components/Logo';

export default function OnboardingScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const styles = useMemo(() => getStyles(colors), [colors]);

  const handleStart = async () => {
    try {
      await AsyncStorage.setItem('has_onboarded', 'true');
      navigation.replace('Main');
    } catch (e) {
      navigation.replace('Main');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerBlock}>
        <View style={styles.logoWrapper}>
          <Logo size={132} color={colors.background} backgroundColor={colors.text} />
        </View>
        <Text style={styles.title}>note2pdf</Text>
        <Text style={styles.subtitle}>
          Capture your thoughts instantly, pin your favorites, and export securely as beautifully formatted PDFs.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleStart}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
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
});
