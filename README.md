# Penote

A lightweight, offline-first note-taking app for React Native (Expo) with PDF export.

## ✅ Overview

**Penote** is a modern mobile note app with:
- local persistence via `@react-native-async-storage/async-storage`
- search (title/body)
- pin/favorites support
- create and edit notes
- export note as PDF (`expo-print` + `expo-sharing`)
- onboarding on first launch
- dark/light theme based on system color scheme

## 📁 Repository structure

- `App.js` — navigation and onboarding logic
- `screens/HomeScreen.js` — notes list, search, pin, delete, export, create
- `screens/EditScreen.js` — create/edit note form
- `screens/FavoritesScreen.js` — pinned notes view
- `screens/OnboardingScreen.js` — initial setup prompt
- `theme.js` — light/dark color palette
- `components/Logo.js` — app icon component

## 🚀 Getting started

### Prerequisites
- Node.js
- Expo CLI (`npm install -g expo-cli`)
- Android Studio or Xcode (emulators) or Expo Go on device

### Install

```bash
cd penote
npm install
```

### Run

```bash
expo start
```

Use the QR code, or run `a` / `i` for Android / iOS emulator.

## 🧩 Dependencies

- `react-native`
- `expo`
- `@react-native-async-storage/async-storage`
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `expo-print`
- `expo-sharing`
- `lucide-react-native`
- `uuid`

## 🔧 Data model and behavior

- Notes stored in AsyncStorage key `notes_v1`
- Onboarding flag stored as `has_onboarded`
- Pinned notes (`isPinned`) appear first and in the `Favorites` tab
- Edit saves `/` updates note metadata (`createdAt`, `updatedAt`)
- PDF export sanitizes and formats content

## 🧪 Manual test checklist

1. First launch onboarding should show once
2. Add note (title and/or body)
3. Edit existing note
4. Pin and unpin notes
5. Search by title/body
6. Export note to PDF and share
7. Delete note with confirmation
8. Switch dark/light system theme

## 💡 Improvements

- Undo delete
- Bulk export and multi-select actions
- Cloud sync (Dropbox, Google Drive)
- Markdown support
- Internationalization

## 📝 License

Choose your license (e.g., MIT).

