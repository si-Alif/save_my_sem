import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { SemesterLockBanner } from '../components/SemesterLockBanner';
import { spacing } from '../theme';
import { getAttendanceSummary, listUserCourses, listUserSessions, markAttendance } from '../lib/api';
import { Session } from '../lib/api/types';
import { useAuth } from '../state/AuthProvider';

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

const pinGradients: [string, string][] = [
  ['#FFE6D9', '#FFF3EA'],
  ['#E1F2E8', '#F2F9F3'],
  ['#EAE9FA', '#F5F4FF'],
  ['#FCE8DC', '#FFF4E9'],
  ['#E3F4F6', '#F4FBFC'],
  ['#F6E3EC', '#FFF2F7'],
];

const attendanceActions: Array<{ key: 'present' | 'late' | 'excused' | 'absent'; label: string; color: string }> = [
  { key: 'present', label: 'Present', color: palette.success },
  { key: 'late', label: 'Late', color: palette.warning },
  { key: 'excused', label: 'Excused', color: palette.accent },
  { key: 'absent', label: 'Absent', color: palette.risk },
];

const microRituals = [
  'Before leaving: put your bag, bottle, and notebook near the door.',
  'Aim to arrive 5 minutes early. Early arrival lowers stress and boosts focus.',
  'After each class, give yourself one tiny reward to reinforce consistency.',
];

function formatYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatTime(raw: string) {
  const match = raw.match(/(\d{2}:\d{2})/);
  return match?.[1] ?? '--:--';
}

function timeSortKey(raw: string) {
  return formatTime(raw);
}

function minutesUntilTodayTime(timeRaw: string) {
  const now = new Date();
  const tm = formatTime(timeRaw).match(/(\d{2}):(\d{2})/);
  if (!tm) return 9999;
  const target = new Date(now);
  target.setHours(Number(tm[1]), Number(tm[2]), 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function timingMood(minutesUntil: number) {
  if (minutesUntil > 90) {
    return {
      label: 'Later today',
      color: palette.cool,
      prompt: 'Good window to prepare calmly. Set one clear intention before class.',
    };
  }
  if (minutesUntil > 10) {
    return {
      label: 'Up next',
      color: palette.warning,
      prompt: 'Transition mode. Pack up now and move toward class with no rush.',
    };
  }
  if (minutesUntil >= -20) {
    return {
      label: 'Live window',
      color: palette.success,
      prompt: 'This is your moment. Showing up now protects your long-term confidence.',
    };
  }
  return {
    label: 'Recover now',
    color: palette.risk,
    prompt: 'If you missed this slot, secure the next class and reset momentum immediately.',
  };
}

function getMotivationalLine(remainingToday: number, attendedToday: number, weekPct: number) {
  if (remainingToday === 0) {
    return 'No classes left today. Use this calm pocket to prep tomorrow and protect your streak.';
  }
  if (weekPct >= 85) {
    return 'You are in a strong rhythm. Keep it identity-based: \"I am someone who shows up.\"';
  }
  if (attendedToday > 0) {
    return 'You already started strong today. Keep stacking simple wins, one class at a time.';
  }
  return 'The first class you attend today can change your whole week trajectory. Start now.';
}

export default function TodayScreen() {
  const { userId, semesterKey } = useAuth();
  const queryClient = useQueryClient();

  const now = new Date();
  const todayYMD = formatYMD(now);
  const weekFrom = formatYMD(startOfWeek(now));
  const weekTo = formatYMD(endOfWeek(now));

  const todaySessionsKey = useMemo(
    () => ['sessions', userId, 'today', todayYMD] as const,
    [userId, todayYMD]
  );

  const todaySessionsQuery = useQuery({
    queryKey: todaySessionsKey,
    queryFn: () => listUserSessions(userId!, { on: todayYMD, page_size: 100 }),
    enabled: !!userId,
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', userId, semesterKey, 'today-meta'],
    queryFn: () => listUserCourses(userId!, semesterKey),
    enabled: !!userId,
  });

  const todaySummaryQuery = useQuery({
    queryKey: ['attendance-summary', userId, 'today', todayYMD],
    queryFn: () => getAttendanceSummary(userId!, { from: todayYMD, to: todayYMD }),
    enabled: !!userId,
  });

  const weeklySummaryQuery = useQuery({
    queryKey: ['attendance-summary', userId, 'week', weekFrom, weekTo],
    queryFn: () => getAttendanceSummary(userId!, { from: weekFrom, to: weekTo }),
    enabled: !!userId,
  });

  const markMutation = useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: number; status: 'present' | 'late' | 'excused' | 'absent' }) =>
      markAttendance({
        user_id: userId!,
        class_session_id: sessionId,
        status,
      }),
    onMutate: async ({ sessionId }) => {
      await queryClient.cancelQueries({ queryKey: todaySessionsKey });
      const prev = queryClient.getQueryData<{ sessions: Session[]; metadata?: unknown }>(todaySessionsKey);
      if (prev?.sessions) {
        queryClient.setQueryData(todaySessionsKey, {
          ...prev,
          sessions: prev.sessions.filter((s) => s.id !== sessionId),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(todaySessionsKey, ctx.prev);
    },
    onSettled: () => {
      todaySessionsQuery.refetch();
      todaySummaryQuery.refetch();
      weeklySummaryQuery.refetch();
    },
  });

  const todaySessions = useMemo(() => {
    const rows = [...(todaySessionsQuery.data?.sessions || [])];
    rows.sort((a, b) => timeSortKey(a.start_time).localeCompare(timeSortKey(b.start_time)));
    return rows;
  }, [todaySessionsQuery.data]);

  const courseMeta = useMemo(() => {
    const map = new Map<number, { code?: string; name?: string }>();
    (coursesQuery.data?.courses || []).forEach((c: any) => {
      const cid = c.course_id || c.id;
      if (cid) map.set(cid, { code: c.course_code || c.code, name: c.course_name || c.name });
    });
    return map;
  }, [coursesQuery.data]);

  const attendedToday = todaySummaryQuery.data?.attended_sessions ?? 0;
  const weekPct = weeklySummaryQuery.data?.attendance_percentage ?? 0;
  const remainingToday = todaySessions.length;
  const motivationalLine = getMotivationalLine(remainingToday, attendedToday, weekPct);

  const nextSession = useMemo(() => {
    if (todaySessions.length === 0) return null;
    const upcoming = todaySessions
      .map((s) => ({ session: s, mins: minutesUntilTodayTime(s.start_time) }))
      .filter((x) => x.mins >= -30)
      .sort((a, b) => a.mins - b.mins);
    return upcoming[0] || null;
  }, [todaySessions]);

  const isRefreshing =
    todaySessionsQuery.isRefetching ||
    coursesQuery.isRefetching ||
    todaySummaryQuery.isRefetching ||
    weeklySummaryQuery.isRefetching;

  const refetchAll = () => {
    todaySessionsQuery.refetch();
    coursesQuery.refetch();
    todaySummaryQuery.refetch();
    weeklySummaryQuery.refetch();
  };

  return (
    <Screen scroll={false} style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor={palette.accent} />}
      >
        <LinearGradient colors={['#EFD9D0', '#FFF1E5']} style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>TODAY RITUAL</Text>
          <Text weight="700" style={styles.heroTitle}>Show Up Mode</Text>
          <Text style={styles.heroBody}>{motivationalLine}</Text>

          <View style={styles.nextClassBox}>
            <Text weight="700" style={styles.nextClassTitle}>Focus Cue</Text>
            <Text style={styles.nextClassText}>
              {nextSession
                ? `Next: ${formatTime(nextSession.session.start_time)} ${courseMeta.get(nextSession.session.course_id)?.code || `Course #${nextSession.session.course_id}`} (${nextSession.mins > 0 ? `in ${nextSession.mins} min` : 'now'}).`
                : 'No upcoming session right now. Use this time to recover, prepare, and protect tomorrow.'}
            </Text>
          </View>
        </LinearGradient>

        <SemesterLockBanner
          semesterKey={semesterKey}
          hint="Today feed, actions, and motivation cards are scoped to your selected semester."
        />

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Remaining today</Text>
            <Text weight="700" style={styles.metricValue}>{remainingToday}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Done today</Text>
            <Text weight="700" style={styles.metricValue}>{attendedToday}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Week confidence</Text>
            <Text weight="700" style={styles.metricValue}>{weekPct.toFixed(0)}%</Text>
          </Card>
        </View>

        <Card style={styles.ritualCard}>
          <Text weight="700" style={styles.ritualTitle}>Momentum Ritual</Text>
          {microRituals.map((line) => (
            <Text key={line} style={styles.ritualLine}>{line}</Text>
          ))}
        </Card>

        <View style={styles.sectionHeader}>
          <Text weight="700" style={styles.sectionTitle}>Today Pinboard</Text>
          <Text style={styles.sectionHint}>Tap a status to lock in action</Text>
        </View>

        {todaySessionsQuery.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.infoText}>Loading today plan...</Text>
          </View>
        )}

        {todaySessionsQuery.isError && (
          <View style={styles.center}>
            <Text style={styles.infoText}>Could not load today's classes.</Text>
            <Text style={styles.retryText} onPress={refetchAll}>Tap to retry</Text>
          </View>
        )}

        {!todaySessionsQuery.isLoading && !todaySessionsQuery.isError && todaySessions.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text weight="700" style={styles.emptyTitle}>You are clear for today</Text>
            <Text style={styles.emptyBody}>
              No pending classes found. Keep the momentum by reviewing tomorrow's first class and preparing materials tonight.
            </Text>
          </Card>
        )}

        {!todaySessionsQuery.isLoading && !todaySessionsQuery.isError && todaySessions.length > 0 && (
          <View style={styles.pinboard}>
            {todaySessions.map((session, index) => {
              const mood = timingMood(minutesUntilTodayTime(session.start_time));
              const meta = courseMeta.get(session.course_id);
              const code = meta?.code || `Course #${session.course_id}`;
              const name = meta?.name || 'Course session';

              return (
                <LinearGradient
                  key={String(session.id)}
                  colors={pinGradients[index % pinGradients.length]}
                  style={[styles.pinCard, index % 3 === 0 && styles.pinCardTall]}
                >
                  <View style={styles.pinTopRow}>
                    <View style={[styles.moodBadge, { backgroundColor: `${mood.color}20` }]}>
                      <Text style={[styles.moodBadgeText, { color: mood.color }]}>{mood.label}</Text>
                    </View>
                    <Text style={styles.pinTime}>{formatTime(session.start_time)}</Text>
                  </View>

                  <Text weight="700" style={styles.pinCode}>{code}</Text>
                  <Text style={styles.pinName}>{name}</Text>
                  <Text style={styles.pinMeta}>
                    {formatTime(session.start_time)} - {formatTime(session.end_time)} | {session.location || 'TBD'}
                  </Text>
                  <Text style={styles.pinPrompt}>{mood.prompt}</Text>

                  <View style={styles.actionWrap}>
                    {attendanceActions.map((action) => (
                      <Pressable
                        key={action.key}
                        style={[styles.actionChip, { borderColor: `${action.color}6E`, backgroundColor: `${action.color}14` }]}
                        onPress={() => markMutation.mutate({ sessionId: session.id, status: action.key })}
                        disabled={markMutation.isPending}
                      >
                        <Text weight="700" style={[styles.actionChipText, { color: action.color }]}>{action.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </LinearGradient>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: palette.page,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
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
  nextClassBox: {
    marginTop: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(109,76,100,0.22)',
    backgroundColor: 'rgba(255,250,245,0.72)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  nextClassTitle: {
    color: palette.accent,
    fontSize: 13,
  },
  nextClassText: {
    color: '#4F433D',
    fontSize: 13,
    lineHeight: 19,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderColor: palette.border,
    gap: spacing.xs,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  metricLabel: {
    color: palette.body,
    fontSize: 11,
    textAlign: 'center',
  },
  metricValue: {
    color: palette.heading,
    fontSize: 22,
    lineHeight: 26,
  },
  ritualCard: {
    backgroundColor: '#FFF9F0',
    borderColor: palette.border,
    gap: spacing.sm,
  },
  ritualTitle: {
    color: palette.heading,
    fontSize: 17,
  },
  ritualLine: {
    color: '#5E544D',
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.heading,
    fontSize: 20,
  },
  sectionHint: {
    color: palette.body,
    fontSize: 12,
  },
  pinboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pinCard: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8D9CC',
    padding: spacing.md,
    gap: spacing.xs,
  },
  pinCardTall: {
    minHeight: 244,
  },
  pinTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  moodBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(70,59,52,0.15)',
  },
  moodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pinTime: {
    color: '#6E6058',
    fontSize: 12,
    fontWeight: '700',
  },
  pinCode: {
    color: '#3D332E',
    fontSize: 14,
  },
  pinName: {
    color: '#4D413B',
    fontSize: 13,
    lineHeight: 18,
    minHeight: 32,
  },
  pinMeta: {
    color: '#6F6158',
    fontSize: 11,
  },
  pinPrompt: {
    color: '#5E544D',
    fontSize: 12,
    lineHeight: 18,
  },
  actionWrap: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  actionChipText: {
    fontSize: 11,
  },
  emptyCard: {
    backgroundColor: '#FFF9F0',
    borderColor: palette.border,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: palette.heading,
    fontSize: 18,
  },
  emptyBody: {
    color: palette.body,
    fontSize: 14,
    lineHeight: 20,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
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
