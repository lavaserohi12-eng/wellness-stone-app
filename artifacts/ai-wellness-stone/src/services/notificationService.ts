import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { hasCheckedInToday } from './checkInService';
import { PersonaProfile } from '../types/wellness';

// Reminders are a device-local nudge, not part of the Data Contract — no
// server/DB involvement. They're scheduled as a one-shot local notification
// (never a recurring trigger), re-synced on every app foreground and right
// after a check-in is saved, so "is today's log done yet?" is always
// re-checked against the real nightly_entries table rather than trusted from
// a stale schedule.
const REMINDER_ENABLED_KEY = 'reminders_enabled_v1';
const REMINDER_NOTIFICATION_ID = 'nightly-checkin-reminder';

// preferred_checkin_time is a coarse category collected in persona-setup
// (Step 1), not an exact time — map each to the start of that window.
// The reminder fires at this hour; if the user hasn't logged by then the
// catch-up logic in syncReminder fires 5 minutes from now instead.
const BASE_HOUR_BY_PREFERENCE: Record<string, number> = {
  morning: 8,    // 8 am
  afternoon: 13, // 1 pm
  evening: 19,   // 7 pm
  bedtime: 21,   // 9 pm
  no_preference: 20, // 8 pm — reasonable default
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function isReminderEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(REMINDER_ENABLED_KEY);
  return stored === 'true';
}

export async function setReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) await cancelReminder();
}

export interface NotificationPermissionResult {
  granted: boolean;
  canAskAgain: boolean;
}

export async function requestReminderPermission(): Promise<NotificationPermissionResult> {
  if (Platform.OS === 'web') return { granted: false, canAskAgain: false };

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return { granted: true, canAskAgain: true };

  const requested = await Notifications.requestPermissionsAsync();
  return { granted: requested.granted, canAskAgain: requested.canAskAgain };
}

export async function cancelReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {
    // No-op if nothing was scheduled under this id.
  });
}

function computeReminderTarget(persona: PersonaProfile | null): Date {
  const baseHour = BASE_HOUR_BY_PREFERENCE[persona?.preferred_checkin_time ?? 'no_preference']
    ?? BASE_HOUR_BY_PREFERENCE.no_preference;

  const target = new Date();
  target.setHours(baseHour, 0, 0, 0);
  return target;
}

function reminderBody(persona: PersonaProfile | null): string {
  const pref = persona?.preferred_checkin_time ?? 'no_preference';
  switch (pref) {
    case 'morning':   return "Good morning — take a moment to check in with your Stone.";
    case 'afternoon': return "Afternoon check-in time — your Stone is ready when you are.";
    case 'evening':   return "Good evening — your Stone is here for tonight's check-in.";
    case 'bedtime':   return "Almost bedtime — do a quick check-in before you wind down.";
    default:          return "Your Stone is waiting — take a minute for yourself.";
  }
}

// Re-syncs the single pending reminder notification against current state:
// disabled -> cancel; already logged today -> cancel; target time still
// ahead today -> schedule for that time; target time already passed today
// (e.g. user opens the app late and still hasn't logged) -> schedule a short
// catch-up reminder instead of silently skipping the day.
export async function syncReminder(persona: PersonaProfile | null): Promise<void> {
  if (Platform.OS === 'web') return;

  const enabled = await isReminderEnabled();
  if (!enabled) {
    await cancelReminder();
    return;
  }

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    await cancelReminder();
    return;
  }

  const alreadyLogged = await hasCheckedInToday().catch((err) => {
    console.warn('[notificationService] hasCheckedInToday check failed, skipping sync:', err);
    return null;
  });
  if (alreadyLogged === null) return; // couldn't verify — leave any existing schedule as-is
  if (alreadyLogged) {
    await cancelReminder();
    return;
  }

  const target = computeReminderTarget(persona);
  const now = new Date();
  const CATCH_UP_DELAY_MS = 5 * 60 * 1000;
  const fireDate = target.getTime() > now.getTime() ? target : new Date(now.getTime() + CATCH_UP_DELAY_MS);

  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_NOTIFICATION_ID,
    content: {
      title: 'Your Stone is waiting',
      body: reminderBody(persona),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });
}
