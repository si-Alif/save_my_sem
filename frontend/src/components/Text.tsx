import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors } from '../theme';

export const Text: React.FC<TextProps & { muted?: boolean; weight?: '400' | '500' | '600' | '700' }> = ({
  style,
  muted,
  weight,
  children,
  ...rest
}) => {
  return (
    <RNText
      style={[
        styles.base,
        muted && styles.muted,
        weight && { fontWeight: weight },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
});
