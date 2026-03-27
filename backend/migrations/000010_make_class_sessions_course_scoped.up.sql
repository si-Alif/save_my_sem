-- Make class_sessions course-scoped (remove dependency on user_courses)
ALTER TABLE class_sessions DROP COLUMN user_courses_id;

-- Drop indexes that reference user_courses_id
DROP INDEX IF EXISTS idx_class_sessions_unique;
DROP INDEX IF EXISTS idx_class_sessions_user_date;

-- Add uniqueness per course/date/time to keep idempotent inserts
CREATE UNIQUE INDEX idx_class_sessions_course_date_time
  ON class_sessions(course_id, session_date, start_time, end_time)
  WHERE status IN ('scheduled', 'rescheduled', 'makeup');
