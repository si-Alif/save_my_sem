package data

import (
	"context"
	"database/sql"
	"time"
)

type UserCourse struct {
	ID             int64     `json:"id"`
	UserID         int64     `json:"user_id"`
	CourseID       int64     `json:"course_id"`
	Semester       string    `json:"semester"`
	Section        string    `json:"section"`
	Status         string    `json:"status"`
	Grade          *string   `json:"grade,omitempty"`
	EnrollmentDate time.Time `json:"enrollment_date"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Version        int       `json:"-"`
}

type UserCourseModel struct {
	DB *sql.DB
}

// LookupCourseIDByCode resolves a course code to its ID.
func (m UserCourseModel) LookupCourseIDByCode(ctx context.Context, code string) (int64, error) {
	const q = `SELECT id FROM courses WHERE code = $1`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var id int64
	if err := m.DB.QueryRowContext(ctx, q, code).Scan(&id); err != nil {
		if err == sql.ErrNoRows {
			return 0, ErrRecordNotFound
		}
		return 0, err
	}
	return id, nil
}

func (m UserCourseModel) Insert(ctx context.Context, uc *UserCourse) error {
	const q = `
        INSERT INTO user_courses (user_id, course_id, semester, section, status, grade)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, enrollment_date, created_at, updated_at, version`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return m.DB.QueryRowContext(ctx, q,
		uc.UserID, uc.CourseID, uc.Semester, uc.Section, uc.Status, uc.Grade,
	).Scan(&uc.ID, &uc.EnrollmentDate, &uc.CreatedAt, &uc.UpdatedAt, &uc.Version)
}

func (m UserCourseModel) ListByUser(ctx context.Context, userID int64, semester string) ([]UserCourse, error) {
	const q = `
        SELECT id, user_id, course_id, semester, section, status, grade,
               enrollment_date, created_at, updated_at, version
        FROM user_courses
        WHERE user_id = $1 AND semester = $2 AND status = 'active'
        ORDER BY course_id`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	rows, err := m.DB.QueryContext(ctx, q, userID, semester)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserCourse
	for rows.Next() {
		var uc UserCourse
		if err := rows.Scan(
			&uc.ID, &uc.UserID, &uc.CourseID, &uc.Semester, &uc.Section, &uc.Status, &uc.Grade,
			&uc.EnrollmentDate, &uc.CreatedAt, &uc.UpdatedAt, &uc.Version,
		); err != nil {
			return nil, err
		}
		out = append(out, uc)
	}
	return out, rows.Err()
}

// GetByID retrieves a single user course enrollment by ID.
func (m UserCourseModel) GetByID(ctx context.Context, id int64) (*UserCourse, error) {
	const q = `
        SELECT id, user_id, course_id, semester, section, status, grade,
               enrollment_date, created_at, updated_at, version
        FROM user_courses
        WHERE id = $1`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var uc UserCourse
	err := m.DB.QueryRowContext(ctx, q, id).Scan(
		&uc.ID, &uc.UserID, &uc.CourseID, &uc.Semester, &uc.Section, &uc.Status, &uc.Grade,
		&uc.EnrollmentDate, &uc.CreatedAt, &uc.UpdatedAt, &uc.Version,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}
	return &uc, nil
}

// Update changes the status and/or grade of an enrollment.
func (m UserCourseModel) Update(ctx context.Context, uc *UserCourse) error {
	const q = `
        UPDATE user_courses
        SET status = $2, grade = $3, updated_at = now()
        WHERE id = $1
        RETURNING version`
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return m.DB.QueryRowContext(ctx, q, uc.ID, uc.Status, uc.Grade).Scan(&uc.Version)
}
