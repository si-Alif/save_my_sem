package data

import (
	"context"
	"database/sql"
	"strconv"
	"time"
)

type AttendanceLog struct {
	ID             int64     `json:"id"`
	UserID         int64     `json:"user_id"`
	ClassSessionID int64     `json:"class_session_id"`
	Status         string    `json:"status"`
	MarkedAt       time.Time `json:"marked_at"`
	MarkedByUserID *int64    `json:"marked_by_user_id,omitempty"`
	Note           *string   `json:"note,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type AttendanceLogModel struct {
	DB *sql.DB
}

// Summary aggregates attendance counts for a user (optionally per course/date window).
type AttendanceSummary struct {
	Present       int `json:"present"`
	Absent        int `json:"absent"`
	Late          int `json:"late"`
	Excused       int `json:"excused"`
	TotalSessions int `json:"total_sessions"`
}

// Upsert: insert or update status/note for a given user + session.
func (m AttendanceLogModel) Upsert(ctx context.Context, al *AttendanceLog) error {
	const q = `
        INSERT INTO attendance_logs (user_id, class_session_id, status, marked_by_user_id, note)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, class_session_id)
        DO UPDATE SET status = EXCLUDED.status,
                      marked_by_user_id = EXCLUDED.marked_by_user_id,
                      note = EXCLUDED.note,
                      updated_at = now()
        RETURNING id, marked_at, created_at, updated_at`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return m.DB.QueryRowContext(ctx, q,
		al.UserID, al.ClassSessionID, al.Status, al.MarkedByUserID, al.Note,
	).Scan(&al.ID, &al.MarkedAt, &al.CreatedAt, &al.UpdatedAt)
}

// ListByUser retrieves all attendance records for a specific user.
func (m AttendanceLogModel) ListByUser(ctx context.Context, userID int64) ([]AttendanceLog, error) {
	const q = `
        SELECT id, user_id, class_session_id, status, marked_at, marked_by_user_id, note, created_at, updated_at
        FROM attendance_logs
        WHERE user_id = $1
        ORDER BY created_at DESC`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	rows, err := m.DB.QueryContext(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AttendanceLog
	for rows.Next() {
		var al AttendanceLog
		if err := rows.Scan(
			&al.ID, &al.UserID, &al.ClassSessionID, &al.Status, &al.MarkedAt, &al.MarkedByUserID, &al.Note,
			&al.CreatedAt, &al.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, al)
	}
	return out, rows.Err()
}

// ListByUserFiltered supports optional course/date filters with pagination.
func (m AttendanceLogModel) ListByUserFiltered(ctx context.Context, userID int64, courseID *int64, from, to *time.Time, filters Filters) ([]AttendanceLog, Metadata, error) {
	where := "WHERE al.user_id = $1"
	args := []any{userID}
	nextParam := func() string { return "$" + strconv.Itoa(len(args)+1) }

	if courseID != nil {
		args = append(args, *courseID)
		where += " AND cs.course_id = " + nextParam()
	}
	if from != nil {
		args = append(args, *from)
		where += " AND cs.session_date >= " + nextParam()
	}
	if to != nil {
		args = append(args, *to)
		where += " AND cs.session_date <= " + nextParam()
	}

	countQ := "SELECT count(*) FROM attendance_logs al JOIN class_sessions cs ON cs.id = al.class_session_id " + where
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var total int
	if err := m.DB.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, Metadata{}, err
	}

	q := `
        SELECT al.id, al.user_id, al.class_session_id, al.status, al.marked_at,
               al.marked_by_user_id, al.note, al.created_at, al.updated_at
        FROM attendance_logs al
        JOIN class_sessions cs ON cs.id = al.class_session_id
        ` + where + `
        ORDER BY al.marked_at DESC, al.id DESC
        LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2)

	args = append(args, filters.Limit(), filters.Offset())
	rows, err := m.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, Metadata{}, err
	}
	defer rows.Close()

	var out []AttendanceLog
	for rows.Next() {
		var al AttendanceLog
		if err := rows.Scan(
			&al.ID, &al.UserID, &al.ClassSessionID, &al.Status, &al.MarkedAt,
			&al.MarkedByUserID, &al.Note, &al.CreatedAt, &al.UpdatedAt,
		); err != nil {
			return nil, Metadata{}, err
		}
		out = append(out, al)
	}

	return out, CalculateMetadata(total, filters.Page, filters.PageSize), rows.Err()
}

// Summary aggregates attendance counts and total sessions for a user, with optional course/date filters.
func (m AttendanceLogModel) Summary(ctx context.Context, userID int64, courseID *int64, from, to *time.Time) (AttendanceSummary, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	where := "WHERE cs.session_date IS NOT NULL"
	args := []any{}
	nextParam := func() string { return "$" + strconv.Itoa(len(args)+1) }

	// total sessions (all sessions matching filters, independent of attendance status)
	if courseID != nil {
		args = append(args, *courseID)
		where += " AND cs.course_id = " + nextParam()
	}
	if from != nil {
		args = append(args, *from)
		where += " AND cs.session_date >= " + nextParam()
	}
	if to != nil {
		args = append(args, *to)
		where += " AND cs.session_date <= " + nextParam()
	}

	var summary AttendanceSummary
	countSessionsQ := "SELECT count(*) FROM class_sessions cs " + where
	if err := m.DB.QueryRowContext(ctx, countSessionsQ, args...).Scan(&summary.TotalSessions); err != nil {
		return summary, err
	}

	// attendance counts for the user over the same filtered sessions
	where = "WHERE al.user_id = $1"
	attArgs := []any{userID}
	nextAtt := func() string { return "$" + strconv.Itoa(len(attArgs)+1) }

	if courseID != nil {
		attArgs = append(attArgs, *courseID)
		where += " AND cs.course_id = " + nextAtt()
	}
	if from != nil {
		attArgs = append(attArgs, *from)
		where += " AND cs.session_date >= " + nextAtt()
	}
	if to != nil {
		attArgs = append(attArgs, *to)
		where += " AND cs.session_date <= " + nextAtt()
	}

	countsQ := `
        SELECT
          COUNT(*) FILTER (WHERE al.status = 'present') AS present,
          COUNT(*) FILTER (WHERE al.status = 'absent')  AS absent,
          COUNT(*) FILTER (WHERE al.status = 'late')    AS late,
          COUNT(*) FILTER (WHERE al.status = 'excused') AS excused
        FROM attendance_logs al
        JOIN class_sessions cs ON cs.id = al.class_session_id
        ` + where

	if err := m.DB.QueryRowContext(ctx, countsQ, attArgs...).Scan(&summary.Present, &summary.Absent, &summary.Late, &summary.Excused); err != nil {
		return summary, err
	}

	return summary, nil
}
