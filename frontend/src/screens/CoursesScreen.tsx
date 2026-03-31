import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { spacing } from '../theme';
import { listUserCourses, listAllCourses } from '../lib/api/courses';
import { postJson } from '../lib/api';
import { useAuth } from '../state/AuthProvider';
import { Course } from '../lib/api/types';
import { parseSemesterKey } from '../lib/semester';

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
};

const rowGradients: [string, string][] = [
  ['#FFF5EA', '#FFFDF7'],
  ['#F7EFEA', '#FFF8F2'],
  ['#F4EDE7', '#FEF7F0'],
];

function normalizeCourseCode(value: string) {
  return value.trim().toUpperCase();
}

function courseCodeFrom(item: Course) {
  return normalizeCourseCode(item.code || item.course_code || `COURSE-${item.id}`);
}

function extractNumericToken(code: string) {
  const match = normalizeCourseCode(code).match(/(\d{4})/);
  return match?.[1] ?? '';
}

function semesterPrefix(semesterKey: string) {
  const parsed = parseSemesterKey(semesterKey);
  if (!parsed) return '';
  return `${parsed.level}${parsed.term}`;
}

function courseMatchesSemester(code: string, semesterKey: string) {
  const prefix = semesterPrefix(semesterKey);
  if (!prefix) return false;
  return extractNumericToken(code).startsWith(prefix);
}

function sortByCode(a: Course, b: Course) {
  return courseCodeFrom(a).localeCompare(courseCodeFrom(b));
}

export default function CoursesScreen() {
  const { userId, semesterKey } = useAuth();
  const [courseCode, setCourseCode] = useState('');
  const [section, setSection] = useState('A');
  const [feedback, setFeedback] = useState<string | null>(null);

  const catalogQuery = useQuery({
    queryKey: ['course-catalog', semesterKey],
    queryFn: () => listAllCourses(semesterKey),
    enabled: !!semesterKey,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courses', userId, semesterKey],
    queryFn: () => listUserCourses(userId!, semesterKey),
    enabled: !!userId,
  });

  const courses = useMemo(() => [...(data?.courses ?? [])].sort(sortByCode), [data?.courses]);

  const selectedPrefix = semesterPrefix(semesterKey);
  const codePatternHint = selectedPrefix ? `${selectedPrefix}xx` : '----';

  const enrolledCreditHours = useMemo(
    () => courses.reduce((sum, c) => sum + (typeof c.credit_hours === 'number' ? c.credit_hours : 0), 0),
    [courses]
  );

  const enrollMutation = useMutation({
    mutationFn: (rawCourseCode: string) =>
      postJson('/v1/courses/enroll', {
        user_id: userId,
        course_code: normalizeCourseCode(rawCourseCode),
        semester: semesterKey,
        section: section.trim().toUpperCase() || 'A',
      }),
    onSuccess: (_data, rawCourseCode) => {
      setCourseCode('');
      setFeedback(`Enrolled in ${normalizeCourseCode(rawCourseCode)}.`);
      refetch();
      catalogQuery.refetch();
    },
    onError: () => {
      setFeedback('Could not enroll. Check course code and section.');
    },
  });

  const enrolledCodes = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((course) => {
      if (course.course_code) set.add(normalizeCourseCode(course.course_code));
    });
    return set;
  }, [courses]);

  const semesterCatalog = useMemo(() => {
    const catalog = catalogQuery.data?.courses ?? [];
    return catalog.filter((course) => courseMatchesSemester(courseCodeFrom(course), semesterKey)).sort(sortByCode);
  }, [catalogQuery.data, semesterKey]);

  const availableCourses = useMemo(() => {
    return semesterCatalog.filter((course) => !enrolledCodes.has(courseCodeFrom(course)));
  }, [semesterCatalog, enrolledCodes]);

  const handleEnroll = (rawCourseCode: string) => {
    const normalized = normalizeCourseCode(rawCourseCode);
    if (!normalized || enrollMutation.isPending) return;

    if (!courseMatchesSemester(normalized, semesterKey)) {
      setFeedback(`Only ${codePatternHint} course codes are allowed for semester ${semesterKey}.`);
      return;
    }

    setFeedback(null);
    enrollMutation.mutate(normalized);
  };

  return (
    <Screen style={styles.page}>
      <LinearGradient colors={['#F7E2D7', '#FFF2E8']} style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text weight="700" style={styles.title}>
              Course Studio
            </Text>
            <Text style={styles.subtitle}>Curated by your selected semester plan.</Text>
          </View>
          <View style={styles.semesterChip}>
            <Text weight="700" style={styles.semesterChipText}>{semesterKey}</Text>
          </View>
        </View>

        <Text style={styles.heroLine}>Only {codePatternHint} courses are visible and enrollable for this semester.</Text>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text weight="700" style={styles.statValue}>{availableCourses.length}</Text>
            <Text style={styles.statLabel}>available</Text>
          </View>
          <View style={styles.statPill}>
            <Text weight="700" style={styles.statValue}>{courses.length}</Text>
            <Text style={styles.statLabel}>enrolled</Text>
          </View>
          <View style={styles.statPill}>
            <Text weight="700" style={styles.statValue}>{enrolledCreditHours.toFixed(2)}</Text>
            <Text style={styles.statLabel}>credits</Text>
          </View>
        </View>
      </LinearGradient>

      <Card style={styles.quickCard}>
        <Text weight="700" style={styles.cardTitle}>Quick Enroll</Text>
        <Text style={styles.cardSubtitle}>Enter a matching course code ({codePatternHint}) and section.</Text>
        <TextInput
          placeholder={`Course code (${codePatternHint})`}
          placeholderTextColor="#9A8D84"
          value={courseCode}
          onChangeText={setCourseCode}
          autoCapitalize="characters"
          style={styles.input}
        />
        <TextInput
          placeholder="Section (e.g., A)"
          placeholderTextColor="#9A8D84"
          value={section}
          onChangeText={setSection}
          autoCapitalize="characters"
          style={styles.input}
        />
        <Button
          label={enrollMutation.isPending ? 'Enrolling...' : 'Enroll'}
          onPress={() => handleEnroll(courseCode)}
          disabled={!courseCode.trim() || enrollMutation.isPending}
        />
        {feedback ? (
          <Text style={{ color: feedback.startsWith('Enrolled') ? palette.success : palette.risk }}>{feedback}</Text>
        ) : null}
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeadRow}>
          <Text weight="700" style={styles.cardTitle}>Available to Enroll</Text>
          <Text style={styles.sectionHint}>{codePatternHint} only</Text>
        </View>

        {catalogQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : null}

        {catalogQuery.isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Could not load catalog for this semester.</Text>
            <Text style={styles.retryText} onPress={() => catalogQuery.refetch()}>
              Tap to retry
            </Text>
          </View>
        ) : null}

        {!catalogQuery.isLoading && !catalogQuery.isError && availableCourses.length === 0 ? (
          <Text style={styles.emptyText}>No new courses left to enroll for {semesterKey}.</Text>
        ) : null}

        {availableCourses.map((item, index) => {
          const code = courseCodeFrom(item);
          return (
            <LinearGradient key={String(item.id)} colors={rowGradients[index % rowGradients.length]} style={styles.courseRow}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text weight="700" style={styles.codeText}>{code}</Text>
                <Text style={styles.nameText}>{item.name || item.course_name || 'Unnamed course'}</Text>
                <Text style={styles.metaText}>
                  {(item.credit_hours ?? '?')} credit hrs | {item.course_type || 'course'}
                </Text>
              </View>
              <Button
                label="Enroll"
                onPress={() => handleEnroll(code)}
                disabled={enrollMutation.isPending}
                style={styles.smallButton}
                labelStyle={styles.smallButtonLabel}
              />
            </LinearGradient>
          );
        })}
      </Card>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load enrolled courses.</Text>
          <Text style={styles.retryText} onPress={() => refetch()}>
            Tap to retry
          </Text>
        </View>
      )}

      {!isLoading && !isError && (
        <Card style={styles.sectionCard}>
          <Text weight="700" style={styles.cardTitle}>Your Enrolled Courses</Text>
          {courses.length === 0 ? (
            <Text style={styles.emptyText}>No courses enrolled yet for this semester.</Text>
          ) : (
            courses.map((item, index) => (
              <LinearGradient key={String(item.id)} colors={rowGradients[(index + 1) % rowGradients.length]} style={styles.courseRow}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text weight="700" style={styles.codeText}>{item.course_code || `Course #${item.course_id}`}</Text>
                  <Text style={styles.nameText}>{item.course_name || 'Unnamed course'}</Text>
                  <Text style={styles.metaText}>
                    {(item.credit_hours ?? '?')} credit hrs | {item.course_type || 'course'}
                  </Text>
                  <Text style={styles.metaText}>Section {item.section} | Status: {item.status}</Text>
                </View>
              </LinearGradient>
            ))
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: palette.page,
  },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  semesterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9B8A4',
    backgroundColor: 'rgba(255,255,255,0.62)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  semesterChipText: {
    color: '#5F3F37',
    fontSize: 12,
  },
  title: {
    fontSize: 26,
    color: palette.heading,
  },
  subtitle: {
    color: palette.body,
    fontSize: 12,
  },
  heroLine: {
    color: '#574C46',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCC8B8',
    backgroundColor: 'rgba(255, 250, 244, 0.8)',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#5D4034',
    fontSize: 15,
  },
  statLabel: {
    color: palette.body,
    fontSize: 11,
  },
  quickCard: {
    gap: spacing.sm,
    backgroundColor: palette.card,
    borderColor: palette.border,
  },
  sectionCard: {
    gap: spacing.sm,
    backgroundColor: palette.card,
    borderColor: palette.border,
  },
  cardTitle: {
    color: palette.heading,
  },
  cardSubtitle: {
    color: palette.body,
    fontSize: 12,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHint: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  courseRow: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  codeText: {
    color: '#3D332E',
  },
  nameText: {
    color: '#4D413B',
    fontSize: 13,
  },
  metaText: {
    color: '#72665F',
    fontSize: 12,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    color: palette.body,
  },
  input: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    color: '#3D332E',
  },
  smallButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  smallButtonLabel: {
    fontSize: 13,
  },
  errorText: {
    color: palette.risk,
  },
  retryText: {
    color: palette.accent,
    fontWeight: '700',
  },
});
