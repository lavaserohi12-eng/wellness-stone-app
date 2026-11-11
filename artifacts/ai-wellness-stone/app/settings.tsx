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
import { usePersona } from '../src/state/PersonaContext';
import { useWellness } from '../src/state/WellnessContext';

// "Export my data" / "Delete my data" call the authenticated Express API,
// which resolves the caller's OWN user id from their session
// token — this screen never sends a user_id itself.

type Status = 'idle' | 'working' | 'done' | 'failed';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [exportStatus, setExportStatus] = useState<Status>('idle');
  const [deleteStatus, setDeleteStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { clearPersona } = usePersona();
  const { clearCheckIn } = useWellness();

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
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'stone-data-export.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await Clipboard.setStringAsync(json);
      }
      setExportStatus('done');
      if (Platform.OS !== 'web') Alert.alert(
        'Export ready',
        'Your data was copied to the clipboard as JSON.',
      );
    } catch (err) {
      setExportStatus('failed');
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const confirmDelete = () => setShowDeleteConfirmation(true);

  const handleDelete = async () => {
    setError(null);
    setDeleteStatus('working');
    try {
      await deleteMyData();
      clearPersona();
      clearCheckIn();
      await setReminderEnabled(false);
      setRemindersOn(false);
      setShowDeleteConfirmation(false);
      setDeleteStatus('done');
      if (Platform.OS !== 'web') Alert.alert('Deleted', 'Your data has been deleted.', [
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
          Get a copy of your check-ins, wellness profile, safety events, device
          telemetry, consent history, app events and deletion audit records.
        </AppText>
        <AppButton
          title="Export my data"
          onPress={handleExport}
          loading={exportStatus === 'working'}
          testID="btn-export-data"
        />
        {exportStatus === 'done' && (
          <AppText variant="body">
            {Platform.OS === 'web' ? 'Your data export has been downloaded.' : 'Your data was copied to the clipboard.'}
          </AppText>
        )}
      </SectionCard>

      <SectionCard title="Delete my data">
        <AppText variant="body">
          Permanently deletes your check-ins, profile, telemetry, safety events,
          app events and consent history. A minimal deletion audit record is
          retained and included in exports. This cannot be undone.
        </AppText>
        <AppButton
          title="Delete my data"
          onPress={confirmDelete}
          loading={deleteStatus === 'working'}
          variant="secondary"
          testID="btn-delete-data"
        />
        {showDeleteConfirmation && (
          <View style={{ gap: 12 }}>
            <AppText variant="body">
              Delete all my data? This permanently removes your check-ins, wellness
              profile, telemetry, safety events, app events and consent history.
              A minimal deletion audit record is retained. This cannot be undone.
            </AppText>
            <AppButton
              title="Delete permanently"
              onPress={handleDelete}
              loading={deleteStatus === 'working'}
              testID="btn-confirm-delete"
            />
            <AppButton title="Cancel" onPress={() => setShowDeleteConfirmation(false)} variant="secondary" />
          </View>
        )}
        {deleteStatus === 'done' && <AppText variant="body">Your data has been deleted.</AppText>}
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
