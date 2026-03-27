import { postJson, getJson } from './client';
import { AttendanceLog, AttendanceSummary, Metadata } from './types';

export interface MarkAttendancePayload {
  user_id: number;
  class_session_id: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string | null;
  marked_by_user_id?: number;
}

export async function markAttendance(payload: MarkAttendancePayload) {
  return postJson<{ attendance: AttendanceLog }>('/v1/attendance', payload);
}

export interface ListAttendanceParams {
  course_id?: number;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export async function listUserAttendance(userId: number, params: ListAttendanceParams = {}) {
  const qs = new URLSearchParams();
  if (params.course_id) qs.set('course_id', String(params.course_id));
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.page) qs.set('page', String(params.page));
  if (params.page_size) qs.set('page_size', String(params.page_size));
  const query = qs.toString();
  const suffix = query ? `?${query}` : '';
  return getJson<{ attendance: AttendanceLog[]; metadata: Metadata }>(`/v1/users/${userId}/attendance${suffix}`);
}

export interface AttendanceSummaryParams {
  course_id?: number;
  from?: string;
  to?: string;
}

export async function getAttendanceSummary(userId: number, params: AttendanceSummaryParams = {}) {
  const qs = new URLSearchParams();
  if (params.course_id) qs.set('course_id', String(params.course_id));
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const query = qs.toString();
  const suffix = query ? `?${query}` : '';
  return getJson<{ summary: AttendanceSummary; attended_sessions: number; attendance_percentage: number; attendance_mark: number }>(
    `/v1/users/${userId}/attendance/summary${suffix}`
  );
}