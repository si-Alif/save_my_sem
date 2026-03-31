export const DEFAULT_SEMESTER_KEY = '2-1:2023';

export const LEVEL_TERM_OPTIONS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'] as const;

const SEMESTER_KEY_REGEX = /^([1-8])-(1|2):(\d{4})$/;

export function normalizeSemesterKey(input: string) {
  return input.trim();
}

export function isValidSemesterKey(input: string) {
  return SEMESTER_KEY_REGEX.test(normalizeSemesterKey(input));
}

export function parseSemesterKey(input: string): { level: number; term: number; batch: number } | null {
  const match = normalizeSemesterKey(input).match(SEMESTER_KEY_REGEX);
  if (!match) return null;
  return {
    level: Number(match[1]),
    term: Number(match[2]),
    batch: Number(match[3]),
  };
}

export function buildSemesterKey(levelTerm: string, batch: string) {
  return `${levelTerm}:${batch.trim()}`;
}
