import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { spacing } from '../theme';
import { listUserAttendance, listUserCourses } from '../lib/api';
import { useAuth } from '../state/AuthProvider';

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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateOnly(iso: string) {
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '—';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(raw?: string) {
  if (!raw) return '—';
  const m = raw.match(/(\d{2}:\d{2})/);
  return m?.[1] ?? '—';
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

export default function HistoryScreen() {
  const { userId } = useAuth();
  const [selectedCourseID, setSelectedCourseID] = useState<number | null>(null);

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

  const data = query.data?.attendance ?? [];

  const courseMeta = useMemo(() => {
    const map = new Map<number, { code?: string; name?: string }>();
    (coursesQuery.data?.courses || []).forEach((c: any) => {
      const cid = c.course_id || c.id;
      if (cid) map.set(cid, { code: c.course_code || c.code, name: c.course_name || c.name });
    });
    return map;
  }, [coursesQuery.data]);

  const chips = useMemo(() => {
    return (coursesQuery.data?.courses || []).map((c: any) => ({
      id: c.course_id || c.id,
      code: c.course_code || c.code || `Course #${c.course_id || c.id}`,
    }));
  }, [coursesQuery.data]);

  const totals = useMemo(() => {
    const t = { present: 0, late: 0, excused: 0, absent: 0 };
    data.forEach((r: any) => {
      if (r.status === 'present') t.present += 1;
      else if (r.status === 'late') t.late += 1;
      else if (r.status === 'excused') t.excused += 1;
      else t.absent += 1;
    });
    return t;
  }, [data]);

  return (
    <Screen scroll={false} style={styles.page}>
      <View style={styles.shell}>
        <LinearGradient colors={['#EED9CB', '#F8EFE7']} style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>ATTENDANCE MEMORY</Text>
          <Text weight="700" style={styles.heroTitle}>History Journal</Text>
          <Text style={styles.heroBody}>
            Review every marked class with context so you can notice patterns and improve course by course.
          </Text>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Pressable
            style={[styles.courseChip, selectedCourseID === null && styles.courseChipActive]}
            onPress={() => setSelectedCourseID(null)}
          >
            <Text weight="700" style={[styles.courseChipText, selectedCourseID === null && styles.courseChipTextActive]}>All courses</Text>
          </Pressable>
          {chips.map((chip) => (
            <Pressable
              key={String(chip.id)}
              style={[styles.courseChip, selectedCourseID === chip.id && styles.courseChipActive]}
              onPress={() => setSelectedCourseID(chip.id)}
            >
              <Text weight="700" style={[styles.courseChipText, selectedCourseID === chip.id && styles.courseChipTextActive]}>{chip.code}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}><Text muted>Present</Text><Text weight="700" style={[styles.statValue, { color: palette.success }]}>{totals.present}</Text></Card>
          <Card style={styles.statCard}><Text muted>Late</Text><Text weight="700" style={[styles.statValue, { color: palette.warning }]}>{totals.late}</Text></Card>
          <Card style={styles.statCard}><Text muted>Absent</Text><Text weight="700" style={[styles.statValue, { color: palette.risk }]}>{totals.absent}</Text></Card>
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

        {!query.isLoading && !query.isError && (
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={palette.accent}
              />
            }
            renderItem={({ item, index }) => {
              const mood = moodFor(item.status);
              const meta = item.course_id ? courseMeta.get(item.course_id) : null;
              const code = meta?.code || (item.course_id ? `Course #${item.course_id}` : 'Course');
              const name = meta?.name || 'Session record';

              return (
                <Card style={styles.card}>
                  <LinearGradient
                    colors={index % 2 === 0 ? ['#FFF5EA', '#FFFDF7'] : ['#F7EFEA', '#FFF8F2']}
                    style={styles.cardInner}
                  >
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text weight="700" style={styles.courseCode}>{code}</Text>
                        <Text style={styles.courseName}>{name}</Text>
                        <Text style={styles.metaLine}>
                          {item.session_date ? formatDateOnly(item.session_date) : 'Session date unavailable'} • {formatTime(item.start_time)} - {formatTime(item.end_time)}
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
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.infoText}>No attendance records for this course yet.</Text>
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderColor: palette.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 22,
  },
  list: {
    paddingBottom: spacing.xxl,
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