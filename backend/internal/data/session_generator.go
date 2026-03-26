package data

import (
	"context"
	"database/sql"
	"time"
)

type SessionGenerator struct {
	DB *sql.DB
}

type Rule struct {
	ID            int64
	CourseID      int64
	DayOfWeek     int
	StartTime     time.Time
	EndTime       time.Time
	Location      string
	EffectiveFrom time.Time
	EffectiveTo   time.Time
}

type SemesterWindow struct {
	Semester  string
	StartDate time.Time
	EndDate   time.Time
}

// GenerateSessions builds class_sessions for all active rules within the active semester.
func (g *SessionGenerator) GenerateSessions(ctx context.Context) (int64, error) {
	sem, err := g.activeSemester(ctx)
	if err != nil {
		return 0, err
	}

	rules, err := g.activeRules(ctx, sem.StartDate, sem.EndDate)
	if err != nil {
		return 0, err
	}

	enrollments, err := g.activeEnrollments(ctx)
	if err != nil {
		return 0, err
	}

	var inserted int64
	for _, r := range rules {
		ruleStart := maxDate(r.EffectiveFrom, sem.StartDate)
		ruleEnd := minDate(r.EffectiveTo, sem.EndDate)
		for d := ruleStart; !d.After(ruleEnd); d = d.AddDate(0, 0, 1) {
			if int(d.Weekday()) == (r.DayOfWeek+1)%7 { // schema: 0=Mon; Go: Sun=0, Mon=1
				if isWeekend(d) { // MVP: skip weekends
					continue
				}
				for _, uc := range enrollments[r.CourseID] {
					rows, err := g.insertSession(ctx, uc.UserCourseID, uc.CourseID, d, r.StartTime, r.EndTime, r.Location)
					if err != nil {
						return inserted, err
					}
					inserted += rows
				}
			}
		}
	}
	return inserted, nil
}

type enrollment struct {
	UserCourseID int64
	CourseID     int64
}

func (g *SessionGenerator) activeSemester(ctx context.Context) (*SemesterWindow, error) {
	const q = `
        SELECT semester, start_date, end_date
        FROM semester_config
        WHERE is_active = true
        LIMIT 1`
	var s SemesterWindow
	if err := g.DB.QueryRowContext(ctx, q).Scan(&s.Semester, &s.StartDate, &s.EndDate); err != nil {
		return nil, err
	}
	return &s, nil
}

func (g *SessionGenerator) activeRules(ctx context.Context, semStart, semEnd time.Time) ([]Rule, error) {
	const q = `
        SELECT id, course_id, day_of_week, start_time, end_time, location, effective_from, effective_to
        FROM course_schedule_rules
        WHERE archived_at IS NULL
          AND effective_to >= $1
          AND effective_from <= $2`
	rows, err := g.DB.QueryContext(ctx, q, semStart, semEnd)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Rule
	for rows.Next() {
		var r Rule
		if err := rows.Scan(&r.ID, &r.CourseID, &r.DayOfWeek, &r.StartTime, &r.EndTime, &r.Location, &r.EffectiveFrom, &r.EffectiveTo); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (g *SessionGenerator) activeEnrollments(ctx context.Context) (map[int64][]enrollment, error) {
	const q = `
        SELECT id, course_id
        FROM user_courses
        WHERE status = 'active'`
	rows, err := g.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[int64][]enrollment)
	for rows.Next() {
		var e enrollment
		if err := rows.Scan(&e.UserCourseID, &e.CourseID); err != nil {
			return nil, err
		}
		out[e.CourseID] = append(out[e.CourseID], e)
	}
	return out, rows.Err()
}

// insertSession is idempotent: ON CONFLICT DO NOTHING on (user_courses_id, session_date)
func (g *SessionGenerator) insertSession(ctx context.Context, userCourseID, courseID int64, d time.Time, start, end time.Time, location string) (int64, error) {
	const q = `
        INSERT INTO class_sessions (user_courses_id, course_id, session_date, start_time, end_time, location)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_courses_id, session_date) DO NOTHING`
	result, err := g.DB.ExecContext(ctx, q, userCourseID, courseID, d, start, end, location)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func maxDate(a, b time.Time) time.Time {
	if a.After(b) {
		return a
	}
	return b
}

func minDate(a, b time.Time) time.Time {
	if a.Before(b) {
		return a
	}
	return b
}

func isWeekend(d time.Time) bool {
	wd := d.Weekday()
	return wd == time.Thursday || wd == time.Friday
}
