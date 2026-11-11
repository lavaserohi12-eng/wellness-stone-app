import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { useColors } from '@/hooks/useColors';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'label' | 'error';

interface AppTextProps {
  children: React.ReactNode;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
}

export function AppText({ children, variant = 'body', style }: AppTextProps) {
  const colors = useColors();

  const colorMap: Record<Variant, string> = {
    title: colors.foreground,
    subtitle: colors.mutedForeground,
    body: colors.foreground,
    caption: colors.mutedForeground,
    label: colors.primary,
    error: colors.destructive,
  };

  const fontMap: Record<Variant, string> = {
    title: 'Inter_700Bold',
    subtitle: 'Inter_400Regular',
    body: 'Inter_400Regular',
    caption: 'Inter_400Regular',
    label: 'Inter_600SemiBold',
    error: 'Inter_400Regular',
  };

  return (
    <Text
      style={[
        styles.base,
        variantStyles[variant],
        { color: colorMap[variant], fontFamily: fontMap[variant] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({ base: {} });

const variantStyles = StyleSheet.create({
  title: { fontSize: 26, letterSpacing: -0.4, lineHeight: 32 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1 },
  error: { fontSize: 13, lineHeight: 19 },
});
