// TrendsScreen — SAI-20
// 7-day wellness sensor trends from device_telemetry_readings (user-scoped).
// Reads live Supabase data; no new table, no new backend.
// Wellness-only language — no medical language, no normal/high/low.

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { AppButton } from '../components/AppButton';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { supabase } from '../services/supabaseClient';
import { MeasurementType } from '../types/stoneTelemetry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DaySummary {
  date: string;       // YYYY-MM-DD
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface MetricTrend {
  type: MeasurementType;
  label: string;
  unit: string;
  days: DaySummary[];
}

const TREND_METRICS: Array<{ type: MeasurementType; label: string; unit: string }> = [
  { type: 'hr_bpm',        label: 'Heart rate estimate',   unit: 'bpm' },
  { type: 'spo2_percent',  label: 'SpO₂ estimate',         unit: '%'   },
  { type: 'touch_force',   label: 'Touch / squeeze',       unit: ''    },
  { type: 'skin_temp_c',   label: 'Skin temp estimate',    unit: '°C'  },
  { type: 'eda_microsiemens', label: 'Stress signal estimate', unit: 'μS' },
];

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
interface RawRow {
  measurement_type: string;
  value_numeric: number | null;
  captured_at: string;
}

function groupByDay(rows: RawRow[], type: MeasurementType): DaySummary[] {
  const byDay: Record<string, number[]> = {};
  for (const r of rows) {
    if (r.measurement_type !== type || r.value_numeric === null) continue;
    const day = r.captured_at.slice(0, 10);
    (byDay[day] ??= []).push(r.value_numeric);
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      avg: vals.reduce((s, v) => s + v, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      count: vals.length,
    }));
}

async function fetchTrends(): Promise<MetricTrend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('device_telemetry_readings')
    .select('measurement_type, value_numeric, captured_at')
    .eq('user_id', user.id)
    .gte('captured_at', since)
    .order('captured_at', { ascending: true });

  if (error || !data) return [];

  return TREND_METRICS
    .map((m) => ({
      ...m,
      days: groupByDay(data as RawRow[], m.type),
    }))
    .filter((m) => m.days.length > 0);
}

// ---------------------------------------------------------------------------
// Sparkline — simple bar chart, relative heights
// ---------------------------------------------------------------------------
function Sparkline({ days, color, bgColor }: { days: DaySummary[]; color: string; bgColor: string }) {
  if (days.length === 0) return null;
  const maxAvg = Math.max(...days.map((d) => d.avg));
  const minAvg = Math.min(...days.map((d) => d.avg));
  const range = maxAvg - minAvg || 1;

  return (
    <View style={spark.row}>
      {days.slice(-7).map((d) => {
        const height = Math.round(4 + ((d.avg - minAvg) / range) * 36);
        const label = d.date.slice(5); // MM-DD
        return (
          <View key={d.date} style={spark.col}>
            <View style={[spark.bar, { height, backgroundColor: color, borderRadius: 3 }]} />
            <Text style={[spark.label, { color: bgColor }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const spark = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 50 },
  col: { flex: 1, alignItems: 'center', gap: 2 },
  bar: { width: '100%', minHeight: 4 },
  label: { fontSize: 8 },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function TrendsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [trends, setTrends] = useState<MetricTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTrends();
      setTrends(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppScreen scroll title="7-Day Trends">
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Sensor estimate history from your Stone sessions. Wellness reference only —
        not a medical record.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={[styles.errorBox, { borderColor: colors.destructive }]}>
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
            Could not load trends: {error}
          </Text>
        </View>
      ) : trends.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            No session data yet. Start a Live Session to begin collecting estimates.
          </Text>
        </View>
      ) : (
        trends.map((metric) => {
          const last = metric.days[metric.days.length - 1];
          return (
            <SectionCard key={metric.type} title={metric.label}>
              <Sparkline days={metric.days} color={colors.primary} bgColor={colors.mutedForeground} />
              <View style={styles.summaryRow}>
                <SummaryPill label="Latest avg" value={`${last.avg.toFixed(1)} ${metric.unit}`} colors={colors} />
                <SummaryPill label="7-day min" value={`${Math.min(...metric.days.map((d) => d.min)).toFixed(1)}`} colors={colors} />
                <SummaryPill label="7-day max" value={`${Math.max(...metric.days.map((d) => d.max)).toFixed(1)}`} colors={colors} />
              </View>
            </SectionCard>
          );
        })
      )}

      <Text style={[styles.disclaimer, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        All values are experimental wellness estimates. Not a medical device. No
        diagnosis, treatment, or health guidance is provided.
      </Text>

      <View style={styles.actions}>
        <AppButton title="Refresh" onPress={load} variant="secondary" />
        <AppButton title="Back Home" onPress={() => router.replace('/')} variant="secondary" />
      </View>
    </AppScreen>
  );
}

interface PillProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}

function SummaryPill({ label, value, colors }: PillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: colors.muted }]}>
      <Text style={[styles.pillLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
      <Text style={[styles.pillValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, lineHeight: 20 },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 14 },
  errorText: { fontSize: 13, lineHeight: 19 },
  emptyBox: { borderRadius: 10, borderWidth: 1, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  pillLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  pillValue: { fontSize: 14 },
  disclaimer: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },
  actions: { gap: 10 },
});
