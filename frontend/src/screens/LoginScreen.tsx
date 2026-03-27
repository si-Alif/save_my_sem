import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { colors, spacing } from '../theme';
import { useAuth } from '../state/AuthProvider';

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Login failed', 'Email and password are required');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Login failed', 'Password must be at least 8 characters');
      return;
    }
    try {
      await login({ email, password, userId: userId ? Number(userId) : undefined });
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || 'Please check your credentials');
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title} weight="700">
          Welcome back
        </Text>
        <Text muted>Log in to view your courses and mark attendance.</Text>
      </View>
      <View style={styles.form}>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          placeholder="User ID (temporary until token includes it)"
          value={userId}
          onChangeText={setUserId}
          keyboardType="number-pad"
          style={styles.input}
        />
        <Button label={loading ? 'Signing in...' : 'Sign in'} onPress={onSubmit} disabled={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
