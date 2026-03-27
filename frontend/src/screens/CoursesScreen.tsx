import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme';
import { listUserCourses } from '../lib/api/courses';
import { useAuth } from '../state/AuthProvider';

const DEFAULT_SEMESTER = 'odd-2026';

export default function CoursesScreen() {
  const { userId } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courses', userId, DEFAULT_SEMESTER],
    queryFn: () => listUserCourses(userId!, DEFAULT_SEMESTER),
    enabled: !!userId,
  });

  const courses = data?.courses ?? [];

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Text weight="700" style={styles.title}>
          Courses
        </Text>
        <Text muted>{DEFAULT_SEMESTER}</Text>
      </View>

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
              <Text weight="700">Course #{item.course_id}</Text>
              <Text muted>Section {item.section}</Text>
              <Text muted>Status: {item.status}</Text>
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
});
