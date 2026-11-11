import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

type Status = 'idle' | 'success' | 'warning' | 'error' | 'saving' | 'saved' | 'failed';

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const DEFAULT_LABELS: Record<Status, string> = {
  idle: 'Idle',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Failed',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = useColors();

  const bg: Record<Status, string> = {
    idle: colors.secondary,
    success: '#F0FDF4',
    warning: '#FFFBEB',
    error: '#FEF2F2',
    saving: colors.secondary,
    saved: '#F0FDF4',
    failed: '#FEF2F2',
  };

  const textColor: Record<Status, string> = {
    idle: colors.mutedForeground,
    success: '#16A34A',
    warning: '#B45309',
    error: colors.destructive,
    saving: colors.primary,
    saved: '#16A34A',
    failed: colors.destructive,
  };

  const borderColor: Record<Status, string> = {
    idle: colors.border,
    success: '#86EFAC',
    warning: '#FDE68A',
    error: colors.destructive,
    saving: colors.border,
    saved: '#86EFAC',
    failed: colors.destructive,
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg[status],
          borderColor: borderColor[status],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor[status],
            fontFamily: 'Inter_600SemiBold',
          },
        ]}
      >
        {label ?? DEFAULT_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 12, letterSpacing: 0.3 },
});
