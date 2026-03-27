import React from 'react';
import { Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing } from '../theme';
import { Text } from './Text';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  labelStyle?: TextStyle;
  disabled?: boolean;
}

export const Button: React.FC<Props> = ({ label, onPress, variant = 'primary', style, labelStyle, disabled }) => {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          isPrimary ? styles.primaryLabel : styles.secondaryLabel,
          labelStyle,
        ]}
        weight="600"
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
  },
  primaryLabel: {
    color: 'white',
  },
  secondaryLabel: {
    color: colors.text,
  },
});
