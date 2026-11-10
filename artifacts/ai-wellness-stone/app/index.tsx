import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCrisisResource } from '../src/services/crisisResources';
import { hasConsent } from '../src/services/consentService';
import {
  getTimeOfDay,
  getGreeting,
  getCheckInButtonLabel,
  type TimeOfDay,
} from '../src/utils/timeOfDay';

// ── Design tokens (Blend palette) ─────────────────────────────────────────
const T = {
  forestGreen: '#1A3A2A',
  midGreen:    '#2C5040',
  sage:        '#4A7C59',
  cream:       '#F5EDD8',
  terracotta:  '#C4714A',
  olive:       '#6B7A5A',
  crisis:      '#D03030',
} as const;

// Reference screen height — all orb/ring sizes were designed at this height.
// Anything smaller scales down; larger screens stay at 1×.
const REF_HEIGHT = 844;

// ── Animated concentric ring ───────────────────────────────────────────────
function BreathRing({
  size, anim, borderWidth = 1.5, opacity, color = T.sage,
}: {
  size: number; anim: Animated.Value; borderWidth?: number;
  opacity: number; color?: string;
}) {
  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const ringOp  = anim.interpolate({ inputRange: [0, 1], outputRange: [opacity, opacity * 0.55] });
  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      borderWidth, borderColor: color,
      opacity: ringOp, transform: [{ scale }],
    }} />
  );
}

// ── Home screen ────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Scale factor — clamp so we never inflate above designed size
  const sc = Math.min(1, screenHeight / REF_HEIGHT);

  // Orb/ring sizes scaled to screen — stone base raised so it fills 50% split
  const orbAreaSize    = Math.round(290 * sc);
  const stoneSize      = Math.round(130 * sc);
  const ring1          = Math.round(286 * sc);
  const ring2          = Math.round(230 * sc);
  const ring3          = Math.round(178 * sc);
  const ring4          = Math.round(140 * sc);
  const pulseRingSize  = Math.round(130 * sc);
  const warmGlowSize   = Math.round(162 * sc);

  // Live clock + time-of-day
  const [clockLabel, setClockLabel] = useState('');
  const [timeOfDay, setTimeOfDay]   = useState<TimeOfDay>(getTimeOfDay());
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClockLabel(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      setTimeOfDay(getTimeOfDay(now));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Consent gate
  const [consentReady, setConsentReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    hasConsent()
      .then((granted) => {
        if (cancelled) return;
        if (!granted) router.replace({ pathname: '/consent', params: { next: '/' } });
        else setConsentReady(true);
      })
      .catch(() => { if (!cancelled) router.replace({ pathname: '/consent', params: { next: '/' } }); });
    return () => { cancelled = true; };
  }, [router]);

  // ── Animation values ──────────────────────────────────────────────────
  const r1Anim     = useRef(new Animated.Value(0)).current;
  const r2Anim     = useRef(new Animated.Value(0)).current;
  const r3Anim     = useRef(new Animated.Value(0)).current;
  const r4Anim     = useRef(new Animated.Value(0)).current;
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const breathAnim = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breath = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]));
    Animated.parallel([breath(r1Anim, 0), breath(r2Anim, 600), breath(r3Anim, 1200), breath(r4Anim, 1800)]).start();
  }, [r1Anim, r2Anim, r3Anim, r4Anim]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 2600, useNativeDriver: true }),
    ])).start();
  }, [floatAnim]);

  useEffect(() => {
    const loop = (anim: Animated.Value, dur: number, delay = 0) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: dur, useNativeDriver: true }),
      ]));
    Animated.parallel([loop(breathAnim, 2000), loop(glowAnim, 2000, 400)]).start();
  }, [breathAnim, glowAnim]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(700),
    ])).start();
  }, [pulseAnim]);

  // ── Derived animation values ──────────────────────────────────────────
  const floatY       = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8 * sc] });
  const breathScale  = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const glowOpacity  = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.30] });
  const pulseScale   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.80, 2.20] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.20, 0] });

  if (!consentReady) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={[T.forestGreen, T.midGreen, '#6B8F6A', T.cream]}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Full-screen gradient backdrop */}
      <LinearGradient
        colors={[T.forestGreen, T.midGreen, '#6B8F6A', T.cream]}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Top section (44% of screen height) ────────────────────────── */}
      <View style={[styles.topSection, {
        height: screenHeight * 0.50,
        paddingTop: insets.top + 10,
      }]}>

        {/* Wordmark row */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Stone</Text>
          <Text style={styles.clockLabel}>{clockLabel}</Text>
        </View>

        {/* ── Stone orb — fills remaining vertical space ─────────────── */}
        <View style={[styles.orbArea, { width: orbAreaSize, height: orbAreaSize }]}>

          {/* Sonar ripple */}
          <Animated.View style={[{
            position: 'absolute',
            width: pulseRingSize, height: pulseRingSize,
            borderRadius: pulseRingSize / 2,
            borderWidth: 1.5, borderColor: T.terracotta,
          }, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />

          {/* Concentric breath rings */}
          <BreathRing size={ring1} anim={r1Anim} borderWidth={1}   opacity={0.13} />
          <BreathRing size={ring2} anim={r2Anim} borderWidth={1.5} opacity={0.26} />
          <BreathRing size={ring3} anim={r3Anim} borderWidth={2}   opacity={0.42} />
          <BreathRing size={ring4} anim={r4Anim} borderWidth={2}   opacity={0.60} color="#C4845A" />

          {/* Warm amber glow */}
          <Animated.View style={{
            position: 'absolute',
            width: warmGlowSize, height: warmGlowSize,
            borderRadius: warmGlowSize / 2,
            backgroundColor: T.terracotta,
            opacity: glowOpacity,
          }} />

          {/* Floating + breathing stone */}
          <Animated.View style={[{
            width: stoneSize, height: stoneSize,
          }, { transform: [{ translateY: floatY }, { scale: breathScale }] }]}>
            <LinearGradient
              colors={['#EDE0C4', '#C4935A', '#2A2E18']}
              start={{ x: 0.18, y: 0.08 }}
              end={{ x: 0.90, y: 0.96 }}
              style={[styles.pebble, { width: stoneSize, height: stoneSize, borderRadius: stoneSize * 0.55 }]}
            />
            {/* Surface highlight */}
            <View style={[styles.pebbleHighlight, {
              top: stoneSize * 0.10,
              left: stoneSize * 0.14,
              width: stoneSize * 0.28,
              height: stoneSize * 0.15,
            }]} />
          </Animated.View>
        </View>

      </View>

      {/* ── Bottom cream card (fills remaining screen) ─────────────────── */}
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>

        <Text style={[styles.headline, { fontSize: Math.round(26 * sc) }]}>
          {getGreeting(timeOfDay)}
        </Text>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, {
            height: Math.round(54 * sc),
            opacity: pressed ? 0.85 : 1,
          }]}
          onPress={() => router.push('/check-in')}
          testID="btn-check-in"
        >
          <Text style={[styles.primaryBtnText, { fontSize: Math.round(15 * sc) }]}>
            {getCheckInButtonLabel(timeOfDay)}
          </Text>
        </Pressable>

        <View style={styles.secondaryRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, {
              height: Math.round(44 * sc),
              opacity: pressed ? 0.75 : 1,
            }]}
            onPress={() => router.push('/persona-setup')}
            testID="btn-wellness-profile"
          >
            <Text style={[styles.secondaryBtnText, { fontSize: Math.round(13 * sc) }]}>
              Wellness Profile
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, {
              height: Math.round(44 * sc),
              opacity: pressed ? 0.75 : 1,
            }]}
            onPress={() => router.push('/settings')}
            testID="btn-settings"
          >
            <Text style={[styles.secondaryBtnText, { fontSize: Math.round(13 * sc) }]}>
              Settings
            </Text>
          </Pressable>
        </View>

        <View style={styles.disclaimerArea}>
          <Text style={styles.disclaimerText}>Wellness companion, not medical care.</Text>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Get Help Now',
                'If this is a life-threatening emergency, call 911 immediately.',
                [
                  { text: 'Call 911 — Emergency',              style: 'destructive', onPress: () => Linking.openURL('tel:911') },
                  { text: 'Call 988 — Mental Health Crisis Line',                    onPress: () => Linking.openURL('tel:988') },
                  { text: 'Text HOME to 741741 — Crisis Text Line',                  onPress: () => Linking.openURL('sms:741741?body=HOME') },
                  { text: 'Cancel', style: 'cancel' },
                ],
              );
            }}
            testID="btn-get-help-now-home"
          >
            <Text style={styles.getHelpText}>Get help now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top section — fixed proportion of screen height
  topSection: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  wordmarkRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 22,
    color: '#F5EDD8',
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  clockLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#F5EDD8',
    opacity: 0.45,
  },

  // ── Orb container — sized dynamically
  orbArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stone shape
  pebble: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.40,
    shadowRadius: 22,
    elevation: 12,
  },
  pebbleHighlight: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ rotate: '-22deg' }],
  },

  // ── Bottom cream card
  card: {
    flex: 1,
    backgroundColor: T.cream,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 22,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  headline: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: '#1A3A2A',
    lineHeight: 34,
    letterSpacing: -0.2,
  },

  // ── CTA buttons
  primaryBtn: {
    backgroundColor: T.terracotta,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: T.cream,
    letterSpacing: 0.1,
  },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: T.sage,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Inter_500Medium',
    color: T.sage,
  },

  // ── Disclaimer
  disclaimerArea: { alignItems: 'center', gap: 4 },
  disclaimerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#6B7A5A',
    opacity: 0.6,
    textAlign: 'center',
  },
  getHelpText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: T.crisis,
    letterSpacing: 0.2,
  },
});
