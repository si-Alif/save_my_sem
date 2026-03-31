import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueries, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { SemesterLockBanner } from '../components/SemesterLockBanner';
import { spacing } from '../theme';
import { getAttendanceSummary, listUserCourses, listUserSessions } from '../lib/api';
import { Course } from '../lib/api/types';
import { useAuth } from '../state/AuthProvider';

const palette = {
  page: '#F4EFE7',
  heading: '#2E2A27',
  body: '#5E544D',
  card: '#FFF9F2',
  border: '#E9DCCF',
  success: '#4E8D75',
  warning: '#C77A4D',
  risk: '#B04A4A',
  accent: '#6D4C64',
};

const boardGradients: [string, string][] = [
  ['#FFE0D6', '#FFF0E6'],
  ['#E0F0E8', '#F2F8EE'],
  ['#E4E6FA', '#F3F2FF'],
  ['#FCE8DC', '#FFF4E9'],
  ['#E3F4F6', '#F4FBFC'],
  ['#F7E1EC', '#FFF1F7'],
];

type CalendarCell = {
  key: string;
  day: number;
  allCount: number;
  selectedCount: number;
  isToday: boolean;
};

type CalendarMemo = {
  cells: Array<CalendarCell | null>;
  heaviest: { key: string; count: number } | null;
};

function courseID(course: Course) {
  return course.course_id ?? course.id;
}

function courseCode(course?: Course) {
  if (!course) return 'COURSE';
  return course.course_code || course.code || `Course #${courseID(course)}`;
}

function courseName(course?: Course) {
  if (!course) return 'Selected course';
  return course.course_name || course.name || 'Untitled course';
}

function profileFor(percentage: number) {
  if (percentage >= 85) {
    return {
      title: 'Strong Zone',
      subtitle: 'You are consistent in this course. Keep this rhythm and protect your lead.',
      tone: palette.success,
      gradient: ['#4E8D75', '#7FB7A0'] as [string, string],
    };
  }
  if (percentage >= 70) {
    return {
      title: 'Stable Zone',
      subtitle: 'You are in a decent spot. A little more consistency will push this course into strong range.',
      tone: palette.warning,
      gradient: ['#C77A4D', '#DFA178'] as [string, string],
    };
  }
  return {
    title: 'Risk Zone',
    subtitle: 'This course needs attention now. Prioritize upcoming classes to avoid long-term pressure.',
    tone: palette.risk,
    gradient: ['#B04A4A', '#D07777'] as [string, string],
  };
}

function formatYMD(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function extractYMD(raw: string) {
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekWindows(count: number) {
  const today = new Date();
  const base = startOfWeek(today);
  const windows: Array<{ label: string; from: string; to: string }> = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(base);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    windows.push({
      label: `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}`,
      from: formatYMD(start),
      to: formatYMD(end),
    });
  }
  return windows;
}

function monthName(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function SummaryScreen() {
  const { userId, semesterKey } = useAuth();
  const navigation = useNavigation<any>();
  const [selectedCourseID, setSelectedCourseID] = useState<number | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['courses', userId, semesterKey, 'summary'],
    queryFn: () => listUserCourses(userId!, semesterKey),
    enabled: !!userId,
  });

  const courses = coursesQuery.data?.courses ?? [];

  useEffect(() => {
    if (!selectedCourseID && courses.length > 0) {
      const firstID = courseID(courses[0]);
      if (firstID) setSelectedCourseID(firstID);
    }
  }, [courses, selectedCourseID]);

  const summaryQueries = useQueries({
    queries: courses.map((course) => {
      const cID = courseID(course) ?? 0;
      return {
        queryKey: ['attendance-summary', userId, cID],
        queryFn: () => getAttendanceSummary(userId!, { course_id: cID }),
        enabled: !!userId && !!cID,
      };
    }),
  });

  const summaryByCourse = useMemo(() => {
    const map = new Map<number, any>();
    courses.forEach((course, idx) => {
      const cID = courseID(course);
      const data = summaryQueries[idx]?.data;
      if (cID && data) map.set(cID, data);
    });
    return map;
  }, [courses, summaryQueries]);

  const selectedCourse = useMemo(
    () => courses.find((course) => courseID(course) === selectedCourseID),
    [courses, selectedCourseID]
  );

  const selectedSummary = selectedCourseID ? summaryByCourse.get(selectedCourseID) : null;
  const selectedStats = selectedSummary?.summary;
  const selectedPercentage = selectedSummary?.attendance_percentage ?? 0;
  const selectedMark = selectedSummary?.attendance_mark ?? 0;
  const selectedProfile = profileFor(selectedPercentage);

  const selectedQueryIndex = courses.findIndex((course) => courseID(course) === selectedCourseID);
  const selectedQueryState = selectedQueryIndex >= 0 ? summaryQueries[selectedQueryIndex] : undefined;

  const trendWindows = useMemo(() => getWeekWindows(4), []);

  const trendQueries = useQueries({
    queries: trendWindows.map((w) => ({
      queryKey: ['attendance-trend', userId, selectedCourseID, w.from, w.to],
      queryFn: () => getAttendanceSummary(userId!, { course_id: selectedCourseID || undefined, from: w.from, to: w.to }),
      enabled: !!userId && !!selectedCourseID,
    })),
  });

  const now = new Date();
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const monthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [now]);
  const todayYMD = formatYMD(now);

  const monthSessionsQuery = useQuery({
    queryKey: ['calendar-sessions', userId, formatYMD(monthStart), formatYMD(monthEnd)],
    queryFn: () =>
      listUserSessions(userId!, {
        from: todayYMD,
        to: formatYMD(monthEnd),
        page: 1,
        page_size: 100,
      }),
    enabled: !!userId,
  });

  const rankedCourses = useMemo(() => {
    return courses
      .map((course) => {
        const cID = courseID(course) ?? 0;
        const data = cID ? summaryByCourse.get(cID) : null;
        return {
          course,
          courseID: cID,
          percentage: data?.attendance_percentage ?? 0,
          mark: data?.attendance_mark ?? 0,
          totalSessions: data?.summary?.total_sessions ?? 0,
        };
      })
      .filter((entry) => entry.courseID > 0)
      .sort((a, b) => b.percentage - a.percentage);
  }, [courses, summaryByCourse]);

  const trendRows = useMemo(() => {
    return trendWindows.map((window, idx) => {
      const data: any = trendQueries[idx]?.data;
      return {
        label: window.label,
        percentage: data?.attendance_percentage ?? 0,
        sessions: data?.summary?.total_sessions ?? 0,
      };
    });
  }, [trendWindows, trendQueries]);

  const calendarData = useMemo<CalendarMemo>(() => {
    const allCounts = new Map<string, number>();
    const selectedCounts = new Map<string, number>();
    (monthSessionsQuery.data?.sessions || []).forEach((session: any) => {
      const key = extractYMD(session.session_date);
      if (!key) return;
      allCounts.set(key, (allCounts.get(key) || 0) + 1);
      if (selectedCourseID && session.course_id === selectedCourseID) {
        selectedCounts.set(key, (selectedCounts.get(key) || 0) + 1);
      }
    });

    const cells: Array<CalendarCell | null> = [];
    const offset = (monthStart.getDay() + 6) % 7; // Monday-first
    for (let i = 0; i < offset; i += 1) cells.push(null);

    const daysInMonth = monthEnd.getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const key = formatYMD(d);
      cells.push({
        key,
        day,
        allCount: allCounts.get(key) || 0,
        selectedCount: selectedCounts.get(key) || 0,
        isToday: key === todayYMD,
      });
    }

    let heaviest: { key: string; count: number } | null = null;
    allCounts.forEach((count, key) => {
      if (!heaviest || count > heaviest.count) heaviest = { key, count };
    });

    return { cells, heaviest };
  }, [monthSessionsQuery.data, selectedCourseID, monthStart, monthEnd, todayYMD]);

  return (
    <Screen style={styles.container}>
      <LinearGradient colors={['#EED9CB', '#F8EFE7']} style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>COURSE AWARENESS</Text>
        <Text weight="700" style={styles.heroTitle}>RescueMySemsester</Text>
        <Text style={styles.heroText}>
          Pick one course at a time and track where you are strong versus where you need more attention.
        </Text>
      </LinearGradient>

      <SemesterLockBanner
        semesterKey={semesterKey}
        hint="Summary trends and calendar are scoped to this semester selection."
      />

      {coursesQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
          <Text style={{ color: palette.body }}>Loading your courses...</Text>
        </View>
      )}

      {coursesQuery.isError && (
        <View style={styles.center}>
          <Text style={{ color: palette.body }}>Could not load courses for summary.</Text>
          <Text style={{ color: palette.accent }} onPress={() => coursesQuery.refetch()}>
            Tap to retry
          </Text>
        </View>
      )}

      {!coursesQuery.isLoading && !coursesQuery.isError && courses.length === 0 && (
        <Card style={styles.emptyCard}>
          <Text weight="700" style={{ color: palette.heading }}>No enrolled courses yet</Text>
          <Text style={{ color: palette.body }}>Enroll first to unlock course-wise attendance insights.</Text>
        </Card>
      )}

      {!coursesQuery.isLoading && !coursesQuery.isError && courses.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {courses.map((course) => {
              const cID = courseID(course);
              const active = cID === selectedCourseID;
              return (
                <Pressable
                  key={String(cID)}
                  onPress={() => cID && setSelectedCourseID(cID)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text weight="700" style={[styles.chipCode, active && styles.chipCodeActive]}>
                    {courseCode(course)}
                  </Text>
                  <Text style={[styles.chipMeta, active && styles.chipMetaActive]}>
                    Section {course.section || 'A'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedQueryState?.isLoading && (
            <View style={styles.center}>
              <ActivityIndicator color={palette.accent} />
              <Text style={{ color: palette.body }}>Loading course summary...</Text>
            </View>
          )}

          {selectedQueryState?.isError && (
            <View style={styles.center}>
              <Text style={{ color: palette.body }}>Could not load this course summary.</Text>
              <Text style={{ color: palette.accent }} onPress={() => selectedQueryState.refetch()}>
                Tap to retry
              </Text>
            </View>
          )}

          {!selectedQueryState?.isLoading && !selectedQueryState?.isError && selectedStats && (
            <>
              <LinearGradient colors={selectedProfile.gradient} style={styles.focusCard}>
                <Text style={styles.focusCode}>{courseCode(selectedCourse)}</Text>
                <Text style={styles.focusName}>{courseName(selectedCourse)}</Text>
                <View style={styles.focusRow}>
                  <View>
                    <Text weight="700" style={styles.focusPercentage}>{selectedPercentage.toFixed(1)}%</Text>
                    <Text style={styles.focusMeta}>attendance</Text>
                  </View>
                  <View style={styles.markBadge}>
                    <Text weight="700" style={styles.markText}>Mark {selectedMark}/10</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.focusActionBtn}
                  onPress={() => {
                    if (!selectedCourseID) return;
                    navigation.navigate('Sessions', { courseId: selectedCourseID });
                  }}
                >
                  <Text weight="700" style={styles.focusActionText}>Open In Sessions</Text>
                </Pressable>
              </LinearGradient>

              <View style={styles.tileWrap}>
                <Card style={styles.tile}><Text muted>Present</Text><Text weight="700" style={styles.tileValue}>{selectedStats.present}</Text></Card>
                <Card style={styles.tile}><Text muted>Late</Text><Text weight="700" style={styles.tileValue}>{selectedStats.late}</Text></Card>
                <Card style={styles.tile}><Text muted>Excused</Text><Text weight="700" style={styles.tileValue}>{selectedStats.excused}</Text></Card>
                <Card style={styles.tile}><Text muted>Absent</Text><Text weight="700" style={[styles.tileValue, { color: palette.risk }]}>{selectedStats.absent}</Text></Card>
              </View>

              <Card style={styles.insightCard}>
                <Text weight="700" style={{ color: selectedProfile.tone, fontSize: 18 }}>{selectedProfile.title}</Text>
                <Text style={styles.insightText}>{selectedProfile.subtitle}</Text>
                <Text style={styles.insightSubtext}>Total sessions counted: {selectedStats.total_sessions}</Text>
              </Card>

              <Card style={styles.trendCard}>
                <View style={styles.sectionHeaderNoMargin}>
                  <Text weight="700" style={styles.sectionTitle}>4-Week Momentum</Text>
                  <Text style={styles.sectionHint}>course-wise trend</Text>
                </View>
                <View style={styles.trendRow}>
                  {trendRows.map((row) => (
                    <View key={row.label} style={styles.trendCol}>
                      <View style={styles.trendTrack}>
                        <View style={[styles.trendFill, { height: `${Math.max(4, Math.min(100, row.percentage))}%` }]} />
                      </View>
                      <Text weight="700" style={styles.trendPct}>{row.percentage.toFixed(0)}%</Text>
                      <Text style={styles.trendLbl}>{row.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.insightSubtext}>Percentages are computed by weekly session windows.</Text>
              </Card>
            </>
          )}

          <Card style={styles.calendarCard}>
            <View style={styles.sectionHeaderNoMargin}>
              <Text weight="700" style={styles.sectionTitle}>Important Days Calendar</Text>
              <Text style={styles.sectionHint}>{monthName(monthStart)}</Text>
            </View>
            <Text style={styles.calendarLead}>
              This month view uses upcoming sessions to show potential heavy days now, and can later include tasks/exams without redesign.
            </Text>

            {monthSessionsQuery.isLoading && (
              <View style={styles.centerCompact}>
                <ActivityIndicator color={palette.accent} />
              </View>
            )}

            {monthSessionsQuery.isError && (
              <View style={styles.centerCompact}>
                <Text style={{ color: palette.body }}>Could not load calendar data.</Text>
              </View>
            )}

            {!monthSessionsQuery.isLoading && !monthSessionsQuery.isError && (
              <>
                <View style={styles.weekHeaderRow}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
                    <Text key={d} style={styles.weekHeaderText}>{d}</Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarData.cells.map((cell, idx) => {
                    if (!cell) return <View key={`blank-${idx}`} style={styles.dayCellBlank} />;
                    const intensity = cell.allCount;
                    const bg = intensity >= 3 ? '#F0B7A8' : intensity === 2 ? '#F4D7AB' : intensity === 1 ? '#D5E5C8' : '#F9F2E8';
                    const bd = cell.isToday ? palette.accent : '#EADBCD';
                    return (
                      <View key={cell.key} style={[styles.dayCell, { backgroundColor: bg, borderColor: bd }]}>
                        <Text weight="700" style={styles.dayNum}>{cell.day}</Text>
                        {cell.allCount > 0 ? <Text style={styles.dayLoad}>{cell.allCount} cls</Text> : <Text style={styles.dayLoad}> </Text>}
                        {cell.selectedCount > 0 ? <View style={styles.selectedDot} /> : <View style={styles.selectedDotGhost} />}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#D5E5C8' }]} /><Text style={styles.legendText}>light day</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#F4D7AB' }]} /><Text style={styles.legendText}>busy day</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#F0B7A8' }]} /><Text style={styles.legendText}>long day</Text></View>
                </View>

                <Text style={styles.insightSubtext}>
                  {calendarData.heaviest
                    ? `Heaviest upcoming load: ${calendarData.heaviest.key} (${calendarData.heaviest.count} sessions).`
                    : 'No upcoming sessions this month.'}
                </Text>
              </>
            )}
          </Card>

          <View style={styles.sectionHeader}>
            <Text weight="700" style={styles.sectionTitle}>Course Moodboard</Text>
            <Text style={styles.sectionHint}>Tap any card to focus</Text>
          </View>

          <View style={styles.boardWrap}>
            {rankedCourses.map((entry, idx) => {
              const active = entry.courseID === selectedCourseID;
              const colors = boardGradients[idx % boardGradients.length];
              return (
                <Pressable
                  key={String(entry.courseID)}
                  onPress={() => setSelectedCourseID(entry.courseID)}
                  style={[styles.pinPressable, active && styles.pinPressableActive]}
                >
                  <LinearGradient colors={colors} style={styles.pinCard}>
                    <Text weight="700" style={styles.pinCode}>{courseCode(entry.course)}</Text>
                    <Text numberOfLines={2} style={styles.pinName}>{courseName(entry.course)}</Text>
                    <Text weight="700" style={styles.pinPercent}>{entry.percentage.toFixed(0)}%</Text>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${Math.max(6, Math.min(100, entry.percentage))}%` }]} />
                    </View>
                    <Text style={styles.pinMeta}>Mark {entry.mark}/10 • {entry.totalSessions} sessions</Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.page,
  },
  heroCard: {
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.sm,
  },
  heroEyebrow: {
    letterSpacing: 1.3,
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 34,
    color: palette.heading,
  },
  heroText: {
    color: palette.body,
    fontSize: 15,
    lineHeight: 22,
  },
  chipRow: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: 2,
  },
  chipActive: {
    backgroundColor: '#EED9CB',
    borderColor: '#D8B9A4',
  },
  chipCode: {
    color: palette.heading,
    fontSize: 14,
  },
  chipCodeActive: {
    color: '#5D4034',
  },
  chipMeta: {
    color: palette.body,
    fontSize: 12,
  },
  chipMetaActive: {
    color: '#765B4C',
  },
  focusCard: {
    borderRadius: 22,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  focusCode: {
    color: '#FFF6F2',
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: '700',
  },
  focusName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  focusRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusPercentage: {
    fontSize: 44,
    color: 'white',
    lineHeight: 46,
  },
  focusMeta: {
    color: '#FCEEE7',
    fontSize: 14,
  },
  markBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  markText: {
    color: 'white',
    fontSize: 14,
  },
  focusActionBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  focusActionText: {
    color: 'white',
    fontSize: 13,
  },
  tileWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '48%',
    gap: spacing.xs,
    backgroundColor: palette.card,
    borderColor: palette.border,
  },
  tileValue: {
    fontSize: 24,
    color: palette.heading,
  },
  insightCard: {
    backgroundColor: '#FFFAF4',
    borderColor: palette.border,
    gap: spacing.sm,
  },
  trendCard: {
    backgroundColor: '#FFF7EE',
    borderColor: palette.border,
    gap: spacing.sm,
  },
  insightText: {
    color: palette.body,
    lineHeight: 22,
    fontSize: 15,
  },
  insightSubtext: {
    color: '#7D6E64',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectionHeaderNoMargin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    color: palette.heading,
  },
  sectionHint: {
    color: palette.body,
    fontSize: 12,
  },
  boardWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  pinPressable: {
    width: '47.5%',
  },
  pinPressableActive: {
    transform: [{ scale: 1.02 }],
  },
  pinCard: {
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#E8D9CC',
    minHeight: 172,
  },
  pinCode: {
    color: '#4F4036',
    fontSize: 13,
  },
  pinName: {
    color: '#5B4D43',
    fontSize: 13,
    lineHeight: 18,
    minHeight: 36,
  },
  pinPercent: {
    color: '#2F2823',
    fontSize: 30,
    lineHeight: 32,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(47,40,35,0.12)',
  },
  fill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#5D4C8A',
  },
  pinMeta: {
    color: '#66574D',
    fontSize: 12,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 168,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendTrack: {
    width: '90%',
    height: 120,
    borderRadius: 14,
    backgroundColor: '#F3E5D5',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendFill: {
    width: '100%',
    backgroundColor: '#8B6FA8',
    borderRadius: 14,
  },
  trendPct: {
    color: palette.heading,
    fontSize: 13,
  },
  trendLbl: {
    color: palette.body,
    fontSize: 12,
  },
  calendarCard: {
    backgroundColor: '#FFF8EE',
    borderColor: palette.border,
    gap: spacing.sm,
  },
  calendarLead: {
    color: palette.body,
    fontSize: 14,
    lineHeight: 20,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  weekHeaderText: {
    width: '13.4%',
    textAlign: 'center',
    color: '#8A786D',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dayCellBlank: {
    width: '13.4%',
    height: 56,
  },
  dayCell: {
    width: '13.4%',
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayNum: {
    color: '#51423A',
    fontSize: 12,
  },
  dayLoad: {
    color: '#6A574C',
    fontSize: 10,
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: palette.accent,
  },
  selectedDotGhost: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: 'transparent',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D4C4B5',
  },
  legendText: {
    color: '#6F5F54',
    fontSize: 12,
  },
  centerCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  emptyCard: {
    gap: spacing.sm,
    backgroundColor: palette.card,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
});
