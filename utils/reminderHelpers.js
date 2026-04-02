import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const ensureReminderPermissions = async () => {
  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted;
};

export const scheduleNoteReminder = async (note, reminderDate) => {
  const hasPermission = await ensureReminderPermissions();
  if (!hasPermission) {
    throw new Error('Notifications permission was not granted.');
  }

  const triggerDate = new Date(reminderDate);
  if (Number.isNaN(triggerDate.getTime()) || triggerDate <= new Date()) {
    throw new Error('Reminder time must be in the future.');
  }

  const contentTitle = note.title?.trim() || 'Untitled Note';
  const contentBody = note.body?.trim() || 'Open Penote to view this reminder.';

  return Notifications.scheduleNotificationAsync({
    content: {
      title: contentTitle,
      body: contentBody,
      sound: true,
    },
    trigger: Platform.OS === 'android'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: 'reminders',
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
  });
};

export const cancelScheduledReminder = async (notificationId) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) { }
};
