import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

export type BLEStatus = 'disconnected' | 'scanning' | 'connected';

interface DeviceStatusProps {
  status: BLEStatus;
  deviceId?: string;
  rssi?: number;
}

const STATUS_LABEL: Record<BLEStatus, string> = {
  disconnected: 'Disconnected',
  scanning: 'Scanning…',
  connected: 'Connected',
};

const STATUS_DOT: Record<BLEStatus, string> = {
  disconnected: '#94A3B8',
  scanning: '#F59E0B',
  connected: '#16A34A',
};

export function DeviceStatus({ status, deviceId, rssi }: DeviceStatusProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: STATUS_DOT[status] }]} />
      <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {STATUS_LABEL[status]}
      </Text>
      {status === 'connected' && deviceId ? (
        <Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {deviceId}{rssi !== undefined ? `  ${rssi} dBm` : ''}
        </Text>
      ) : null}
      {status !== 'connected' ? (
        <Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          (stub — no real BLE yet)
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 14 },
  detail: { fontSize: 12, flex: 1, textAlign: 'right' },
});
