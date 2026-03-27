package main

import (
	"errors"
	"net/http"
	"time"

	"rescmysem.student.net/internal/data"
	"rescmysem.student.net/internal/validator"
)

// activateSemesterHandler sets a semester as active.
// POST /v1/semesters/activate
func (app *application) activateSemesterHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Semester  string    `json:"semester"`
		StartDate time.Time `json:"start_date"`
		EndDate   time.Time `json:"end_date"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	if input.Semester == "" {
		v.AddError("semester", "must not be empty")
	}
	if input.StartDate.IsZero() {
		v.AddError("start_date", "must not be empty")
	}
	if input.EndDate.IsZero() {
		v.AddError("end_date", "must not be empty")
	}
	if !input.StartDate.IsZero() && !input.EndDate.IsZero() && input.StartDate.After(input.EndDate) {
		v.AddError("end_date", "must be after start_date")
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	ctx := r.Context()
	err = app.models.SemesterConfigs.UpsertActive(ctx, input.Semester, input.StartDate, input.EndDate)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{
		"message":  "semester activated successfully",
		"semester": input.Semester,
	}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// getActiveSemesterHandler retrieves the currently active semester.
// GET /v1/semesters/active
func (app *application) getActiveSemesterHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	semester, err := app.models.SemesterConfigs.GetActive(ctx)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"semester": semester}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
