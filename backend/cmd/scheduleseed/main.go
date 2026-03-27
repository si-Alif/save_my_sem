package main

import (
	"bufio"
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type row struct {
	CourseCode    string
	DayOfWeek     int
	StartTime     string
	EndTime       string
	Location      string
	EffectiveFrom string
	EffectiveTo   string
}

func readTSV(path string) ([]row, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	s := bufio.NewScanner(f)
	s.Buffer(make([]byte, 0, 1024*1024), 10*1024*1024)
	var out []row
	line := 0

	for s.Scan() {
		line++
		if line == 1 {
			continue // header
		}

		parts := strings.Split(s.Text(), "\t")
		if len(parts) < 7 {
			return nil, fmt.Errorf("line %d: expected 7 columns, got %d", line, len(parts))
		}

		d, err := strconv.Atoi(strings.TrimSpace(parts[1]))
		if err != nil {
			return nil, fmt.Errorf("line %d: invalid day_of_week: %v", line, err)
		}

		out = append(out, row{
			CourseCode:    strings.TrimSpace(parts[0]),
			DayOfWeek:     d,
			StartTime:     strings.TrimSpace(parts[2]),
			EndTime:       strings.TrimSpace(parts[3]),
			Location:      strings.TrimSpace(parts[4]),
			EffectiveFrom: strings.TrimSpace(parts[5]),
			EffectiveTo:   strings.TrimSpace(parts[6]),
		})
	}

	if err := s.Err(); err != nil {
		return nil, err
	}

	return out, nil
}

func lookupCourseID(ctx context.Context, db *sql.DB, code string) (int64, error) {
	const q = `SELECT id FROM courses WHERE code = $1`
	var id int64
	if err := db.QueryRowContext(ctx, q, code).Scan(&id); err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("course code not found: %s", code)
		}
		return 0, err
	}
	return id, nil
}

func nullIfEmpty(s string) any {
	if s == "" || strings.ToUpper(s) == "TBD" {
		return nil
	}
	return s
}

func seedRules(ctx context.Context, db *sql.DB, rows []row) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var inserted int64
	for i, r := range rows {
		courseID, err := lookupCourseID(ctx, db, r.CourseCode)
		if err != nil {
			return inserted, fmt.Errorf("row %d (%s): %w", i+2, r.CourseCode, err)
		}

		const q = `
			INSERT INTO course_schedule_rules (course_id, day_of_week, start_time, end_time, location, effective_from, effective_to)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT DO NOTHING`

		res, err := db.ExecContext(ctx, q,
			courseID,
			r.DayOfWeek,
			r.StartTime,
			r.EndTime,
			nullIfEmpty(r.Location),
			r.EffectiveFrom,
			r.EffectiveTo,
		)
		if err != nil {
			return inserted, fmt.Errorf("row %d (%s): %w", i+2, r.CourseCode, err)
		}

		n, _ := res.RowsAffected()
		inserted += n
	}

	return inserted, nil
}

func main() {
	var dsn, file string
	flag.StringVar(&dsn, "db-dsn", "", "PostgreSQL DSN")
	flag.StringVar(&file, "file", "", "Path to TSV schedule file")
	flag.Parse()

	if dsn == "" || file == "" {
		log.Fatal("missing -db-dsn or -file")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := readTSV(file)
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	inserted, err := seedRules(ctx, db, rows)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("seeded %d schedule rules\n", inserted)
}
