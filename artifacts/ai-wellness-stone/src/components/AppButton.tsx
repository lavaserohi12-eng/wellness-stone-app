import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useColors } from '@/hooks/useColors';

type Variant = 'primary' | 'secondary' | 'ghost';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  testID?: string;
}

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  testID,
}: AppButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  const bgColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
      ? colors.secondary
      : 'transparent';

  const textColor =
    variant === 'primary'
      ? colors.primaryForeground
      : variant === 'secondary'
      ? colors.secondaryForeground
      : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bgColor,
          borderRadius: 14,
          opacity: isDisabled ? 0.55 : pressed ? 0.8 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? colors.border : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: textColor, fontFamily: 'Inter_600SemiBold' },
        ]}
      >
        {loading ? 'Loading…' : title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { height: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  label: { fontSize: 16 },
});
