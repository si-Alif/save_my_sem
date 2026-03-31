import { getJson } from './client';
import { Course } from './types';

export async function listUserCourses(userId: number, semester: string) {
  return getJson<{ courses: Course[] }>(`/v1/users/${userId}/courses?semester=${encodeURIComponent(semester)}`);
}

export async function listAllCourses(semester?: string) {
  const semesterParam = semester ? `?semester=${encodeURIComponent(semester)}` : '';
  return getJson<{ courses: Course[] }>(`/v1/courses${semesterParam}`);
}
