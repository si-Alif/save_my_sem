package data

import (
	"context"
	"database/sql"
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
