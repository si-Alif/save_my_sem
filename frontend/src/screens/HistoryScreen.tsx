import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { spacing } from '../theme';
import { listUserAttendance, listUserCourses } from '../lib/api';
import { AttendanceLog } from '../lib/api/types';
import { useAuth } from '../state/AuthProvider';

const DEFAULT_SEMESTER = 'odd-2026';

type HistoryMode = 'cards' | 'timeline';
type StatusFilter = 'all' | 'present' | 'late' | 'excused' | 'absent';

const STATUS_OPTIONS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'present', label: 'Present' },
  { key: 'late', label: 'Late' },
  { key: 'excused', label: 'Excused' },
  { key: 'absent', label: 'Absent' },
];

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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(raw?: string) {
  if (!raw) return '—';
  const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '—';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(raw?: string) {
  if (!raw) return '—';
  const m = raw.match(/(\d{2}:\d{2})/);
  return m?.[1] ?? '—';
}

function extractDateKey(log: AttendanceLog) {
  const source = log.session_date || log.marked_at;
  const m = source.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 'unknown';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function formatSectionHeading(dateKey: string) {
  if (dateKey === 'unknown') return 'Unknown Day';
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return dateKey;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const yesterdayKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function moodFor(status: string) {
  switch (status) {
    case 'present':
      return { color: palette.success, label: 'You showed up. Keep this rhythm.' };
    case 'late':
      return { color: palette.warning, label: 'Almost there. Sharpen your class start routine.' };
    case 'excused':
      return { color: palette.cool, label: 'Excused day. Plan your next attendance streak.' };
    default:
      return { color: palette.risk, label: 'This one slipped. Protect the next class.' };
  }
}

function profileFor(consistency: number) {
  if (consistency >= 85) {
    return {
      title: 'Steady Climber',
      text: 'Your attendance behavior is strong. Keep protecting this consistency across your harder courses.',
      color: palette.success,
    };
  }
  if (consistency >= 70) {
    return {
      title: 'Building Momentum',
      text: 'You are in a recoverable zone. A few intentional weeks can lift your overall confidence quickly.',
      color: palette.warning,
    };
  }
  return {
    title: 'Needs Attention',
    text: 'History is showing risk. Start with one simple win: make the next class non-negotiable.',
    color: palette.risk,
  };
}

function statusMatches(filter: StatusFilter, status: string) {
  return filter === 'all' || filter === status;
}

function sortByMarkedAtDesc(a: AttendanceLog, b: AttendanceLog) {
  return new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime();
}

export default function HistoryScreen() {
  const { userId } = useAuth();
  const [selectedCourseID, setSelectedCourseID] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [mode, setMode] = useState<HistoryMode>('cards');

  const coursesQuery = useQuery({
    queryKey: ['courses', userId, DEFAULT_SEMESTER, 'history'],
    queryFn: () => listUserCourses(userId!, DEFAULT_SEMESTER),
    enabled: !!userId,
  });

  const query = useQuery({
    queryKey: ['attendance', userId, selectedCourseID ?? 'all', 'history'],
    queryFn: () => listUserAttendance(userId!, { page_size: 100, course_id: selectedCourseID ?? undefined }),
    enabled: !!userId,
  });

  const allRows = useMemo(() => {
    const rows = (query.data?.attendance ?? []) as AttendanceLog[];
    return [...rows].sort(sortByMarkedAtDesc);
  }, [query.data]);

  const rows = useMemo(
    () => allRows.filter((r) => statusMatches(selectedStatus, r.status)),
    [allRows, selectedStatus]
  );

  const courseMeta = useMemo(() => {
    const map = new Map<number, { code?: string; name?: string }>();
    (coursesQuery.data?.courses || []).forEach((c: any) => {
      const cid = c.course_id || c.id;
      if (cid) map.set(cid, { code: c.course_code || c.code, name: c.course_name || c.name });
    });
    return map;
  }, [coursesQuery.data]);

  const courseChips = useMemo(() => {
    return (coursesQuery.data?.courses || []).map((c: any) => ({
      id: c.course_id || c.id,
      code: c.course_code || c.code || `Course #${c.course_id || c.id}`,
    }));
  }, [coursesQuery.data]);

  const totals = useMemo(() => {
    const t = { present: 0, late: 0, excused: 0, absent: 0 };
    allRows.forEach((r) => {
      if (r.status === 'present') t.present += 1;
      else if (r.status === 'late') t.late += 1;
      else if (r.status === 'excused') t.excused += 1;
      else t.absent += 1;
    });
    return t;
  }, [allRows]);

  const consistencyPct = useMemo(() => {
    if (allRows.length === 0) return 0;
    const nonAbsent = allRows.filter((r) => r.status !== 'absent').length;
    return Math.round((nonAbsent / allRows.length) * 100);
  }, [allRows]);

  const activeStreak = useMemo(() => {
    let streak = 0;
    for (const row of allRows) {
      if (row.status === 'absent') break;
      streak += 1;
    }
    return streak;
  }, [allRows]);

  const mindset = profileFor(consistencyPct);

  const sections = useMemo(() => {
    const map = new Map<string, AttendanceLog[]>();
    rows.forEach((row) => {
      const key = extractDateKey(row);
      const bucket = map.get(key) || [];
      bucket.push(row);
      map.set(key, bucket);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ key, title: formatSectionHeading(key), data }));
  }, [rows]);

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No attendance records for this view yet.'
      : `No ${selectedStatus} records for this course selection.`;

  const renderHistoryCard = (item: AttendanceLog, index: number) => {
    const mood = moodFor(item.status);
    const meta = item.course_id ? courseMeta.get(item.course_id) : null;
    const code = meta?.code || (item.course_id ? `Course #${item.course_id}` : 'Course');
    const name = meta?.name || 'Session record';

    const stripeColors: [string, string] =
      index % 2 === 0 ? ['#FFF5EA', '#FFFDF7'] : ['#F7EFEA', '#FFF8F2'];

    return (
      <Card style={styles.card}>
        <LinearGradient colors={stripeColors} style={styles.cardInner}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text weight="700" style={styles.courseCode}>{code}</Text>
              <Text style={styles.courseName}>{name}</Text>
              <Text style={styles.metaLine}>
                {formatDateOnly(item.session_date)} • {formatTime(item.start_time)} - {formatTime(item.end_time)}
              </Text>
              <Text style={styles.metaLine}>{item.location || 'Location unavailable'}</Text>
              <Text style={styles.metaLine}>Marked: {formatDateTime(item.marked_at)}</Text>
              {item.note ? <Text style={styles.noteText}>Note: {item.note}</Text> : null}
            </View>
            <View style={[styles.badge, { backgroundColor: `${mood.color}1E` }]}>
              <Text style={{ color: mood.color, fontWeight: '700', fontSize: 12 }}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.moodRow}>
            <View style={[styles.moodDot, { backgroundColor: mood.color }]} />
            <Text style={styles.moodText}>{mood.label}</Text>
          </View>
        </LinearGradient>
      </Card>
    );
  };

  return (
    <Screen scroll={false} style={styles.page}>
      <View style={styles.shell}>
        <LinearGradient colors={['#EED9CB', '#F8EFE7']} style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>ATTENDANCE MEMORY</Text>
          <Text weight="700" style={styles.heroTitle}>History Journal</Text>
          <Text style={styles.heroBody}>
            History is your feedback mirror. Use it to reinforce the habits that protect your long-term grade.
          </Text>
          <View style={styles.mindsetCard}>
            <Text weight="700" style={[styles.mindsetTitle, { color: mindset.color }]}>{mindset.title}</Text>
            <Text style={styles.mindsetText}>{mindset.text}</Text>
          </View>
        </LinearGradient>

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}><Text muted>Consistency</Text><Text weight="700" style={[styles.metricValue, { color: palette.accent }]}>{consistencyPct}%</Text></Card>
          <Card style={styles.metricCard}><Text muted>Active Streak</Text><Text weight="700" style={[styles.metricValue, { color: palette.success }]}>{activeStreak}</Text></Card>
          <Card style={styles.metricCard}><Text muted>Absent</Text><Text weight="700" style={[styles.metricValue, { color: palette.risk }]}>{totals.absent}</Text></Card>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Pressable
            style={[styles.courseChip, selectedCourseID === null && styles.courseChipActive]}
            onPress={() => setSelectedCourseID(null)}
          >
            <Text weight="700" style={[styles.courseChipText, selectedCourseID === null && styles.courseChipTextActive]}>All courses</Text>
          </Pressable>
          {courseChips.map((chip) => (
            <Pressable
              key={String(chip.id)}
              style={[styles.courseChip, selectedCourseID === chip.id && styles.courseChipActive]}
              onPress={() => setSelectedCourseID(chip.id)}
            >
              <Text weight="700" style={[styles.courseChipText, selectedCourseID === chip.id && styles.courseChipTextActive]}>{chip.code}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {STATUS_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={[styles.statusChip, selectedStatus === option.key && styles.statusChipActive]}
              onPress={() => setSelectedStatus(option.key)}
            >
              <Text weight="700" style={[styles.statusChipText, selectedStatus === option.key && styles.statusChipTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.modeRow}>
          <Pressable style={[styles.modeBtn, mode === 'cards' && styles.modeBtnActive]} onPress={() => setMode('cards')}>
            <Text style={[styles.modeText, mode === 'cards' && styles.modeTextActive]}>Cards View</Text>
          </Pressable>
          <Pressable style={[styles.modeBtn, mode === 'timeline' && styles.modeBtnActive]} onPress={() => setMode('timeline')}>
            <Text style={[styles.modeText, mode === 'timeline' && styles.modeTextActive]}>Grouped Timeline</Text>
          </Pressable>
        </View>

        {query.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.infoText}>Loading history...</Text>
          </View>
        )}

        {query.isError && (
          <View style={styles.center}>
            <Text style={styles.infoText}>Could not load attendance history.</Text>
            <Text style={styles.retryText} onPress={() => query.refetch()}>
              Tap to retry
            </Text>
          </View>
        )}

        {!query.isLoading && !query.isError && mode === 'cards' && (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={palette.accent}
              />
            }
            renderItem={({ item, index }) => renderHistoryCard(item, index)}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.infoText}>{emptyMessage}</Text>
              </View>
            }
          />
        )}

        {!query.isLoading && !query.isError && mode === 'timeline' && (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={palette.accent}
              />
            }
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text weight="700" style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length} records</Text>
              </View>
            )}
            renderItem={({ item, index }) => renderHistoryCard(item, index)}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.infoText}>{emptyMessage}</Text>
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
  mindsetCard: {
    marginTop: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(109,76,100,0.22)',
    backgroundColor: 'rgba(255,250,245,0.72)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  mindsetTitle: {
    fontSize: 14,
  },
  mindsetText: {
    color: '#5E544D',
    fontSize: 13,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderColor: palette.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    fontSize: 22,
  },
  chipsRow: {
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
  statusChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFF7EF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusChipActive: {
    backgroundColor: '#EED9CB',
    borderColor: '#C8AFA0',
  },
  statusChipText: {
    color: palette.body,
    fontSize: 13,
  },
  statusChipTextActive: {
    color: '#5D4034',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#EED9CB',
    borderColor: '#C8AFA0',
  },
  modeText: {
    color: palette.body,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#5D4034',
  },
  list: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    color: palette.heading,
    fontSize: 16,
  },
  sectionCount: {
    color: palette.body,
    fontSize: 12,
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    padding: 0,
    overflow: 'hidden',
  },
  cardInner: {
    padding: spacing.md,
    gap: spacing.sm,
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
  noteText: {
    color: '#51463F',
    fontSize: 13,
    fontStyle: 'italic',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(70,59,52,0.08)',
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  moodText: {
    color: '#5E544D',
    fontSize: 12,
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
