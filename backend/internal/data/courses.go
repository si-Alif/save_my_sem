package data

import (
	"context"
	"database/sql"
	"time"
)

// Course represents a row in the courses catalog.
type Course struct {
	ID                  int64     `json:"id"`
	Code                string    `json:"code"`
	Name                string    `json:"name"`
	CreditHours         float64   `json:"credit_hours"`
	ContactHoursPerWeek float64   `json:"contact_hours_per_week"`
	CourseType          string    `json:"course_type"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type CourseModel struct {
	DB *sql.DB
}

// List returns all courses in the catalog ordered by code.
func (m CourseModel) List(ctx context.Context) ([]Course, error) {
	const q = `
        SELECT id, code, name, credit_hours, contact_hours_per_week, course_type, created_at, updated_at
        FROM courses
        ORDER BY code`

	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []Course
	for rows.Next() {
		var c Course
		if err := rows.Scan(&c.ID, &c.Code, &c.Name, &c.CreditHours, &c.ContactHoursPerWeek, &c.CourseType, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		courses = append(courses, c)
	}
	return courses, rows.Err()
}
