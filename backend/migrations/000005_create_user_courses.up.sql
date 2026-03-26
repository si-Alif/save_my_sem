CREATE TABLE user_courses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    semester TEXT NOT NULL,
    section TEXT DEFAULT 'A',
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'dropped', 'completed')),

    grade CHAR(2),

    enrollment_date TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,

    UNIQUE(user_id, course_id, semester)
);

CREATE INDEX idx_user_courses_course_id ON user_courses(course_id);
CREATE INDEX idx_user_courses_user_semester ON user_courses(user_id, semester, status);

CREATE TRIGGER set_user_courses_updated_at
    BEFORE UPDATE ON user_courses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();