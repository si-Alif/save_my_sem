import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing } from '../theme';
import { listUserCourses, listAllCourses } from '../lib/api/courses';
import { postJson } from '../lib/api';
import { useAuth } from '../state/AuthProvider';

const DEFAULT_SEMESTER = 'odd-2026';

export default function CoursesScreen() {
  const { userId } = useAuth();
  const [courseCode, setCourseCode] = useState('');
  const [section, setSection] = useState('A');

  const catalogQuery = useQuery({
    queryKey: ['course-catalog'],
    queryFn: () => listAllCourses(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courses', userId, DEFAULT_SEMESTER],
    queryFn: () => listUserCourses(userId!, DEFAULT_SEMESTER),
    enabled: !!userId,
  });

  const courses = data?.courses ?? [];

  const enrollMutation = useMutation({
    mutationFn: () =>
      postJson('/v1/courses/enroll', {
        user_id: userId,
        course_code: courseCode.trim(),
        semester: DEFAULT_SEMESTER,
        section: section.trim() || 'A',
      }),
    onSuccess: () => {
      setCourseCode('');
      refetch();
    },
  });

  const catalogLookup = useMemo(() => {
    const map = new Map<string, { name?: string; credit_hours?: number; course_type?: string }>();
    catalogQuery.data?.courses?.forEach((c: any) => map.set((c.course_code || c.code || '').toUpperCase(), c));
    return map;
  }, [catalogQuery.data]);

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Text weight="700" style={styles.title}>
          Courses
        </Text>
        <Text muted>{DEFAULT_SEMESTER}</Text>
      </View>

      <Card style={styles.enrollCard}>
        <Text weight="700">Enroll in a course</Text>
        <Text muted>Enter course code from catalog (e.g., CSE1201) and section.</Text>
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
          onPress={() => enrollMutation.mutate()}
          disabled={!courseCode.trim() || enrollMutation.isPending}
        />
        {enrollMutation.isError ? (
          <Text style={{ color: colors.danger }}>Could not enroll. Check code/section.</Text>
        ) : null}
        {enrollMutation.isSuccess ? <Text style={{ color: colors.success }}>Enrolled!</Text> : null}
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
        <FlatList
          data={courses}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text weight="700">{item.course_code || `Course #${item.course_id}`}</Text>
              <Text>{item.course_name || catalogLookup.get((item.course_code || '').toUpperCase())?.name || 'Unnamed course'}</Text>
              <Text muted>
                {(item.credit_hours ?? catalogLookup.get((item.course_code || '').toUpperCase())?.credit_hours ?? '?')} credit hrs · {item.course_type || catalogLookup.get((item.course_code || '').toUpperCase())?.course_type || 'course'}
              </Text>
              <Text muted>Section {item.section} · Status: {item.status}</Text>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text muted>No courses found for this semester.</Text>
            </View>
          }
        />
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
  list: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.xs,
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
});
