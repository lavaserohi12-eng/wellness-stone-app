import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useColors } from '@/hooks/useColors';
import { syncReminder } from '../src/services/notificationService';
import { fetchLatestPersonaProfile } from '../src/services/personaService';
import { ensureSession } from '../src/services/supabaseClient';
import { PersonaProvider } from '../src/state/PersonaContext';
import { WellnessProvider } from '../src/state/WellnessContext';
import { config } from '../src/config/env';

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingGlyph}>🪨</Text>
      <ActivityIndicator size="large" color="#C4714A" style={{ marginTop: 24 }} />
      <Text style={styles.loadingText}>Waking Stone…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#1A3A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingGlyph: {
    fontSize: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#F5EDD8',
    opacity: 0.7,
    letterSpacing: 1,
  },
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: 'Inter_600SemiBold',
          color: colors.foreground,
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="persona-setup" options={{ title: 'Wellness Profile' }} />
      <Stack.Screen name="persona-summary" options={{ title: 'Your Profile' }} />
      <Stack.Screen name="check-in" options={{ title: 'Check-in' }} />
      <Stack.Screen name="response" options={{ title: 'Response' }} />
      <Stack.Screen name="consent" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Privacy & Data' }} />
      <Stack.Screen name="debug" options={{ title: 'Debug' }} />
      <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
  });

  // SAI-11 — every screen assumes a real auth.uid() exists (RLS is enforced
  // on all user tables), so block first render until anonymous sign-in
  // resolves. If it errors (e.g. "Anonymous sign-ins" not yet enabled in the
  // dashboard), don't hang forever — let the app render anyway so Debug is
  // reachable; writes will simply fail with a clear error until it's fixed.
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Session timeout after 10s')), 10000)
    );
    Promise.race([ensureSession(), timeout])
      .catch((err) => {
        console.error('[RootLayout] ensureSession failed:', err);
      })
      .finally(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && sessionReady) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, sessionReady]);

  // Re-sync the nightly reminder whenever the app becomes active — on cold
  // launch and whenever it returns from the background. Fire-and-forget:
  // this is a best-effort UX nudge, not core app data, so failures (no
  // persona yet, offline, permission revoked) are logged and swallowed
  // rather than surfaced to the user.
  useEffect(() => {
    if (!sessionReady) return;

    const runSync = () => {
      fetchLatestPersonaProfile()
        .then((persona) => syncReminder(persona))
        .catch((err) => console.warn('[RootLayout] syncReminder failed:', err));
    };

    runSync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') runSync();
    });
    return () => subscription.remove();
  }, [sessionReady]);

  if ((!fontsLoaded && !fontError) || !sessionReady) return <LoadingScreen />;
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return (
      <View style={[styles.loading, { padding: 32 }]}>
        <Text style={{ color: '#F5EDD8', fontSize: 28, marginBottom: 20 }}>AI Wellness Stone</Text>
        <Text style={{ color: '#F5EDD8', fontSize: 20, marginBottom: 16 }}>Setup required</Text>
        <Text style={{ color: '#F5EDD8', textAlign: 'center', maxWidth: 480, lineHeight: 24 }}>
          Configure the Supabase URL and public client key in the mobile app environment,
          then restart Expo. See the repository README for setup instructions.
          No check-in data has been submitted.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <PersonaProvider>
            <WellnessProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </WellnessProvider>
          </PersonaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
