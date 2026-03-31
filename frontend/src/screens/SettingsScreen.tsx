import React, { useEffect, useMemo, useState } from 'react';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthProvider';
import { Card } from '../components/Card';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { colors, spacing } from '../theme';
import {
  buildSemesterKey,
  DEFAULT_SEMESTER_KEY,
  isValidSemesterKey,
  LEVEL_TERM_OPTIONS,
  parseSemesterKey,
} from '../lib/semester';

export default function SettingsScreen() {
  const { logout, semesterKey, setSemesterKey } = useAuth();
  const parsed = useMemo(() => parseSemesterKey(semesterKey), [semesterKey]);
  const [selectedLevelTerm, setSelectedLevelTerm] = useState(
    parsed ? `${parsed.level}-${parsed.term}` : DEFAULT_SEMESTER_KEY.split(':')[0]
  );
  const [batch, setBatch] = useState(parsed ? String(parsed.batch) : DEFAULT_SEMESTER_KEY.split(':')[1]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextParsed = parseSemesterKey(semesterKey);
    if (!nextParsed) return;
    setSelectedLevelTerm(`${nextParsed.level}-${nextParsed.term}`);
    setBatch(String(nextParsed.batch));
  }, [semesterKey]);

  const preview = buildSemesterKey(selectedLevelTerm, batch);
  const isValidPreview = isValidSemesterKey(preview);
  const dirty = preview !== semesterKey;

  const onSaveSemester = async () => {
    if (!isValidPreview) {
      setError('Use format level-term:batch, for example 2-1:2023.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await setSemesterKey(preview);
    } catch (_err) {
      setError('Could not update semester. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text weight="700" style={{ fontSize: 24 }}>
        Settings
      </Text>

      <Card style={styles.section}>
        <Text weight="700">Academic semester</Text>
        <Text muted>Pick your level-term and batch. This will drive course import and enrollment views.</Text>

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
          <Text muted>Batch year</Text>
          <TextInput
            placeholder="2023"
            keyboardType="number-pad"
            value={batch}
            onChangeText={setBatch}
            maxLength={4}
            style={styles.input}
          />
        </View>

        <View style={styles.previewRow}>
          <Text muted>Current</Text>
          <Text weight="700">{semesterKey}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text muted>Preview</Text>
          <Text weight="700">{preview}</Text>
        </View>

        {!isValidPreview ? <Text style={styles.errorText}>Enter a 4-digit batch year.</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={saving ? 'Saving…' : 'Save semester'}
          onPress={onSaveSemester}
          disabled={!isValidPreview || !dirty || saving}
        />
      </Card>

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
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: '#e8f0ff',
  },
  pillText: {
    color: colors.text,
  },
  pillTextActive: {
    color: colors.primary,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: colors.danger,
  },
});
