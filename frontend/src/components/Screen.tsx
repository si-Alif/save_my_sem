import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, ViewProps } from 'react-native';
import { colors, spacing } from '../theme';

interface Props extends ViewProps {
  scroll?: boolean;
}

export const Screen: React.FC<Props> = ({ children, style, scroll = true, ...rest }) => {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.container, style]} {...rest}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, style]} {...rest}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
});
