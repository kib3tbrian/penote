import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from './theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'system' | 'light' | 'dark'

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user_theme_preference');
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    let newMode;
    if (themeMode === 'system') newMode = 'light';
    else if (themeMode === 'light') newMode = 'dark';
    else newMode = 'system';

    setThemeMode(newMode);
    try {
      await AsyncStorage.setItem('user_theme_preference', newMode);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const isDark = useMemo(() => {
    if (themeMode === 'system') return systemColorScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = isDark ? theme.dark : theme.light;

  const value = {
    themeMode,
    toggleTheme,
    isDark,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
