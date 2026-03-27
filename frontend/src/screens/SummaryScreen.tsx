import React from 'react';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';

export default function SummaryScreen() {
  return (
    <Screen>
      <Text weight="700" style={{ fontSize: 24 }}>
        Summary
      </Text>
      <Text muted>Attendance summary and marks will appear here.</Text>
    </Screen>
  );
}
