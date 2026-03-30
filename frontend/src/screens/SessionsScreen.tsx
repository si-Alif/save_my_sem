import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { spacing } from '../theme';
import { listUserSessions, markAttendance, listUserCourses } from '../lib/api';
import { useAuth } from '../state/AuthProvider';

const DEFAULT_FILTER_FROM = new Date().toISOString().slice(0, 10); // today, YYYY-MM-DD
const DEFAULT_SEMESTER = 'odd-2026';

const palette = {
  page: '#F4EFE7',
  heading: '#2E2A27',
  body: '#5E544D',
  card: '#FFF9F2',
  border: '#E9DCCF',
  accent: '#6D4C64',
  success: '#4E8D75',
  warning: '#C77A4D',
  risk: '#B04A4A',
  cool: '#516B8E',
};

const statusColors: Record<string, string> = {
  scheduled: palette.cool,
  completed: palette.success,
  cancelled: palette.risk,
  rescheduled: palette.warning,
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

function titleCase(input: string) {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

export default function SessionsScreen() {
  const { userId } = useAuth();
  const route = useRoute<any>();
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [selectedCourseID, setSelectedCourseID] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const lastAppliedRouteCourseRef = useRef<number | null>(null);

  useEffect(() => {
    const incomingCourseID = route.params?.courseId;
    if (typeof incomingCourseID === 'number' && incomingCourseID !== lastAppliedRouteCourseRef.current) {
      setSelectedCourseID(incomingCourseID);
      lastAppliedRouteCourseRef.current = incomingCourseID;
    }
  }, [route.params?.courseId]);

  const sessionParams = useMemo(
    () => ({
      from: showUpcoming ? DEFAULT_FILTER_FROM : undefined,
      course_id: selectedCourseID || undefined,
      page_size: 100,
    }),
    [showUpcoming, selectedCourseID]
  );

  const sessionsKey = useMemo(
    () => ['sessions', userId, showUpcoming ? 'upcoming' : 'all', selectedCourseID ?? 'all'] as const,
    [userId, showUpcoming, selectedCourseID]
  );

  const sessionsQuery = useQuery({
    queryKey: sessionsKey,
    queryFn: () => listUserSessions(userId!, sessionParams),
    enabled: !!userId,
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', userId, DEFAULT_SEMESTER, 'meta'],
    queryFn: () => listUserCourses(userId!, DEFAULT_SEMESTER),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: number; status: 'present' | 'absent' | 'late' | 'excused' }) =>
      markAttendance({ user_id: userId!, class_session_id: sessionId, status }),
    onMutate: async ({ sessionId }) => {
      await queryClient.cancelQueries({ queryKey: sessionsKey });
      const prev = queryClient.getQueryData<any>(sessionsKey);
      if (prev?.sessions) {
        queryClient.setQueryData(sessionsKey, {
          ...prev,
          sessions: (prev.sessions || []).filter((s: any) => s.id !== sessionId),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(sessionsKey, ctx.prev);
    },
    onSettled: () => {
      sessionsQuery.refetch();
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

  const courseFilters = useMemo(() => {
    return (coursesQuery.data?.courses || []).map((c: any) => ({
      id: c.course_id || c.id,
      code: c.course_code || c.code || `Course #${c.course_id || c.id}`,
    }));
  }, [coursesQuery.data]);

  const activeCourse = useMemo(() => {
    if (!selectedCourseID) return null;
    return courseMeta.get(selectedCourseID) || null;
  }, [courseMeta, selectedCourseID]);

  const listEmptyMessage = selectedCourseID
    ? 'No upcoming sessions for this course right now.'
    : 'No sessions found for the selected range.';

  return (
    <Screen scroll={false} style={styles.page}>
      <View style={styles.shell}>
        <LinearGradient colors={['#EED9CB', '#F8EFE7']} style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>SESSION PLANNER</Text>
          <Text weight="700" style={styles.heroTitle}>Class Flow</Text>
          <Text style={styles.heroBody}>
            {activeCourse
              ? `${activeCourse.code || 'Selected course'} sessions in focus. Mark and clear them as you go.`
              : 'Track daily classes, then mark attendance to keep this board clean and stress-free.'}
          </Text>
        </LinearGradient>

        <View style={styles.topControls}>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, showUpcoming && styles.toggleBtnActive]}
              onPress={() => setShowUpcoming(true)}
            >
              <Text style={[styles.toggleText, showUpcoming && styles.toggleTextActive]}>Upcoming</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, !showUpcoming && styles.toggleBtnActive]}
              onPress={() => setShowUpcoming(false)}
            >
              <Text style={[styles.toggleText, !showUpcoming && styles.toggleTextActive]}>All range</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseChipsRow}>
            <Pressable
              style={[styles.courseChip, selectedCourseID === null && styles.courseChipActive]}
              onPress={() => setSelectedCourseID(null)}
            >
              <Text weight="700" style={[styles.courseChipText, selectedCourseID === null && styles.courseChipTextActive]}>
                All courses
              </Text>
            </Pressable>
            {courseFilters.map((course) => (
              <Pressable
                key={String(course.id)}
                style={[styles.courseChip, selectedCourseID === course.id && styles.courseChipActive]}
                onPress={() => setSelectedCourseID(course.id)}
              >
                <Text
                  weight="700"
                  style={[styles.courseChipText, selectedCourseID === course.id && styles.courseChipTextActive]}
                >
                  {course.code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {sessionsQuery.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.infoText}>Loading sessions...</Text>
          </View>
        )}

        {sessionsQuery.isError && (
          <View style={styles.center}>
            <Text style={styles.infoText}>Could not load sessions.</Text>
            <Text style={styles.retryText} onPress={() => sessionsQuery.refetch()}>
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
                tintColor={palette.accent}
              />
            }
            renderItem={({ item, index }) => {
              const badgeColor = statusColors[item.status] || palette.body;
              const meta = courseMeta.get(item.course_id) || {};
              const courseLabel = meta.code || `Course #${item.course_id}`;
              const nameLabel = meta.name || 'Untitled course';
              const busyCard = mutation.isPending && mutation.variables?.sessionId === item.id;
              const stripeColors: [string, string] =
                index % 2 === 0 ? ['#FFF5EA', '#FFFDF7'] : ['#F7EFEA', '#FFF8F2'];

              return (
                <Card style={styles.card}>
                  <LinearGradient colors={stripeColors} style={styles.cardInner}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text weight="700" style={styles.courseCode}>{courseLabel}</Text>
                        <Text style={styles.courseName}>{nameLabel}</Text>
                        <Text style={styles.metaLine}>
                          {formatDate(item.session_date)} • {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </Text>
                        <Text style={styles.metaLine}>{item.location || 'TBD location'}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: `${badgeColor}1F` }]}>
                        <Text style={{ color: badgeColor, fontWeight: '700', fontSize: 12 }}>{titleCase(item.status)}</Text>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <Button
                        label={busyCard ? 'Saving...' : 'Present'}
                        variant="primary"
                        onPress={() => onMark(item.id, 'present')}
                        disabled={mutation.isPending}
                        style={styles.actionBtn}
                      />
                      <Button
                        label="Late"
                        variant="secondary"
                        onPress={() => onMark(item.id, 'late')}
                        disabled={mutation.isPending}
                        style={styles.actionBtn}
                        labelStyle={{ color: palette.warning, fontWeight: '700' }}
                      />
                    </View>
                    <View style={styles.actionRow}>
                      <Button
                        label="Absent"
                        variant="secondary"
                        onPress={() => onMark(item.id, 'absent')}
                        disabled={mutation.isPending}
                        style={styles.actionBtn}
                        labelStyle={{ color: palette.risk, fontWeight: '700' }}
                      />
                      <Button
                        label="Excused"
                        variant="secondary"
                        onPress={() => onMark(item.id, 'excused')}
                        disabled={mutation.isPending}
                        style={styles.actionBtn}
                        labelStyle={{ color: palette.accent, fontWeight: '700' }}
                      />
                    </View>
                  </LinearGradient>
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.infoText}>{listEmptyMessage}</Text>
              </View>
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: palette.page,
  },
  shell: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: palette.accent,
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: palette.heading,
    fontSize: 32,
  },
  heroBody: {
    color: palette.body,
    fontSize: 14,
    lineHeight: 21,
  },
  topControls: {
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  toggleBtnActive: {
    borderColor: '#C8AFA0',
    backgroundColor: '#EED9CB',
  },
  toggleText: {
    color: palette.body,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#5D4034',
  },
  courseChipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  courseChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  courseChipActive: {
    backgroundColor: '#F8E3D2',
    borderColor: '#D9B79F',
  },
  courseChipText: {
    color: palette.heading,
    fontSize: 13,
  },
  courseChipTextActive: {
    color: '#5D4034',
  },
  list: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    padding: 0,
    overflow: 'hidden',
  },
  cardInner: {
    padding: spacing.md,
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  courseCode: {
    color: palette.heading,
    fontSize: 16,
  },
  courseName: {
    color: '#463B34',
    fontSize: 14,
    lineHeight: 20,
  },
  metaLine: {
    color: palette.body,
    fontSize: 13,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(70,59,52,0.08)',
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
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    color: palette.body,
    textAlign: 'center',
  },
  retryText: {
    color: palette.accent,
    fontWeight: '700',
  },
});
