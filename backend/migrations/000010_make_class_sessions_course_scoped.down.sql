-- Revert course-scoped sessions to enrollment-scoped
ALTER TABLE class_sessions ADD COLUMN user_courses_id BIGINT NOT NULL REFERENCES user_courses(id) ON DELETE CASCADE;

-- Restore unique/indexes involving user_courses_id
CREATE UNIQUE INDEX idx_class_sessions_unique
  ON class_sessions(user_courses_id, session_date)
  WHERE status IN ('scheduled', 'rescheduled', 'makeup');

CREATE INDEX idx_class_sessions_user_date
  ON class_sessions(user_courses_id, session_date DESC);

-- Drop the course/date/time uniqueness index
DROP INDEX IF EXISTS idx_class_sessions_course_date_time;
