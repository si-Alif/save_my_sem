package main

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"rescmysem.student.net/internal/data"
	"rescmysem.student.net/internal/validator"
)

// markAttendanceHandler marks attendance for a user in a class session.
// POST /v1/attendance
func (app *application) markAttendanceHandler(w http.ResponseWriter, r *http.Request) {
	authUser := app.GetUserFromSubsequentRequestContext(r)
	if authUser.IsAnonymous() {
		app.AuthenticationRequiredResponse(w, r)
		return
	}

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
	} else if input.UserID != authUser.ID {
		v.AddError("user_id", "must match the authenticated user")
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

	markedByUserID := authUser.ID

	al := &data.AttendanceLog{
		UserID:         input.UserID,
		ClassSessionID: input.ClassSessionID,
		Status:         input.Status,
		Note:           input.Note,
		MarkedByUserID: &markedByUserID,
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

// listUserAttendanceHandler lists attendance records for a user with optional course/date filters.
// GET /v1/users/:id/attendance
func (app *application) listUserAttendanceHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := app.readIDParam(r)
	if err != nil {
		app.invalidIDResponse(w, r)
		return
	}

	qs := r.URL.Query()
	v := validator.New()

	filters := data.Filters{
		Page:         app.readInt(qs, "page", 1, v),
		PageSize:     app.readInt(qs, "page_size", 20, v),
		Sort:         app.readString(qs, "sort", "-marked_at"),
		SortSafeList: []string{"marked_at", "-marked_at", "created_at", "-created_at", "session_date", "-session_date"},
	}

	var courseID *int64
	if cid := qs.Get("course_id"); cid != "" {
		parsed, err := strconv.ParseInt(cid, 10, 64)
		if err != nil || parsed < 1 {
			v.AddError("course_id", "must be a positive integer")
		} else {
			courseID = &parsed
		}
	}

	parseDate := func(key string) (*time.Time, error) {
		if qs.Get(key) == "" {
			return nil, nil
		}
		t, err := time.Parse("2006-01-02", qs.Get(key))
		if err != nil {
			return nil, err
		}
		return &t, nil
	}

	from, err := parseDate("from")
	if err != nil {
		v.AddError("from", "must be in format YYYY-MM-DD")
	}
	to, err := parseDate("to")
	if err != nil {
		v.AddError("to", "must be in format YYYY-MM-DD")
	}

	data.ValidateFilters(v, filters)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	ctx := r.Context()
	attendance, metadata, err := app.models.AttendanceLogs.ListByUserFiltered(ctx, userID, courseID, from, to, filters)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if attendance == nil {
		attendance = []data.AttendanceLog{}
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"attendance": attendance, "metadata": metadata}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// getAttendanceSummaryHandler returns counts, percentage, and marks for a user's attendance.
// GET /v1/users/:id/attendance/summary
func (app *application) getAttendanceSummaryHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := app.readIDParam(r)
	if err != nil {
		app.invalidIDResponse(w, r)
		return
	}

	qs := r.URL.Query()
	v := validator.New()

	var courseID *int64
	if cid := qs.Get("course_id"); cid != "" {
		parsed, err := strconv.ParseInt(cid, 10, 64)
		if err != nil || parsed < 1 {
			v.AddError("course_id", "must be a positive integer")
		} else {
			courseID = &parsed
		}
	}

	parseDate := func(key string) (*time.Time, error) {
		if qs.Get(key) == "" {
			return nil, nil
		}
		t, err := time.Parse("2006-01-02", qs.Get(key))
		if err != nil {
			return nil, err
		}
		return &t, nil
	}

	from, err := parseDate("from")
	if err != nil {
		v.AddError("from", "must be in format YYYY-MM-DD")
	}
	to, err := parseDate("to")
	if err != nil {
		v.AddError("to", "must be in format YYYY-MM-DD")
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	ctx := r.Context()
	summary, err := app.models.AttendanceLogs.Summary(ctx, userID, courseID, from, to)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	attended := summary.Present + summary.Late + summary.Excused
	percentage := 0.0
	if summary.TotalSessions > 0 {
		percentage = (float64(attended) / float64(summary.TotalSessions)) * 100
	}

	mark := attendanceMark(percentage)

	err = app.writeJSON(w, http.StatusOK, envelope{
		"summary":               summary,
		"attended_sessions":     attended,
		"attendance_percentage": percentage,
		"attendance_mark":       mark,
	}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func attendanceMark(percentage float64) int {
	switch {
	case percentage >= 90:
		return 10
	case percentage >= 85:
		return 9
	case percentage >= 80:
		return 8
	case percentage >= 75:
		return 7
	case percentage >= 70:
		return 6
	case percentage >= 65:
		return 5
	case percentage >= 60:
		return 4
	default:
		return 0
	}
}
