package main

import (
	"errors"
	"net/http"

	"rescmysem.student.net/internal/data"
	"rescmysem.student.net/internal/validator"
)

// enrollUserInCourseHandler enrolls a user in a course.
// POST /v1/courses/enroll
func (app *application) enrollUserInCourseHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		UserID     int64  `json:"user_id"`
		CourseID   int64  `json:"course_id"`
		CourseCode string `json:"course_code"`
		Semester   string `json:"semester"`
		Section    string `json:"section"`
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
	if input.CourseID < 1 && input.CourseCode == "" {
		v.AddError("course", "provide course_id or course_code")
	}
	if input.CourseID < 1 && input.CourseCode != "" {
		// ok, will resolve by code
	}
	if input.CourseID > 0 && input.CourseCode != "" {
		// optional: allow both, but prefer ID; no validation error
	}
	if input.Semester == "" {
		v.AddError("semester", "must not be empty")
	}
	if input.Section == "" {
		v.AddError("section", "must not be empty")
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	ctx := r.Context()

	if input.CourseID < 1 {
		id, err := app.models.UserCourses.LookupCourseIDByCode(ctx, input.CourseCode)
		if err != nil {
			switch {
			case errors.Is(err, data.ErrRecordNotFound):
				v.AddError("course_code", "course not found")
				app.failedValidationResponse(w, r, v.Errors)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}
		input.CourseID = id
	}

	uc := &data.UserCourse{
		UserID:   input.UserID,
		CourseID: input.CourseID,
		Semester: input.Semester,
		Section:  input.Section,
		Status:   "active",
	}

	err = app.models.UserCourses.Insert(ctx, uc)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateRecord):
			v.AddError("enrollment", "user is already enrolled in this course for this semester")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"enrollment": uc}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// listUserCoursesHandler lists all courses enrolled by a user in a semester.
// GET /v1/users/:id/courses?semester=...
func (app *application) listUserCoursesHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := app.readIDParam(r)
	if err != nil {
		app.invalidIDResponse(w, r)
		return
	}

	semester := r.URL.Query().Get("semester")
	if semester == "" {
		app.badRequestResponse(w, r, errors.New("semester query parameter is required"))
		return
	}

	ctx := r.Context()
	courses, err := app.models.UserCourses.ListByUser(ctx, userID, semester)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if courses == nil {
		courses = []data.UserCourse{}
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"courses": courses}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// updateEnrollmentStatusHandler updates the status of a course enrollment.
// PUT /v1/enrollments/:id
func (app *application) updateEnrollmentStatusHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil {
		app.invalidIDResponse(w, r)
		return
	}

	ctx := r.Context()
	uc, err := app.models.UserCourses.GetByID(ctx, id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	var input struct {
		Status string  `json:"status"`
		Grade  *string `json:"grade"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	if input.Status != "" {
		v.Check(validator.PermittedValue(input.Status, "active", "dropped", "completed"),
			"status", "must be one of: active, dropped, completed")
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if input.Status != "" {
		uc.Status = input.Status
	}
	if input.Grade != nil {
		uc.Grade = input.Grade
	}

	err = app.models.UserCourses.Update(ctx, uc)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"enrollment": uc}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
