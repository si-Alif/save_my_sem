import React from 'react';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthProvider';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../theme';

export default function SettingsScreen() {
  const { logout } = useAuth();
  return (
    <Screen>
      <Text weight="700" style={{ fontSize: 24 }}>
        Settings
      </Text>
      <View style={styles.section}>
        <Button label="Log out" onPress={logout} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
});
