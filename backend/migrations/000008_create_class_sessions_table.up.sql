-- Concrete dated sessions generated from schedule rules + semester window
CREATE TABLE class_sessions (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_courses_id BIGINT NOT NULL REFERENCES user_courses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT DEFAULT 'TBD',
    status TEXT NOT NULL DEFAULT 'scheduled'
      CHECK (status IN ('scheduled', 'cancelled', 'rescheduled', 'makeup')),
    cancelled_reason TEXT DEFAULT NULL,
    rescheduled_to_session_id BIGINT REFERENCES class_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (start_time < end_time)
);

-- Prevent duplicate sessions per enrollment per date
CREATE UNIQUE INDEX idx_class_sessions_unique
  ON class_sessions(user_courses_id, session_date)
  WHERE status IN ('scheduled', 'rescheduled', 'makeup');

-- Calendar queries
CREATE INDEX idx_class_sessions_user_date
  ON class_sessions(user_courses_id, session_date DESC);

CREATE INDEX idx_class_sessions_course_date
  ON class_sessions(course_id, session_date)
  WHERE status != 'cancelled';

CREATE TRIGGER set_class_sessions_updated_at
    BEFORE UPDATE ON class_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
