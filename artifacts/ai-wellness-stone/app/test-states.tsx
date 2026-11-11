import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { AppButton } from '../src/components/AppButton';
import { AppScreen } from '../src/components/AppScreen';
import { AppText } from '../src/components/AppText';
import { SectionCard } from '../src/components/SectionCard';
import { StoneCommandPreview } from '../src/components/StoneCommandPreview';
import { STATE_COMMANDS, StoneCommand, StoneState } from '../src/types/stoneCommand';

const ALL_STATES = Object.keys(STATE_COMMANDS) as StoneState[];

function stateCommand(state: StoneState): StoneCommand {
  return { version: 1, state, ...STATE_COMMANDS[state] };
}

export default function TestStatesScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <AppScreen scroll title="Test all states">
      <AppText variant="subtitle">
        Frozen STATE_COMMANDS contract — v1. All 8 states. Use Copy JSON to
        share examples with Mani (matches SAI-16 BLE spec).
      </AppText>

      {ALL_STATES.map((state) => {
        const cmd = stateCommand(state);
        const isCrisis = state === 'CRISIS';

        return (
          <SectionCard key={state} title={state}>
            {isCrisis ? (
              <View style={[styles.crisisNote, { backgroundColor: '#FEF2F2', borderColor: colors.destructive }]}>
                <Text style={[styles.crisisText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
                  Safety mode — no soothing output sent to device
                </Text>
                <Text style={[styles.crisisSub, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
                  cmd: safety_mode · haptic: none · intensity: 0
                </Text>
              </View>
            ) : null}
            <StoneCommandPreview stoneCommand={cmd} />
          </SectionCard>
        );
      })}

      <View style={styles.actions}>
        <AppButton
          title="Back to Debug"
          onPress={() => router.back()}
          variant="secondary"
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  crisisNote: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    marginBottom: 4,
  },
  crisisText: { fontSize: 13 },
  crisisSub: { fontSize: 12, lineHeight: 17 },
  actions: { marginTop: 4 },
});
