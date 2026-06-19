import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  scrollable = false,
  style,
}: ScreenContainerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const paddingBottom =
    Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.background,
      paddingBottom,
    },
    style,
  ];

  if (scrollable) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={containerStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
