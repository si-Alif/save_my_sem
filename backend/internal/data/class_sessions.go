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
// If excludeMarkedForUserID is not nil, sessions already marked by that user are excluded.
func (m ClassSessionModel) List(ctx context.Context, courseIDs []int64, status *string, from, to, on *time.Time, filters Filters, excludeMarkedForUserID *int64) ([]ClassSession, Metadata, error) {
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

	if excludeMarkedForUserID != nil {
		where += " AND NOT EXISTS (SELECT 1 FROM attendance_logs al WHERE al.class_session_id = class_sessions.id AND al.user_id = " + nextParam() + ")"
		args = append(args, *excludeMarkedForUserID)
	}

	countQ := "SELECT count(*) FROM class_sessions " + where
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var total int
	if err := m.DB.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, Metadata{}, err
	}

	q := `
	        SELECT id, course_id, session_date, start_time::text, end_time::text, location,
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
		var startStr, endStr string
		if err := rows.Scan(
			&cs.ID, &cs.CourseID, &cs.SessionDate, &startStr, &endStr, &cs.Location,
			&cs.Status, &cs.CancelledReason, &cs.RescheduledToSessionID, &cs.CreatedAt, &cs.UpdatedAt,
		); err != nil {
			return nil, Metadata{}, err
		}
		st, err := parseSQLTime(startStr)
		if err != nil {
			return nil, Metadata{}, err
		}
		et, err := parseSQLTime(endStr)
		if err != nil {
			return nil, Metadata{}, err
		}
		cs.StartTime = st
		cs.EndTime = et
		sessions = append(sessions, cs)
	}

	return sessions, CalculateMetadata(total, filters.Page, filters.PageSize), rows.Err()
}

func (m ClassSessionModel) Get(ctx context.Context, id int64) (*ClassSession, error) {
	const q = `
	        SELECT id, course_id, session_date, start_time::text, end_time::text, location,
	               status, cancelled_reason, rescheduled_to_session_id, created_at, updated_at
	        FROM class_sessions
	        WHERE id = $1`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var cs ClassSession
	var startStr, endStr string
	err := m.DB.QueryRowContext(ctx, q, id).Scan(
		&cs.ID, &cs.CourseID, &cs.SessionDate, &startStr, &endStr, &cs.Location,
		&cs.Status, &cs.CancelledReason, &cs.RescheduledToSessionID, &cs.CreatedAt, &cs.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}
	if cs.StartTime, err = parseSQLTime(startStr); err != nil {
		return nil, err
	}
	if cs.EndTime, err = parseSQLTime(endStr); err != nil {
		return nil, err
	}
	return &cs, nil
}

// parseSQLTime parses a Postgres time string (with or without fractional seconds) into time.Time.
func parseSQLTime(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, nil
	}
	layouts := []string{"15:04:05", "15:04:05.999999", time.RFC3339}
	var lastErr error
	for _, layout := range layouts {
		t, err := time.Parse(layout, s)
		if err == nil {
			return t, nil
		}
		lastErr = err
	}
	return time.Time{}, lastErr
}
