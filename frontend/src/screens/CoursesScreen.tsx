import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing } from '../theme';
import { listUserCourses, listAllCourses } from '../lib/api/courses';
import { postJson } from '../lib/api';
import { useAuth } from '../state/AuthProvider';

function normalizeCourseCode(value: string) {
  return value.trim().toUpperCase();
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

  const courses = data?.courses ?? [];

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

  const availableCourses = useMemo(() => {
    const catalog = catalogQuery.data?.courses ?? [];
    return catalog.filter((course) => !enrolledCodes.has(normalizeCourseCode(course.code || course.course_code || '')));
  }, [catalogQuery.data, enrolledCodes]);

  const handleEnroll = (rawCourseCode: string) => {
    const normalized = normalizeCourseCode(rawCourseCode);
    if (!normalized || enrollMutation.isPending) return;
    setFeedback(null);
    enrollMutation.mutate(normalized);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text weight="700" style={styles.title}>
          Courses
        </Text>
        <Text muted>{semesterKey}</Text>
      </View>

      <Text muted>Set semester from Settings using level-term:batch (example: 2-1:2023).</Text>

      <Card style={styles.enrollCard}>
        <Text weight="700">Quick enroll</Text>
        <Text muted>Enter course code and section for the selected semester.</Text>
        <TextInput
          placeholder="Course code"
          value={courseCode}
          onChangeText={setCourseCode}
          autoCapitalize="characters"
          style={styles.input}
        />
        <TextInput
          placeholder="Section (e.g., A)"
          value={section}
          onChangeText={setSection}
          autoCapitalize="characters"
          style={styles.input}
        />
        <Button
          label={enrollMutation.isPending ? 'Enrolling…' : 'Enroll'}
          onPress={() => handleEnroll(courseCode)}
          disabled={!courseCode.trim() || enrollMutation.isPending}
        />
        {feedback ? <Text style={{ color: feedback.startsWith('Enrolled') ? colors.success : colors.danger }}>{feedback}</Text> : null}
      </Card>

      <Card style={styles.sectionCard}>
        <Text weight="700">Available in {semesterKey}</Text>
        {catalogQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {!catalogQuery.isLoading && availableCourses.length === 0 ? (
          <Text muted>All available courses for this semester are already enrolled or no matches were found.</Text>
        ) : null}

        {availableCourses.map((item) => {
          const code = item.code || item.course_code || `Course #${item.id}`;
          return (
            <View key={String(item.id)} style={styles.courseRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text weight="700">{code}</Text>
                <Text>{item.name || item.course_name || 'Unnamed course'}</Text>
                <Text muted>
                  {(item.credit_hours ?? '?')} credit hrs · {item.course_type || 'course'}
                </Text>
              </View>
              <Button
                label={enrollMutation.isPending && normalizeCourseCode(code) === normalizeCourseCode(String(enrollMutation.variables || '')) ? '...' : 'Enroll'}
                onPress={() => handleEnroll(code)}
                disabled={enrollMutation.isPending}
                style={styles.smallButton}
                labelStyle={styles.smallButtonLabel}
              />
            </View>
          );
        })}
      </Card>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text muted>Could not load courses.</Text>
          <Text style={{ color: colors.primary }} onPress={() => refetch()}>
            Tap to retry
          </Text>
        </View>
      )}

      {!isLoading && !isError && (
        <Card style={styles.sectionCard}>
          <Text weight="700">Your enrolled courses</Text>
          {courses.length === 0 ? (
            <Text muted>No courses enrolled yet for this semester.</Text>
          ) : (
            courses.map((item) => (
              <View key={String(item.id)} style={styles.courseRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="700">{item.course_code || `Course #${item.course_id}`}</Text>
                  <Text>{item.course_name || 'Unnamed course'}</Text>
                  <Text muted>
                    {(item.credit_hours ?? '?')} credit hrs · {item.course_type || 'course'}
                  </Text>
                  <Text muted>Section {item.section} · Status: {item.status}</Text>
                </View>
              </View>
            ))
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
  },
  enrollCard: {
    gap: spacing.sm,
  },
  sectionCard: {
    gap: spacing.sm,
  },
  courseRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  smallButtonLabel: {
    fontSize: 13,
  },
});
