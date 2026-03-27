export interface TokenResponse {
  authentication_token: {
    token: string;
    expiry?: string;
    user_id?: number;
  };
}

export interface Course {
  id: number;
  user_id: number;
  course_id: number;
  semester: string;
  section: string;
  status: string;
}

export interface Session {
  id: number;
  course_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: string;
}

export interface AttendanceLog {
  id: number;
  user_id: number;
  class_session_id: number;
  status: string;
  marked_at: string;
  marked_by_user_id?: number;
  note?: string;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total_sessions: number;
}

export interface Metadata {
  current_page?: number;
  page_size?: number;
  first_page?: number;
  last_page?: number;
  total_records?: number;
}
