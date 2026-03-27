import { getJson } from './client';
import { Session, Metadata } from './types';

export interface ListSessionsParams {
  status?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  on?: string;   // YYYY-MM-DD (mutually exclusive with from/to)
  course_id?: number;
  page?: number;
  page_size?: number;
}

export async function listUserSessions(userId: number, params: ListSessionsParams = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.on) qs.set('on', params.on);
  if (params.course_id) qs.set('course_id', String(params.course_id));
  if (params.page) qs.set('page', String(params.page));
  if (params.page_size) qs.set('page_size', String(params.page_size));

  const query = qs.toString();
  const suffix = query ? `?${query}` : '';
  return getJson<{ sessions: Session[]; metadata: Metadata }>(`/v1/users/${userId}/sessions${suffix}`);
}