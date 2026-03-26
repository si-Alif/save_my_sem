package main

import (
	"context"
	"database/sql"
	"flag"
	"log"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"rescmysem.student.net/internal/data"
)

func main() {
	var dsn string
	flag.StringVar(&dsn, "db-dsn", "", "PostgreSQL DSN")
	flag.Parse()
	if dsn == "" {
		log.Fatal("missing -db-dsn")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	gen := data.SessionGenerator{DB: db}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	n, err := gen.GenerateSessions(ctx)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("generated %d sessions\n", n)
}
