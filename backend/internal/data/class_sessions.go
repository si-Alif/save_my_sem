package data

import (
	"context"
	"database/sql"
	"strconv"
	"strings"
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

// List returns sessions filtered by courses/date range with pagination and sorting.
func (m ClassSessionModel) List(ctx context.Context, courseIDs []int64, status *string, from, to, on *time.Time, filters Filters) ([]ClassSession, Metadata, error) {
	where := "WHERE 1=1"
	args := []any{}

	add := func(cond string, val any) {
		args = append(args, val)
		where += " AND " + cond
	}
	nextParam := func() string {
		return "$" + strconv.Itoa(len(args)+1)
	}

	if len(courseIDs) > 0 {
		placeholders := make([]string, len(courseIDs))
		for i, id := range courseIDs {
			placeholders[i] = nextParam()
			args = append(args, id)
		}
		where += " AND course_id IN (" + strings.Join(placeholders, ",") + ")"
	}
	if status != nil {
		add("status = "+nextParam(), *status)
	}
	if on != nil {
		add("session_date = "+nextParam(), *on)
	} else {
		if from != nil {
			add("session_date >= "+nextParam(), *from)
		}
		if to != nil {
			add("session_date <= "+nextParam(), *to)
		}
	}

	countQ := "SELECT count(*) FROM class_sessions " + where
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var total int
	if err := m.DB.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, Metadata{}, err
	}

	q := `
        SELECT id, course_id, session_date, start_time, end_time, location,
               status, cancelled_reason, rescheduled_to_session_id, created_at, updated_at
        FROM class_sessions ` + where + `
        ORDER BY ` + filters.SortColumn() + " " + filters.SortDirection() + `, id ASC
	LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2)

	args = append(args, filters.Limit(), filters.Offset())
	rows, err := m.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, Metadata{}, err
	}
	defer rows.Close()

	var sessions []ClassSession
	for rows.Next() {
		var cs ClassSession
		if err := rows.Scan(
			&cs.ID, &cs.CourseID, &cs.SessionDate, &cs.StartTime, &cs.EndTime, &cs.Location,
			&cs.Status, &cs.CancelledReason, &cs.RescheduledToSessionID, &cs.CreatedAt, &cs.UpdatedAt,
		); err != nil {
			return nil, Metadata{}, err
		}
		sessions = append(sessions, cs)
	}

	return sessions, CalculateMetadata(total, filters.Page, filters.PageSize), rows.Err()
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
