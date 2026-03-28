import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Home, Star } from 'lucide-react-native';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'; // ← add this

import HomeScreen from './screens/HomeScreen';
import EditScreen from './screens/EditScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { theme } from './theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ colors }) {
  const insets = useSafeAreaInsets(); // ← add this

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background, shadowColor: 'transparent', elevation: 0 },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom || 8, // ← changed
          paddingTop: 8,
          height: 64 + insets.bottom,        // ← changed
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        sceneContainerStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="NotesList"
        component={HomeScreen}
        options={{
          title: 'Penote',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size + 2} />
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => <Star color={color} size={size + 2} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? theme.dark : theme.light;

  useEffect(() => {
    async function checkFirstLaunch() {
      try {
        const value = await AsyncStorage.getItem('has_onboarded');
        setIsFirstLaunch(value === null);
      } catch (e) {
        setIsFirstLaunch(false);
      }
    }
    checkFirstLaunch();
  }, []);

  if (isFirstLaunch === null) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaProvider> {/* ← wrap everything */}
      <StatusBar style="auto" />
      <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
        <Stack.Navigator
          initialRouteName={isFirstLaunch ? 'Onboarding' : 'Main'}
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Main"
            options={{ headerShown: false }}
          >
            {() => <MainTabs colors={colors} />}
          </Stack.Screen>
          <Stack.Screen
            name="Edit"
            component={EditScreen}
            options={({ route }) => ({
              title: route.params?.note ? 'Edit Note' : 'New Note',
              presentation: 'modal',
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider> // ← close it
  );
}

registerRootComponent(App);