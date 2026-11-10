import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface JsonPreviewProps {
  value: unknown;
  emptyLabel?: string;
}

export function JsonPreview({ value, emptyLabel = 'None' }: JsonPreviewProps) {
  const colors = useColors();

  if (value === null || value === undefined) {
    return (
      <View
        style={[
          styles.emptyWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.emptyText,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          {emptyLabel}
        </Text>
      </View>
    );
  }

  let rendered: string;
  try {
    rendered = JSON.stringify(value, null, 2);
  } catch {
    rendered = String(value);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, { backgroundColor: colors.muted, borderRadius: 10 }]}
    >
      <Text
        style={[
          styles.code,
          {
            color: colors.foreground,
            fontFamily: Platform.select({
              ios: 'Menlo',
              android: 'monospace',
              default: 'monospace',
            }),
          },
        ]}
      >
        {rendered}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {},
  code: { fontSize: 12, lineHeight: 18, padding: 12 },
  emptyWrap: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  emptyText: { fontSize: 13, fontStyle: 'italic' },
});
