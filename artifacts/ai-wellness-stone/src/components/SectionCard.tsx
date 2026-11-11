import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  bordered?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  children,
  bordered = true,
}: SectionCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        bordered && {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 16,
        },
        !bordered && styles.borderless,
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 0 },
  borderless: { gap: 0 },
  title: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  content: { marginTop: 10, gap: 8 },
});
