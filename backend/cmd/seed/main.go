package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type config struct {
	dbDSN    string
	seedFile string
}

func main() {
	var cfg config

	flag.StringVar(&cfg.dbDSN, "db-dsn", "", "PostgreSQL data source name")
	flag.StringVar(&cfg.seedFile, "seed-file", "./seed_courses.sql", "Path to SQL seed file")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	if cfg.dbDSN == "" {
		logger.Error("missing required -db-dsn flag")
		os.Exit(1)
	}

	seedSQL, err := os.ReadFile(cfg.seedFile)
	if err != nil {
		logger.Error("failed to read seed file", "file", cfg.seedFile, "error", err)
		os.Exit(1)
	}

	db, err := sql.Open("pgx", cfg.dbDSN)
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}

	result, err := db.ExecContext(ctx, string(seedSQL))
	if err != nil {
		logger.Error("failed to execute seed SQL", "error", err)
		os.Exit(1)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Info("seed completed")
		return
	}

	logger.Info(fmt.Sprintf("seed completed, rows affected: %d", rowsAffected))
}
