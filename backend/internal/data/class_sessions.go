package data

import (
	"context"
	"database/sql"
	"time"
)

type ClassSession struct {
	ID                     int64     `json:"id"`
	CourseID               int64     `json:"course_id"`
	SessionDate            time.Time `json:"session_date"`
	StartTime              time.Time `json:"start_time"`
	EndTime                time.Time `json:"end_time"`
	Location               string    `json:"location"`
	Status                 string    `json:"status"`
	CancelledReason        *string   `json:"cancelled_reason,omitempty"`
	RescheduledToSessionID *int64    `json:"rescheduled_to_session_id,omitempty"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

type ClassSessionModel struct {
	DB *sql.DB
}

func (m ClassSessionModel) Get(ctx context.Context, id int64) (*ClassSession, error) {
	const q = `
        SELECT id, course_id, session_date, start_time, end_time, location,
               status, cancelled_reason, rescheduled_to_session_id, created_at, updated_at
        FROM class_sessions
        WHERE id = $1`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var cs ClassSession
	err := m.DB.QueryRowContext(ctx, q, id).Scan(
		&cs.ID, &cs.CourseID, &cs.SessionDate, &cs.StartTime, &cs.EndTime, &cs.Location,
		&cs.Status, &cs.CancelledReason, &cs.RescheduledToSessionID, &cs.CreatedAt, &cs.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}
	return &cs, nil
}
