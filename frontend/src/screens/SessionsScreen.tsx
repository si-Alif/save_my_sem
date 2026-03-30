import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, Pressable } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing } from '../theme';
import { listUserSessions, markAttendance, listUserCourses, listUserAttendance } from '../lib/api';
import { useAuth } from '../state/AuthProvider';

const DEFAULT_FILTER_FROM = new Date().toISOString().slice(0, 10); // today, YYYY-MM-DD
const DEFAULT_SEMESTER = 'odd-2026';

const statusColors: Record<string, string> = {
  scheduled: colors.primary,
  completed: colors.success,
  cancelled: colors.danger,
  rescheduled: colors.warning,
};

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string) {
  if (!timeStr) return '—';
  // Handles both plain SQL time (09:40:00) and RFC3339-like values (0000-01-01T09:40:00Z).
  const m = timeStr.match(/(\d{2}:\d{2})/);
  return m?.[1] ?? '—';
}

export default function SessionsScreen() {
  const { userId } = useAuth();
  const [showUpcoming, setShowUpcoming] = useState(true);
  const queryClient = useQueryClient();

  const filters = useMemo(() => ({ from: showUpcoming ? DEFAULT_FILTER_FROM : undefined }), [showUpcoming]);

  const sessionsQuery = useQuery({
    queryKey: ['sessions', userId, filters],
    queryFn: () => listUserSessions(userId!, filters),
    enabled: !!userId,
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', userId, DEFAULT_SEMESTER, 'meta'],
    queryFn: () => listUserCourses(userId!, DEFAULT_SEMESTER),
    enabled: !!userId,
  });

  const attendanceQuery = useQuery({
    queryKey: ['attendance', userId, 'for-sessions'],
    queryFn: () => listUserAttendance(userId!, { page_size: 500 }),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: number; status: 'present' | 'absent' | 'late' | 'excused' }) =>
      markAttendance({ user_id: userId!, class_session_id: sessionId, status }),
    onMutate: async ({ sessionId }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['sessions', userId, filters] }),
        queryClient.cancelQueries({ queryKey: ['attendance', userId, 'for-sessions'] }),
      ]);
      const prev = {
        sessions: queryClient.getQueryData<any>(['sessions', userId, filters]),
        attendance: queryClient.getQueryData<any>(['attendance', userId, 'for-sessions']),
      };
      if (prev?.sessions) {
        queryClient.setQueryData(['sessions', userId, filters], {
          ...prev.sessions,
          sessions: (prev.sessions.sessions || []).filter((s: any) => s.id !== sessionId),
        });
      }
      // Also optimistically add to attendance set so filtering stays applied
      if (prev?.attendance) {
        const attList = prev.attendance.attendance || [];
        queryClient.setQueryData(['attendance', userId, 'for-sessions'], {
          ...prev.attendance,
          attendance: [...attList, { class_session_id: sessionId }],
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev?.sessions) queryClient.setQueryData(['sessions', userId, filters], ctx.prev.sessions);
      if (ctx?.prev?.attendance)
        queryClient.setQueryData(['attendance', userId, 'for-sessions'], ctx.prev.attendance);
    },
    onSettled: () => {
      sessionsQuery.refetch();
      attendanceQuery.refetch();
    },
  });

  const onMark = (sessionId: number, status: 'present' | 'absent' | 'late' | 'excused') => {
    if (!userId) return;
    mutation.mutate({ sessionId, status });
  };

  const sessions = sessionsQuery.data?.sessions ?? [];

  const courseMeta = useMemo(() => {
    const map = new Map<number, { code?: string; name?: string }>();
    coursesQuery.data?.courses?.forEach((c: any) => {
      const cid = c.course_id || c.id;
      if (cid) map.set(cid, { code: c.course_code || c.code, name: c.course_name || c.name });
    });
    return map;
  }, [coursesQuery.data]);

  const markedSet = useMemo(() => {
    const set = new Set<number>();
    attendanceQuery.data?.attendance?.forEach((a: any) => {
      if (a.class_session_id) set.add(a.class_session_id);
    });
    return set;
  }, [attendanceQuery.data]);

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
          data={sessions.filter((s) => !markedSet.has(s.id))}
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
            const meta = courseMeta.get(item.course_id) || {};
            const courseLabel = meta.code || `Course #${item.course_id}`;
            const nameLabel = meta.name || 'Untitled course';
            return (
              <Card style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text weight="700">{courseLabel}</Text>
                    <Text>{nameLabel}</Text>
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
