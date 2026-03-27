import React from 'react';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';

export default function SessionsScreen() {
  return (
    <Screen>
      <Text weight="700" style={{ fontSize: 24 }}>
        Sessions
      </Text>
      <Text muted>Session list and filters will appear here.</Text>
    </Screen>
  );
}
