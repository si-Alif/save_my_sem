import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { spacing } from '../theme';
import { useAuth } from '../state/AuthProvider';

const palette = {
  page: '#F4EFE7',
  heading: '#2E2A27',
  body: '#5E544D',
  card: '#FFF9F2',
  border: '#E9DCCF',
  accent: '#6D4C64',
  success: '#4E8D75',
  warning: '#C77A4D',
  risk: '#B04A4A',
};

export default function LoginScreen() {
  const { login, authBusy } = useAuth();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || 'Please check your credentials');
    }
  };

  return (
    <Screen style={styles.page}>
      <LinearGradient colors={['#EED9CB', '#F8EFE7']} style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>WELCOME BACK</Text>
        <Text style={styles.title} weight="700">RescueMySemsester</Text>
        <Text style={styles.heroBody}>
          Pick up your routine where you left off and lock in today's class momentum.
        </Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.formTitle} weight="700">Sign in</Text>
        <Text style={styles.formHint}>Use your email and password. Session stays active until token expiry.</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#9A8D84"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#9A8D84"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Button label={authBusy ? 'Signing in...' : 'Sign in'} onPress={onSubmit} disabled={authBusy} />

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>New here?</Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink} weight="700">Create account</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: palette.page,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: palette.accent,
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    color: palette.heading,
  },
  heroBody: {
    color: palette.body,
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  formTitle: {
    color: palette.heading,
    fontSize: 20,
  },
  formHint: {
    color: palette.body,
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    color: '#3D332E',
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  registerText: {
    color: palette.body,
    fontSize: 13,
  },
  registerLink: {
    color: palette.accent,
    fontSize: 13,
  },
});
