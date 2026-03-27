package main

import (
	"net/http"

	"rescmysem.student.net/internal/data"
	"rescmysem.student.net/internal/validator"
)

// markAttendanceHandler marks attendance for a user in a class session.
// POST /v1/attendance
func (app *application) markAttendanceHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		UserID         int64   `json:"user_id"`
		ClassSessionID int64   `json:"class_session_id"`
		Status         string  `json:"status"`
		Note           *string `json:"note"`
		MarkedByUserID *int64  `json:"marked_by_user_id"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	if input.UserID < 1 {
		v.AddError("user_id", "must be a positive integer")
	}
	if input.ClassSessionID < 1 {
		v.AddError("class_session_id", "must be a positive integer")
	}
	if input.Status == "" {
		v.AddError("status", "must not be empty")
	} else {
		v.Check(validator.PermittedValue(input.Status, "present", "absent", "late", "excused"),
			"status", "must be one of: present, absent, late, excused")
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	al := &data.AttendanceLog{
		UserID:         input.UserID,
		ClassSessionID: input.ClassSessionID,
		Status:         input.Status,
		Note:           input.Note,
		MarkedByUserID: input.MarkedByUserID,
	}

	ctx := r.Context()
	err = app.models.AttendanceLogs.Upsert(ctx, al)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"attendance": al}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// listUserAttendanceHandler lists all attendance records for a user.
// GET /v1/users/:id/attendance
func (app *application) listUserAttendanceHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := app.readIDParam(r)
	if err != nil {
		app.invalidIDResponse(w, r)
		return
	}

	ctx := r.Context()
	attendance, err := app.models.AttendanceLogs.ListByUser(ctx, userID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if attendance == nil {
		attendance = []data.AttendanceLog{}
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"attendance": attendance}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
