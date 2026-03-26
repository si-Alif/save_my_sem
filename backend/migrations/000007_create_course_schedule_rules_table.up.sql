-- Weekly recurring rules; archived_at lets you retire a rule without deleting history
CREATE TABLE course_schedule_rules (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon (ISO)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT DEFAULT 'TBD',
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    archived_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    CHECK (start_time < end_time),
    CHECK (effective_from <= effective_to)
);

-- Active rule lookup
CREATE INDEX idx_course_schedule_rules_course_active
  ON course_schedule_rules(course_id, effective_from)
  WHERE archived_at IS NULL;

CREATE INDEX idx_course_schedule_rules_day_time
  ON course_schedule_rules(day_of_week, start_time)
  WHERE archived_at IS NULL;

CREATE TRIGGER set_course_schedule_rules_updated_at
    BEFORE UPDATE ON course_schedule_rules
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
