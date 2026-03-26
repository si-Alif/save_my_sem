-- Actual attendance marks per user per class session
CREATE TABLE attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_session_id BIGINT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'late')),
    marked_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    marked_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, class_session_id)
);

CREATE INDEX idx_attendance_logs_user_date
  ON attendance_logs(user_id, marked_at DESC);

CREATE INDEX idx_attendance_logs_session
  ON attendance_logs(class_session_id);

CREATE INDEX idx_attendance_logs_status
  ON attendance_logs(status)
  WHERE status IN ('present', 'excused');

CREATE TRIGGER set_attendance_logs_updated_at
    BEFORE UPDATE ON attendance_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
