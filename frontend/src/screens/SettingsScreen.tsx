import React, { useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthProvider';
import { Card } from '../components/Card';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { spacing } from '../theme';
import {
  buildSemesterKey,
  DEFAULT_SEMESTER_KEY,
  isValidSemesterKey,
  LEVEL_TERM_OPTIONS,
  parseSemesterKey,
} from '../lib/semester';

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

export default function SettingsScreen() {
  const { logout, userId, userInfo, semesterKey, setSemesterKey } = useAuth();
  const parsed = useMemo(() => parseSemesterKey(semesterKey), [semesterKey]);
  const [selectedLevelTerm, setSelectedLevelTerm] = useState(
    parsed ? `${parsed.level}-${parsed.term}` : DEFAULT_SEMESTER_KEY.split(':')[0]
  );
  const [batch, setBatch] = useState(parsed ? String(parsed.batch) : DEFAULT_SEMESTER_KEY.split(':')[1]);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const nextParsed = parseSemesterKey(semesterKey);
    if (!nextParsed) return;
    setSelectedLevelTerm(`${nextParsed.level}-${nextParsed.term}`);
    setBatch(String(nextParsed.batch));
  }, [semesterKey]);

  const preview = buildSemesterKey(selectedLevelTerm, batch);
  const isValidPreview = isValidSemesterKey(preview);
  const dirty = preview !== semesterKey;

  const activeLabel = dirty ? 'Unsaved changes' : 'Synced';

  const saveToneColor = !isValidPreview ? palette.risk : dirty ? palette.warning : palette.success;

  const onSaveSemester = async () => {
    if (!isValidPreview) {
      setError('Use format level-term:batch, for example 2-1:2023.');
      setInfo(null);
      return;
    }

    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      await setSemesterKey(preview);
      setInfo('Semester scope updated. Courses, sessions, history, and summary are now aligned.');
    } catch (_err) {
      setError('Could not update semester. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen style={styles.page}>
      <LinearGradient colors={['#EED9CB', '#F8EFE7']} style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>SETTINGS</Text>
        <Text weight="700" style={styles.heroTitle}>Control Center</Text>
        <Text style={styles.heroBody}>
          Keep one reliable semester scope so every page stays consistent with your academic timeline.
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={[styles.statusPill, { borderColor: saveToneColor }]}>
            <Text weight="700" style={[styles.statusText, { color: saveToneColor }]}>{activeLabel}</Text>
          </View>
          <View style={styles.currentPill}>
            <Text weight="700" style={styles.currentPillText}>{semesterKey}</Text>
          </View>
        </View>
      </LinearGradient>

      <Card style={styles.sectionCard}>
        <Text weight="700" style={styles.sectionTitle}>User Info</Text>
        <View style={styles.previewBlock}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Full name</Text>
            <Text weight="700" style={styles.previewValue}>{userInfo?.fullname || 'Not set'}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Email</Text>
            <Text weight="700" style={styles.previewValue}>{userInfo?.email || 'Unknown'}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>User ID</Text>
            <Text weight="700" style={styles.previewValue}>{userId ? String(userId) : 'Unknown'}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Account</Text>
            <Text weight="700" style={styles.previewValue}>{userInfo?.activated === false ? 'Pending activation' : 'Active'}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text weight="700" style={styles.sectionTitle}>Academic Semester Scope</Text>
        <Text style={styles.sectionBody}>
          Choose level-term and batch in level-term:batch format, for example 2-1:2023.
        </Text>

        <View style={styles.pillWrap}>
          {LEVEL_TERM_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.pill, selectedLevelTerm === option && styles.pillActive]}
              onPress={() => setSelectedLevelTerm(option)}
            >
              <Text weight="700" style={[styles.pillText, selectedLevelTerm === option && styles.pillTextActive]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Batch year</Text>
          <TextInput
            placeholder="2023"
            placeholderTextColor="#9A8D84"
            keyboardType="number-pad"
            value={batch}
            onChangeText={setBatch}
            maxLength={4}
            style={styles.input}
          />
        </View>

        <View style={styles.previewBlock}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Current</Text>
            <Text weight="700" style={styles.previewValue}>{semesterKey}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text weight="700" style={styles.previewValue}>{preview}</Text>
          </View>
        </View>

        {!isValidPreview ? <Text style={styles.errorText}>Enter a valid 4-digit batch year.</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {info ? <Text style={styles.infoText}>{info}</Text> : null}

        <Button
          label={saving ? 'Saving...' : 'Save semester scope'}
          onPress={onSaveSemester}
          disabled={!isValidPreview || !dirty || saving}
        />
      </Card>

      <Card style={styles.sectionCard}>
        <Text weight="700" style={styles.sectionTitle}>Where This Applies</Text>
        <Text style={styles.scopeLine}>Courses: only matching semester courses are shown for enrollment.</Text>
        <Text style={styles.scopeLine}>Sessions: class feed and course chips are filtered to your semester.</Text>
        <Text style={styles.scopeLine}>History & Summary: insights and trends stay aligned with active scope.</Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text weight="700" style={styles.sectionTitle}>Account</Text>
        <Text style={styles.sectionBody}>Log out when switching users on this device.</Text>
        <Button label={loggingOut ? 'Logging out...' : 'Log out'} onPress={onLogout} variant="secondary" disabled={loggingOut} />
      </Card>
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
  heroTitle: {
    color: palette.heading,
    fontSize: 32,
  },
  heroBody: {
    color: palette.body,
    fontSize: 14,
    lineHeight: 20,
  },
  heroMetaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
  },
  currentPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9B8A4',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  currentPillText: {
    color: '#5D4034',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    gap: spacing.md,
  },
  sectionTitle: {
    color: palette.heading,
    fontSize: 18,
  },
  sectionBody: {
    color: palette.body,
    fontSize: 13,
    lineHeight: 20,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFFDF9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillActive: {
    borderColor: '#C8AFA0',
    backgroundColor: '#EED9CB',
  },
  pillText: {
    color: '#4D413B',
  },
  pillTextActive: {
    color: '#5D4034',
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: palette.body,
    fontSize: 12,
  },
  input: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    color: '#3D332E',
  },
  previewBlock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFFBF6',
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    color: palette.body,
    fontSize: 12,
  },
  previewValue: {
    color: '#4D413B',
  },
  errorText: {
    color: palette.risk,
  },
  infoText: {
    color: palette.success,
  },
  scopeLine: {
    color: palette.body,
    fontSize: 13,
    lineHeight: 20,
  },
});
