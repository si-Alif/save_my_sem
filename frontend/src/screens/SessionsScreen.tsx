import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, Pressable } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing } from '../theme';
import { listUserSessions, markAttendance } from '../lib/api';
import { useAuth } from '../state/AuthProvider';

const DEFAULT_FILTER_FROM = new Date().toISOString().slice(0, 10); // today, YYYY-MM-DD

const statusColors: Record<string, string> = {
  scheduled: colors.primary,
  completed: colors.success,
  cancelled: colors.danger,
  rescheduled: colors.warning,
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string) {
  if (!timeStr) return '';
  return timeStr.slice(0, 5); // HH:MM
}

export default function SessionsScreen() {
  const { userId } = useAuth();
  const [showUpcoming, setShowUpcoming] = useState(true);

  const filters = useMemo(() => ({ from: showUpcoming ? DEFAULT_FILTER_FROM : undefined }), [showUpcoming]);

  const sessionsQuery = useQuery({
    queryKey: ['sessions', userId, filters],
    queryFn: () => listUserSessions(userId!, filters),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: number; status: 'present' | 'absent' | 'late' | 'excused' }) =>
      markAttendance({ user_id: userId!, class_session_id: sessionId, status }),
    onSuccess: () => {
      sessionsQuery.refetch();
    },
  });

  const onMark = (sessionId: number, status: 'present' | 'absent' | 'late' | 'excused') => {
    if (!userId) return;
    mutation.mutate({ sessionId, status });
  };

  const sessions = sessionsQuery.data?.sessions ?? [];

  return (
    <Screen scroll={false} style={styles.safePad}>
      <View style={styles.headerRow}>
        <View style={{ gap: spacing.xs }}>
          <Text weight="700" style={styles.title}>Sessions</Text>
          <Text muted>{showUpcoming ? 'Upcoming from today' : 'All sessions'}</Text>
        </View>
        <Pressable
          style={[styles.chip, showUpcoming ? styles.chipActive : undefined]}
          onPress={() => setShowUpcoming((v) => !v)}
        >
          <Text style={showUpcoming ? styles.chipActiveText : styles.chipText}>
            {showUpcoming ? 'Showing upcoming' : 'Showing all'}
          </Text>
        </Pressable>
      </View>

      {sessionsQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text muted style={{ marginTop: spacing.sm }}>Loading sessions…</Text>
        </View>
      )}

      {sessionsQuery.isError && (
        <View style={styles.center}>
          <Text muted>Could not load sessions.</Text>
          <Text style={{ color: colors.primary, marginTop: spacing.xs }} onPress={() => sessionsQuery.refetch()}>
            Tap to retry
          </Text>
        </View>
      )}

      {!sessionsQuery.isLoading && !sessionsQuery.isError && (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={sessionsQuery.isRefetching}
              onRefresh={() => sessionsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const badgeColor = statusColors[item.status] || colors.textMuted;
            return (
              <Card style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text weight="700">Course #{item.course_id}</Text>
                    <Text muted>
                      {formatDate(item.session_date)} · {formatTime(item.start_time)} - {formatTime(item.end_time)}
                    </Text>
                    <Text muted>{item.location || 'TBD location'}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${badgeColor}1A` }]}>
                    <Text style={{ color: badgeColor, fontWeight: '600' }}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Button
                    label={mutation.isPending ? 'Marking…' : 'Present'}
                    variant="primary"
                    onPress={() => onMark(item.id, 'present')}
                    disabled={mutation.isPending}
                    style={styles.actionBtn}
                  />
                  <Button
                    label="Absent"
                    variant="secondary"
                    onPress={() => onMark(item.id, 'absent')}
                    disabled={mutation.isPending}
                    style={styles.actionBtn}
                    labelStyle={{ color: colors.danger, fontWeight: '600' }}
                  />
                </View>
                <View style={styles.actionRow}>
                  <Button
                    label="Late"
                    variant="secondary"
                    onPress={() => onMark(item.id, 'late')}
                    disabled={mutation.isPending}
                    style={styles.actionBtn}
                    labelStyle={{ color: colors.warning, fontWeight: '600' }}
                  />
                  <Button
                    label="Excused"
                    variant="secondary"
                    onPress={() => onMark(item.id, 'excused')}
                    disabled={mutation.isPending}
                    style={styles.actionBtn}
                    labelStyle={{ color: colors.primary, fontWeight: '600' }}
                  />
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text muted>No sessions found for the selected range.</Text>
            </View>
          }
        />
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
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
  },
  chipActiveText: {
    color: 'white',
  },
  list: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
});
