-- Stores start/end dates for each semester; one row can be active
CREATE TABLE semester_config (
    id BIGSERIAL PRIMARY KEY,
    semester TEXT NOT NULL UNIQUE,               -- e.g., '2026_spring'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (start_date <= end_date)
);

-- Only one active semester
CREATE UNIQUE INDEX idx_semester_config_active
  ON semester_config(is_active)
  WHERE is_active = true;

CREATE INDEX idx_semester_config_semester ON semester_config(semester);

CREATE TRIGGER set_semester_config_updated_at
    BEFORE UPDATE ON semester_config
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
