import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface JsonPreviewProps {
  label: string;
  data: unknown;
}

export function JsonPreview({ label, data }: JsonPreviewProps) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
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
              fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
            },
          ]}
        >
          {data == null ? 'null' : JSON.stringify(data, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.9 },
  scroll: { borderRadius: 10 },
  code: { fontSize: 12, lineHeight: 18, padding: 12 },
});
