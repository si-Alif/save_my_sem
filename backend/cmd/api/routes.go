package main

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (app *application) routes() http.Handler {
	router := httprouter.New()

	// override httprouter's default plain-text error responses with JSON
	router.NotFound = http.HandlerFunc(app.notFoundResponse)
	router.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	router.HandlerFunc(http.MethodGet, "/v1/healthcheck", app.healthCheckHandler)

	// user routes
	router.HandlerFunc(http.MethodPost, "/v1/users", app.registerUserHandler)
	router.HandlerFunc(http.MethodPut, "/v1/users/activated", app.activateUserHandler)

	// token routes
	router.HandlerFunc(http.MethodPost, "/v1/tokens/authentication", app.createAuthenticationTokenHandler)

	// semester config routes
	router.HandlerFunc(http.MethodPost, "/v1/semesters/activate", app.activateSemesterHandler)
	router.HandlerFunc(http.MethodGet, "/v1/semesters/active", app.getActiveSemesterHandler)

	// course enrollment routes
	router.HandlerFunc(http.MethodPost, "/v1/courses/enroll", app.enrollUserInCourseHandler)
	router.HandlerFunc(http.MethodGet, "/v1/users/:id/courses", app.listUserCoursesHandler)
	router.HandlerFunc(http.MethodPut, "/v1/enrollments/:id", app.updateEnrollmentStatusHandler)

	// attendance routes
	router.HandlerFunc(http.MethodPost, "/v1/attendance", app.markAttendanceHandler)
	router.HandlerFunc(http.MethodGet, "/v1/users/:id/attendance", app.listUserAttendanceHandler)
	router.HandlerFunc(http.MethodGet, "/v1/users/:id/attendance/summary", app.getAttendanceSummaryHandler)

	// session routes
	router.HandlerFunc(http.MethodGet, "/v1/users/:id/sessions", app.listUserSessionsHandler)

	return app.recoverPanic(app.rateLimit(app.authenticate(router)))
}
