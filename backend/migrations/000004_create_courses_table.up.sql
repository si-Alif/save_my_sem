CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,

    code TEXT NOT NULL,
    name TEXT NOT NULL,

    credit_hours NUMERIC(4,2) NOT NULL,
    contact_hours_per_week NUMERIC(4,2),

    course_type TEXT NOT NULL CHECK (
        course_type IN ('theory', 'sessional', 'project', 'optional')
    ),

    department TEXT DEFAULT 'CSE',

    created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1
);

-- A course code must be unique (CSE 1101 etc.)
CREATE UNIQUE INDEX idx_courses_code ON courses (code);

CREATE TRIGGER set_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();