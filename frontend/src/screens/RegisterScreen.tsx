import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
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
  risk: '#B04A4A',
};

export default function RegisterScreen() {
  const { register, authBusy } = useAuth();
  const navigation = useNavigation<any>();

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onSubmit = async () => {
    if (!fullname.trim() || !email.trim() || !password) {
      Alert.alert('Registration failed', 'Full name, email and password are required.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Registration failed', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Registration failed', 'Passwords do not match.');
      return;
    }

    try {
      await register({
        fullname: fullname.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (err: any) {
      Alert.alert('Registration failed', err?.message || 'Could not create account. Try again.');
    }
  };

  return (
    <Screen style={styles.page}>
      <LinearGradient colors={['#EED9CB', '#F8EFE7']} style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>GET STARTED</Text>
        <Text style={styles.title} weight="700">Create Account</Text>
        <Text style={styles.heroBody}>
          Build your attendance routine from day one and let the app guide your momentum.
        </Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.formTitle} weight="700">Register</Text>

        <TextInput
          placeholder="Full name"
          placeholderTextColor="#9A8D84"
          value={fullname}
          onChangeText={setFullname}
          style={styles.input}
        />
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
        <TextInput
          placeholder="Confirm password"
          placeholderTextColor="#9A8D84"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
        />

        <Button label={authBusy ? 'Creating account...' : 'Create account'} onPress={onSubmit} disabled={authBusy} />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink} weight="700">Sign in</Text>
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
  input: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    color: '#3D332E',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loginText: {
    color: palette.body,
    fontSize: 13,
  },
  loginLink: {
    color: palette.accent,
    fontSize: 13,
  },
});
