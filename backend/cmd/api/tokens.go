package main

import (
	"errors"
	"net/http"
	"time"

	"rescmysem.student.net/internal/data"
	"rescmysem.student.net/internal/validator"
)

func (app *application) createAuthenticationTokenHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	data.ValidateEmail(v, input.Email)
	data.ValidatePasswordPlaintext(v, input.Password)

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetByEmail(input.Email)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.invalidCredentialResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	ok, err := user.Password.Matches(input.Password)
	if err != nil {
		app.invalidCredentialResponse(w, r)
		return

	}

	if !ok {
		app.invalidCredentialResponse(w, r)
		return
	}

	token, err := app.models.Tokens.New(user.ID, 24*time.Hour, data.ScopeAuthentication)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	authToken := struct {
		Token  string    `json:"token"`
		Expiry time.Time `json:"expiry"`
		UserID int64     `json:"user_id"`
	}{
		Token:  token.Plaintext,
		Expiry: token.Expiry,
		UserID: user.ID,
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{
		"authentication_token": authToken,
		"user":                 user,
	}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

}
