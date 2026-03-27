import React from 'react';
import { View, StyleSheet, ViewProps, Platform } from 'react-native';
import { colors, spacing } from '../theme';

export const Card: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' }
      : {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }),
    borderWidth: 1,
    borderColor: colors.border,
  },
});
