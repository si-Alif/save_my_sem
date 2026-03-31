import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { spacing } from '../theme';

interface Props {
  semesterKey: string;
  hint?: string;
}

export const SemesterLockBanner: React.FC<Props> = ({
  semesterKey,
  hint = 'Data on this screen follows your selected semester from Settings.',
}) => {
  return (
    <LinearGradient colors={['#F0E0D4', '#FFF4EB']} style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.label}>SEMESTER LOCK</Text>
        <View style={styles.pill}>
          <Text weight="700" style={styles.pillText}>{semesterKey}</Text>
        </View>
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6D2C2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: '#6B4B41',
    letterSpacing: 0.8,
    fontWeight: '700',
    fontSize: 11,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7B7A0',
    backgroundColor: 'rgba(255,255,255,0.74)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  pillText: {
    color: '#5D4034',
    fontSize: 12,
  },
  hint: {
    color: '#5E544D',
    fontSize: 12,
    lineHeight: 18,
  },
});
