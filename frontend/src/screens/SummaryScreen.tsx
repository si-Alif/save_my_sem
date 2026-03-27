import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme';
import { getAttendanceSummary } from '../lib/api';
import { useAuth } from '../state/AuthProvider';

export default function SummaryScreen() {
  const { userId } = useAuth();

  const query = useQuery({
    queryKey: ['attendance-summary', userId],
    queryFn: () => getAttendanceSummary(userId!),
    enabled: !!userId,
  });

  const summary = query.data?.summary;
  const percentage = query.data?.attendance_percentage ?? 0;
  const mark = query.data?.attendance_mark ?? 0;

  return (
    <Screen scroll={false} style={styles.safePad}>
      <View style={styles.headerRow}>
        <View>
          <Text weight="700" style={styles.title}>Summary</Text>
          <Text muted>Overall attendance performance</Text>
        </View>
      </View>

      {query.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text muted style={{ marginTop: spacing.sm }}>Loading summary…</Text>
        </View>
      )}

      {query.isError && (
        <View style={styles.center}>
          <Text muted>Could not load summary.</Text>
          <Text style={{ color: colors.primary, marginTop: spacing.xs }} onPress={() => query.refetch()}>
            Tap to retry
          </Text>
        </View>
      )}

      {!query.isLoading && !query.isError && summary && (
        <View style={{ gap: spacing.md }}>
          <Card style={{ gap: spacing.sm }}>
            <Text weight="700" style={{ fontSize: 18 }}>Totals</Text>
            <View style={styles.rowBetween}><Text muted>Present</Text><Text weight="700">{summary.present}</Text></View>
            <View style={styles.rowBetween}><Text muted>Late</Text><Text weight="700">{summary.late}</Text></View>
            <View style={styles.rowBetween}><Text muted>Excused</Text><Text weight="700">{summary.excused}</Text></View>
            <View style={styles.rowBetween}><Text muted>Absent</Text><Text weight="700" style={{ color: colors.danger }}>{summary.absent}</Text></View>
            <View style={styles.rowBetween}><Text muted>Total sessions</Text><Text weight="700">{summary.total_sessions}</Text></View>
          </Card>

          <Card style={styles.highlightCard}>
            <Text weight="700" style={{ fontSize: 18, color: colors.primary }}>Attendance %</Text>
            <Text weight="700" style={styles.bigNumber}>{percentage.toFixed(1)}%</Text>
            <Text muted>Mark: {mark}/10</Text>
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  safePad: {
    padding: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 26,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  highlightCard: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  bigNumber: {
    fontSize: 42,
    color: colors.primary,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
});
