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

type HistoryMode = 'cards' | 'timeline';
type GroupBy = 'day' | 'course';
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
      return { color: palette.warning, label: 'Almost there. Tune your class-start routine.' };
    case 'excused':
      return { color: palette.cool, label: 'Excused day. Plan your next consistency streak.' };
    default:
      return { color: palette.risk, label: 'This one slipped. Protect the next class.' };
  }
}

function profileFor(consistency: number) {
  if (consistency >= 85) {
    return {
      title: 'Steady Climber',
      text: 'Strong rhythm. Keep protecting this behavior in your tougher courses.',
      color: palette.success,
    };
  }
  if (consistency >= 70) {
    return {
      title: 'Building Momentum',
      text: 'Recoverable zone. A few intentional weeks can shift your trajectory.',
      color: palette.warning,
    };
  }
  return {
    title: 'Needs Attention',
    text: 'History shows risk. Start with one simple win: attend the very next class.',
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
  const { userId, semesterKey } = useAuth();
  const [selectedCourseID, setSelectedCourseID] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [mode, setMode] = useState<HistoryMode>('cards');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [showFilters, setShowFilters] = useState(false);

  const coursesQuery = useQuery({
    queryKey: ['courses', userId, semesterKey, 'history'],
    queryFn: () => listUserCourses(userId!, semesterKey),
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
    if (groupBy === 'course') {
      const map = new Map<string, { title: string; data: AttendanceLog[] }>();
      rows.forEach((row) => {
        const key = row.course_id ? `course-${row.course_id}` : 'course-unknown';
        const meta = row.course_id ? courseMeta.get(row.course_id) : null;
        const title = meta
          ? `${meta.code || `Course #${row.course_id}`} • ${meta.name || 'Session records'}`
          : 'Unknown course';

        const existing = map.get(key);
        if (existing) existing.data.push(row);
        else map.set(key, { title, data: [row] });
      });

      return Array.from(map.entries())
        .map(([key, val]) => ({ key, title: val.title, data: [...val.data].sort(sortByMarkedAtDesc) }))
        .sort((a, b) => a.title.localeCompare(b.title));
    }

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
  }, [rows, groupBy, courseMeta]);

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
        <View style={styles.headerBar}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text weight="700" style={styles.title}>History Journal</Text>
            <Text style={styles.subtitle}>Patterns, decisions, and progress.</Text>
          </View>
          <View style={styles.miniStatsCol}>
            <View style={styles.miniStatPill}><Text style={styles.miniStatValue}>{consistencyPct}%</Text><Text style={styles.miniStatLabel}>consistency</Text></View>
            <View style={styles.miniStatPill}><Text style={styles.miniStatValue}>{activeStreak}</Text><Text style={styles.miniStatLabel}>streak</Text></View>
          </View>
        </View>

        <View style={styles.mindsetStrip}>
          <View style={[styles.mindsetDot, { backgroundColor: mindset.color }]} />
          <Text style={styles.mindsetStripText}><Text weight="700">{mindset.title}: </Text>{mindset.text}</Text>
        </View>

        <View style={styles.modeRow}>
          <Pressable style={[styles.modeBtn, mode === 'cards' && styles.modeBtnActive]} onPress={() => setMode('cards')}>
            <Text style={[styles.modeText, mode === 'cards' && styles.modeTextActive]}>Cards</Text>
          </Pressable>
          <Pressable style={[styles.modeBtn, mode === 'timeline' && styles.modeBtnActive]} onPress={() => setMode('timeline')}>
            <Text style={[styles.modeText, mode === 'timeline' && styles.modeTextActive]}>Timeline</Text>
          </Pressable>
          {mode === 'timeline' && (
            <View style={styles.groupRowInline}>
              <Pressable style={[styles.groupBtn, groupBy === 'day' && styles.groupBtnActive]} onPress={() => setGroupBy('day')}>
                <Text style={[styles.groupBtnText, groupBy === 'day' && styles.groupBtnTextActive]}>Day</Text>
              </Pressable>
              <Pressable style={[styles.groupBtn, groupBy === 'course' && styles.groupBtnActive]} onPress={() => setGroupBy('course')}>
                <Text style={[styles.groupBtnText, groupBy === 'course' && styles.groupBtnTextActive]}>Course</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.filterTopRow}>
          <Pressable style={styles.filterToggle} onPress={() => setShowFilters((v) => !v)}>
            <Text style={styles.filterToggleText}>{showFilters ? 'Hide Filters' : 'Show Filters'}</Text>
          </Pressable>
          <Text style={styles.filterSummary}>P {totals.present} • L {totals.late} • A {totals.absent}</Text>
        </View>

        {showFilters && (
          <>
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
          </>
        )}

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
            style={styles.feed}
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
            style={styles.feed}
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
    minHeight: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FDF6EE',
    padding: spacing.md,
  },
  title: {
    color: palette.heading,
    fontSize: 24,
  },
  subtitle: {
    color: palette.body,
    fontSize: 12,
  },
  miniStatsCol: {
    justifyContent: 'space-between',
    gap: 6,
  },
  miniStatPill: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  miniStatValue: {
    color: palette.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  miniStatLabel: {
    color: palette.body,
    fontSize: 10,
  },
  mindsetStrip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFF9F2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  mindsetDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  mindsetStripText: {
    color: '#5E544D',
    fontSize: 12,
    flex: 1,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  modeBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modeBtnActive: {
    backgroundColor: '#EED9CB',
    borderColor: '#C8AFA0',
  },
  modeText: {
    color: palette.body,
    fontWeight: '600',
    fontSize: 12,
  },
  modeTextActive: {
    color: '#5D4034',
  },
  groupRowInline: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 4,
  },
  groupBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFF7EF',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  groupBtnActive: {
    backgroundColor: '#EED9CB',
    borderColor: '#C8AFA0',
  },
  groupBtnText: {
    color: palette.body,
    fontWeight: '600',
    fontSize: 12,
  },
  groupBtnTextActive: {
    color: '#5D4034',
  },
  filterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterToggle: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFF8F0',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  filterToggleText: {
    color: palette.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  filterSummary: {
    color: palette.body,
    fontSize: 12,
  },
  chipsRow: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  courseChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  courseChipActive: {
    backgroundColor: '#F8E3D2',
    borderColor: '#D9B79F',
  },
  courseChipText: {
    color: palette.heading,
    fontSize: 12,
  },
  courseChipTextActive: {
    color: '#5D4034',
  },
  statusChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFF7EF',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  statusChipActive: {
    backgroundColor: '#EED9CB',
    borderColor: '#C8AFA0',
  },
  statusChipText: {
    color: palette.body,
    fontSize: 12,
  },
  statusChipTextActive: {
    color: '#5D4034',
  },
  feed: {
    flex: 1,
    minHeight: 0,
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
    fontSize: 15,
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
