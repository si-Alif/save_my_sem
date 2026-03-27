package data

import (
	"context"
	"database/sql"
	"time"
)

type SemesterConfig struct {
	ID        int64     `json:"id"`
	Semester  string    `json:"semester"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SemesterConfigModel struct {
	DB *sql.DB
}

// UpsertActive sets the provided semester as active (only one row may be active).
func (m SemesterConfigModel) UpsertActive(ctx context.Context, semester string, start, end time.Time) error {
	const q = `
        WITH upsert AS (
            INSERT INTO semester_config (semester, start_date, end_date, is_active)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (semester)
            DO UPDATE SET start_date = EXCLUDED.start_date,
                          end_date   = EXCLUDED.end_date,
                          is_active  = true,
                          updated_at = now()
            RETURNING id
        )
        UPDATE semester_config
        SET is_active = (id = (SELECT id FROM upsert))
        WHERE is_active = true OR id = (SELECT id FROM upsert);
    `
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	_, err := m.DB.ExecContext(ctx, q, semester, start, end)
	return err
}

func (m SemesterConfigModel) GetActive(ctx context.Context) (*SemesterConfig, error) {
	const q = `
        SELECT id, semester, start_date, end_date, is_active, created_at, updated_at
        FROM semester_config
        WHERE is_active = true
        LIMIT 1`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var s SemesterConfig
	err := m.DB.QueryRowContext(ctx, q).Scan(
		&s.ID, &s.Semester, &s.StartDate, &s.EndDate, &s.IsActive, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}
	return &s, nil
}
