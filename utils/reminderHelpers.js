import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_CHANNEL_ID = 'reminders';

export const ensureReminderPermissions = async () => {
  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted;
};

const ensureReminderChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#007AFF',
    sound: 'default',
  });
};

export const scheduleNoteReminder = async (note, reminderDate) => {
  const hasPermission = await ensureReminderPermissions();
  if (!hasPermission) {
    throw new Error('Notifications permission was not granted.');
  }

  await ensureReminderChannel();

  const triggerDate = new Date(reminderDate);
  if (Number.isNaN(triggerDate.getTime()) || triggerDate <= new Date()) {
    throw new Error('Reminder time must be in the future.');
  }

  const contentTitle = note.title?.trim() || 'Untitled Note';
  const contentBody = note.body?.trim() || 'Open Penote to view this reminder.';

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Reminder: ${contentTitle}`,
      body: contentBody,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: Platform.OS === 'android'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: REMINDER_CHANNEL_ID,
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
