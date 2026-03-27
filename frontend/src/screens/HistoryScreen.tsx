import React from 'react';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';

export default function HistoryScreen() {
  return (
    <Screen>
      <Text weight="700" style={{ fontSize: 24 }}>
        Attendance History
      </Text>
      <Text muted>Attendance records will appear here.</Text>
    </Screen>
  );
}
