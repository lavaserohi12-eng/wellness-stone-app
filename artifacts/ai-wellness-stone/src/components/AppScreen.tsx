import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

interface AppScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  title?: string;
  subtitle?: string;
  paddingHorizontal?: number;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
}

export function AppScreen({
  children,
  scroll = false,
  title,
  subtitle,
  paddingHorizontal = 20,
  keyboardShouldPersistTaps,
}: AppScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top + 8;
  const paddingBottom = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const header =
    title || subtitle ? (
      <View style={styles.header}>
        {title ? (
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: 'Inter_700Bold' },
            ]}
          >
            {title}
          </Text>
        ) : null}
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
      </View>
    ) : null;

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop, paddingBottom, paddingHorizontal },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {header}
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop, paddingBottom, paddingHorizontal },
      ]}
    >
      {header}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { gap: 16 },
  header: { gap: 4, paddingBottom: 4 },
  title: { fontSize: 26, letterSpacing: -0.4 },
  subtitle: { fontSize: 15, lineHeight: 22 },
});
