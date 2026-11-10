import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { AppButton } from '../src/components/AppButton';
import { AppScreen } from '../src/components/AppScreen';
import { AppText } from '../src/components/AppText';
import { SectionCard } from '../src/components/SectionCard';
import { deleteMyData, exportMyData } from '../src/services/dataControlsService';
import {
  isReminderEnabled,
  requestReminderPermission,
  setReminderEnabled,
  syncReminder,
} from '../src/services/notificationService';
import { fetchLatestPersonaProfile } from '../src/services/personaService';
import { getCurrentUserId } from '../src/services/supabaseClient';

// SAI-11 — "Export my data" / "Delete my data". Both call the data-controls
// Edge Function, which resolves the caller's OWN user id from their session
// token — this screen never sends a user_id itself.

type Status = 'idle' | 'working' | 'done' | 'failed';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [exportStatus, setExportStatus] = useState<Status>('idle');
  const [deleteStatus, setDeleteStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  // Reminders default OFF and require an explicit opt-in + OS permission
  // grant, per the app's permission-request convention.
  const [remindersOn, setRemindersOn] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => {
    isReminderEnabled().then(setRemindersOn);
  }, []);

  const handleToggleReminders = async (next: boolean) => {
    if (reminderBusy) return;
    setReminderBusy(true);
    try {
      if (!next) {
        await setReminderEnabled(false);
        setRemindersOn(false);
        return;
      }

      const permission = await requestReminderPermission();
      if (!permission.granted) {
        if (!permission.canAskAgain && Platform.OS !== 'web') {
          Alert.alert(
            'Notifications are off',
            'Enable notifications for this app in system settings to turn on reminders.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
        } else {
          Alert.alert('Permission needed', 'Reminders need notification permission to work.');
        }
        setRemindersOn(false);
        return;
      }

      await setReminderEnabled(true);
      setRemindersOn(true);
      const persona = await fetchLatestPersonaProfile().catch(() => null);
      await syncReminder(persona);
    } catch (err) {
      console.error('[settings] handleToggleReminders failed:', err);
      Alert.alert('Something went wrong', 'Could not update reminder settings.');
    } finally {
      setReminderBusy(false);
    }
  };

  const handleExport = async () => {
    setError(null);
    setExportStatus('working');
    try {
      const data = await exportMyData();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        console.log('[settings] exported data:', json);
      } else {
        await Clipboard.setStringAsync(json);
      }
      setExportStatus('done');
      Alert.alert(
        'Export ready',
        Platform.OS === 'web'
          ? 'Your data was logged to the console.'
          : 'Your data was copied to the clipboard as JSON.',
      );
    } catch (err) {
      setExportStatus('failed');
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete all my data?',
      'This permanently removes your check-ins, wellness profile, telemetry readings, and consent history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  };

  const handleDelete = async () => {
    setError(null);
    setDeleteStatus('working');
    try {
      await deleteMyData();
      setDeleteStatus('done');
      Alert.alert('Deleted', 'Your data has been deleted.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (err) {
      setDeleteStatus('failed');
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <AppScreen scroll>
      <View style={styles.headerArea}>
        <AppText variant="title">Privacy & Data</AppText>
        <AppText variant="subtitle">
          Your check-ins, wellness profile, and telemetry are tied to this device's anonymous
          account. Export or delete them below.
        </AppText>
      </View>

      <SectionCard title="Check-in reminders">
        <AppText variant="body">
          Get a gentle nudge at your preferred check-in time if you haven't logged yet that day.
        </AppText>
        <View style={styles.toggleRow}>
          <AppText variant="body">Remind me</AppText>
          <Switch
            value={remindersOn}
            onValueChange={handleToggleReminders}
            disabled={reminderBusy}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
            testID="switch-reminders"
          />
        </View>
      </SectionCard>

      <SectionCard title="Export my data">
        <AppText variant="body">
          Get a copy of everything stored under your account (check-ins, wellness profile, safety
          events, device telemetry, and consent history).
        </AppText>
        <AppButton
          title="Export my data"
          onPress={handleExport}
          loading={exportStatus === 'working'}
          testID="btn-export-data"
        />
      </SectionCard>

      <SectionCard title="Delete my data">
        <AppText variant="body">
          Permanently deletes everything stored under your account. This cannot be undone.
        </AppText>
        <AppButton
          title="Delete my data"
          onPress={confirmDelete}
          loading={deleteStatus === 'working'}
          variant="secondary"
          testID="btn-delete-data"
        />
      </SectionCard>

      {error && (
        <SectionCard title="Error">
          <AppText variant="error">{error}</AppText>
        </SectionCard>
      )}

      <AppButton title="Back Home" onPress={() => router.replace('/')} variant="secondary" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerArea: { gap: 6, paddingBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
