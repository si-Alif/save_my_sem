package main

import (
	"context"
	"database/sql"
	"flag"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"rescmysem.student.net/internal/data"
	"rescmysem.student.net/internal/mailer"
)


var (
	version = "1.0.0"
)

type config struct {
	port int
	env  string
	db   struct {
		dsn          string
		maxOpenConns int
		maxIdleConns int
		maxIdleTime  time.Duration
	}
	limiter struct{
		rps float64
		burst int
		enabled bool
	}
	smtp struct{
		host string
		port int
		username string
		password string
		sender string
	}
	cors struct{
		allowedOrigins []string
	}
}

type application struct {
	config config
	logger *slog.Logger
	models data.Models
	wg sync.WaitGroup
	mailer *mailer.Mailer
}

func main() {

	var cfg config

	flag.IntVar(&cfg.port, "port", 4000, "API server port")
	flag.StringVar(&cfg.env, "env", "development", "Environment (development | production | test)")

	// DB connection pool settings
	flag.StringVar(&cfg.db.dsn, "db-dsn", "", "PostgreSQL data source name")
	flag.IntVar(&cfg.db.maxOpenConns, "db-max-open-conns", 25, "PostgreSQL max open connections")
	flag.IntVar(&cfg.db.maxIdleConns, "db-max-idle-conns", 25, "PostgreSQL max idle connections")
	flag.DurationVar(&cfg.db.maxIdleTime, "db-max-idle-time", 15*time.Minute, "PostgreSQL max idle time for a connection")

		// rate limiter settings
	flag.Float64Var(&cfg.limiter.rps, "limiter-rps", 2, "Rate limiter maximum requests per second")
	flag.IntVar(&cfg.limiter.burst, "limiter-burst", 4, "Rate limiter burst size")
	flag.BoolVar(&cfg.limiter.enabled, "limiter-enabled", true, "Enable rate limiter")

	// SMTP settings
	flag.StringVar(&cfg.smtp.host, "smtp-host", "sandbox.smtp.mailtrap.io", "SMTP server host")
	flag.IntVar(&cfg.smtp.port, "smtp-port", 2525, "SMTP server port")
	flag.StringVar(&cfg.smtp.username, "smtp-username", "174e3c217f3901", "SMTP server username")
	flag.StringVar(&cfg.smtp.password, "smtp-password", "7c72dadc7e8c16", "SMTP server password")
	flag.StringVar(&cfg.smtp.sender, "smtp-sender", "noreply@rescmysem.student.net", "Email address of the sender")

	// CORS settings
	flag.Func("cors-allowed-origins", "Trusted origins for CORS (space separated)", func(val string) error {
		cfg.cors.allowedOrigins = strings.Fields(val)
		return nil
	})


	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// open a database connection pool, verify connectivity, and handle any errors
	db, err := openDB(cfg)
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}
	defer db.Close()

	logger.Info("database connection pool established")

	models := data.NewModels(db)

	mailer , err := mailer.NewMailer(cfg.smtp.host , cfg.smtp.port , cfg.smtp.username , cfg.smtp.password , cfg.smtp.sender)
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}


	app := &application{
		config: cfg,
		logger: logger,
		models: models,
		mailer: mailer,
	}

	err = app.serve()
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

}



func openDB(cfg config) (*sql.DB, error) {
	db, err := sql.Open("pgx", cfg.db.dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(cfg.db.maxOpenConns)
	db.SetMaxIdleConns(cfg.db.maxIdleConns)
	db.SetConnMaxIdleTime(cfg.db.maxIdleTime)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = db.PingContext(ctx)

	if err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}
