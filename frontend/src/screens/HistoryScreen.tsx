import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme';
import { listUserAttendance } from '../lib/api';
import { useAuth } from '../state/AuthProvider';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const { userId } = useAuth();

  const query = useQuery({
    queryKey: ['attendance', userId],
    queryFn: () => listUserAttendance(userId!),
    enabled: !!userId,
  });

  const data = query.data?.attendance ?? [];

  return (
    <Screen scroll={false} style={styles.safePad}>
      <View style={styles.headerRow}>
        <View>
          <Text weight="700" style={styles.title}>History</Text>
          <Text muted>Recent attendance marks</Text>
        </View>
      </View>

      {query.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text muted style={{ marginTop: spacing.sm }}>Loading history…</Text>
        </View>
      )}

      {query.isError && (
        <View style={styles.center}>
          <Text muted>Could not load attendance.</Text>
          <Text style={{ color: colors.primary, marginTop: spacing.xs }} onPress={() => query.refetch()}>
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
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text weight="700">Session #{item.class_session_id}</Text>
                  <Text muted>{formatDateTime(item.marked_at)}</Text>
                  {item.note ? <Text muted>{item.note}</Text> : null}
                </View>
                <View style={[styles.badge, { backgroundColor: `${colors.primary}12` }]}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{item.status}</Text>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text muted>No attendance records yet.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  safePad: {
    padding: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 26,
  },
  list: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
});
