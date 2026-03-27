package main

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"rescmysem.student.net/internal/data"
	"rescmysem.student.net/internal/validator"
)

// listUserSessionsHandler lists sessions for the user's active-semester enrollments with optional filters.
// GET /v1/users/:id/sessions
func (app *application) listUserSessionsHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := app.readIDParam(r)
	if err != nil {
		app.invalidIDResponse(w, r)
		return
	}

	qs := r.URL.Query()
	v := validator.New()

	// pagination + sorting
	filters := data.Filters{
		Page:         app.readInt(qs, "page", 1, v),
		PageSize:     app.readInt(qs, "page_size", 20, v),
		Sort:         app.readString(qs, "sort", "-session_date"),
		SortSafeList: []string{"session_date", "-session_date", "start_time", "-start_time", "created_at", "-created_at"},
	}

	// date filters
	var (
		from *time.Time
		to   *time.Time
		on   *time.Time
	)

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

	on, err = parseDate("on")
	if err != nil {
		v.AddError("on", "must be in format YYYY-MM-DD")
	}
	from, err = parseDate("from")
	if err != nil {
		v.AddError("from", "must be in format YYYY-MM-DD")
	}
	to, err = parseDate("to")
	if err != nil {
		v.AddError("to", "must be in format YYYY-MM-DD")
	}
	if on != nil && (from != nil || to != nil) {
		v.AddError("on", "cannot combine on with from/to")
	}

	var status *string
	if s := qs.Get("status"); s != "" {
		status = &s
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	data.ValidateFilters(v, filters)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	ctx := r.Context()

	// active semester courses
	semester, err := app.models.SemesterConfigs.GetActive(ctx)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.badRequestResponse(w, r, errors.New("no active semester configured"))
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	enrollments, err := app.models.UserCourses.ListByUser(ctx, userID, semester.Semester)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	if len(enrollments) == 0 {
		err = app.writeJSON(w, http.StatusOK, envelope{"sessions": []data.ClassSession{}, "metadata": data.Metadata{}}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	courseIDs := make([]int64, 0, len(enrollments))
	allowed := make(map[int64]struct{}, len(enrollments))
	for _, uc := range enrollments {
		courseIDs = append(courseIDs, uc.CourseID)
		allowed[uc.CourseID] = struct{}{}
	}

	if courseParam := qs.Get("course_id"); courseParam != "" {
		cid, err := strconv.ParseInt(courseParam, 10, 64)
		if err != nil || cid < 1 {
			v.AddError("course_id", "must be a positive integer")
		} else {
			if _, ok := allowed[cid]; !ok {
				v.AddError("course_id", "user is not enrolled in this course for the active semester")
			} else {
				courseIDs = []int64{cid}
			}
		}
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	sessions, metadata, err := app.models.ClassSessions.List(ctx, courseIDs, status, from, to, on, filters)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"sessions": sessions, "metadata": metadata}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
