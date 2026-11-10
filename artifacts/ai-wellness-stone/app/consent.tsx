import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { grantConsent } from '../src/services/consentService';

// SAI-11 — first-run (and re-prompted, if the policy version changes) gate.
// Both boxes must be checked to continue; never touches nightly_entries or
// persona_profiles.

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:          '#F5EDD8',
  green:       '#1A3A2A',
  sage:        '#4A7C59',
  terracotta:  '#C4714A',
  olive:       '#6B7A5A',
  oliveMuted:  'rgba(107,122,90,0.55)',
  border:      '#D6CAB0',
  cream:       '#FDFAF3',
} as const;

// ── Section (open, no card) ────────────────────────────────────────────────
function ConsentSection({ label, body }: { label: string; body: string }) {
  return (
    <View style={section.wrap}>
      <View style={section.labelRow}>
        <View style={section.dot} />
        <Text style={section.label}>{label}</Text>
      </View>
      <Text style={section.body}>{body}</Text>
    </View>
  );
}

const section = StyleSheet.create({
  wrap:     { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.terracotta },
  label:    {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.terracotta,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: C.olive,
  },
});

// ── Checkbox ───────────────────────────────────────────────────────────────
function ConsentCheckbox({
  checked,
  onToggle,
  label,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  testID?: string;
}) {
  return (
    <Pressable onPress={onToggle} style={chk.row} testID={testID}>
      <View
        style={[
          chk.box,
          checked
            ? { backgroundColor: C.terracotta, borderColor: C.terracotta }
            : { backgroundColor: 'transparent', borderColor: C.border },
        ]}
      >
        {checked && <Text style={chk.mark}>✓</Text>}
      </View>
      <Text style={chk.label}>{label}</Text>
    </Pressable>
  );
}

const chk = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  box:   {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  mark:  { color: C.cream, fontSize: 13, fontWeight: '700' },
  label: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: C.green,
  },
});

// ── Screen ─────────────────────────────────────────────────────────────────
export default function ConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const [wellnessDisclaimer, setWellnessDisclaimer] = useState(false);
  const [dataProcessing,     setDataProcessing]     = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [error,              setError]              = useState<string | null>(null);

  const canContinue = wellnessDisclaimer && dataProcessing;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    setError(null);
    try {
      await grantConsent();
      router.replace((next as never) ?? '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your choices. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header ──────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Stone glyph — small organic pebble */}
          <View style={styles.stoneGlyph} />

          <Text style={styles.headline}>Welcome{'\n'}to Stone</Text>

          <Text style={styles.heroSub}>
            A quiet space for nightly reflection.{'\n'}
            Your privacy and safety always come first.
          </Text>
        </View>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Open content sections ────────────────────────────────────── */}
        <View style={styles.sections}>
          <ConsentSection
            label="A companion, not care"
            body="Stone is here to help you reflect — not to diagnose, treat, or replace therapy or emergency care. If you're ever in crisis, we'll always show you real help first."
          />
          <ConsentSection
            label="Your data"
            body="Your check-ins and wellness profile are stored so Stone can personalise its responses to you. You can export or delete everything at any time from Settings."
          />
          <ConsentSection
            label="AI processing"
            body="Your mood, ratings, and note are sent to an AI provider (OpenAI) to craft your response. We never send your name or any identifying details. Crisis signals are caught before anything reaches AI."
          />
        </View>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Checkboxes ───────────────────────────────────────────────── */}
        <View style={styles.checkboxes}>
          <ConsentCheckbox
            checked={wellnessDisclaimer}
            onToggle={() => setWellnessDisclaimer((v) => !v)}
            label="I understand Stone is a wellness companion, not medical care or therapy."
            testID="chk-wellness-disclaimer"
          />
          <ConsentCheckbox
            checked={dataProcessing}
            onToggle={() => setDataProcessing((v) => !v)}
            label="I'm happy for my check-in data to be stored and used to personalise my experience."
            testID="chk-data-processing"
          />
        </View>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue || saving}
          testID="btn-consent-continue"
          style={({ pressed }) => [
            styles.cta,
            !canContinue && styles.ctaDisabled,
            pressed && canContinue && styles.ctaPressed,
          ]}
        >
          <Text style={[styles.ctaText, !canContinue && styles.ctaTextDisabled]}>
            {saving ? 'Saving…' : 'Begin with Stone'}
          </Text>
        </Pressable>

        <Text style={styles.footNote}>
          You can review these details any time in Privacy & Data.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1 },
  scroll: { paddingHorizontal: 28, gap: 28 },

  // ── Hero
  hero: { alignItems: 'center', gap: 16, paddingTop: 8 },
  stoneGlyph: {
    width: 52,
    height: 52,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 28,
    backgroundColor: C.sage,
    opacity: 0.35,
  },
  headline: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 38,
    lineHeight: 44,
    color: C.green,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 15,
    lineHeight: 23,
    color: C.olive,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // ── Divider
  divider: {
    height: 1,
    backgroundColor: C.border,
    opacity: 0.6,
    marginHorizontal: 16,
  },

  // ── Sections
  sections: { gap: 24 },

  // ── Checkboxes
  checkboxes: { gap: 16 },

  // ── Error
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#D03030',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── CTA
  cta: {
    height: 58,
    backgroundColor: C.terracotta,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed:  { opacity: 0.85 },
  ctaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: C.cream,
    letterSpacing: 0.1,
  },
  ctaTextDisabled: { color: C.oliveMuted },

  // ── Foot note
  footNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: C.oliveMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
