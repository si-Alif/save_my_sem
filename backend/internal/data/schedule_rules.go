package data

import (
	"context"
	"database/sql"
	"time"
)

type ScheduleRule struct {
	ID            int64      `json:"id"`
	CourseID      int64      `json:"course_id"`
	DayOfWeek     int        `json:"day_of_week"` // 0=Mon..6=Sun
	StartTime     time.Time  `json:"start_time"`
	EndTime       time.Time  `json:"end_time"`
	Location      string     `json:"location"`
	EffectiveFrom time.Time  `json:"effective_from"`
	EffectiveTo   time.Time  `json:"effective_to"`
	ArchivedAt    *time.Time `json:"archived_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	Version       int        `json:"-"`
}

type ScheduleRuleModel struct {
	DB *sql.DB
}

func (m ScheduleRuleModel) Insert(ctx context.Context, r *ScheduleRule) error {
	const q = `
        INSERT INTO course_schedule_rules (course_id, day_of_week, start_time, end_time, location, effective_from, effective_to)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, archived_at, created_at, updated_at, version`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return m.DB.QueryRowContext(ctx, q,
		r.CourseID, r.DayOfWeek, r.StartTime, r.EndTime, r.Location, r.EffectiveFrom, r.EffectiveTo,
	).Scan(&r.ID, &r.ArchivedAt, &r.CreatedAt, &r.UpdatedAt, &r.Version)
}
