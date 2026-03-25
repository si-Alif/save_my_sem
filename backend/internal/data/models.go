package data

import (
	"database/sql"
	"errors"
)


var (
	ErrRecordNotFound  = errors.New("record not found")
	ErrEditConflict    = errors.New("edit conflict")
	ErrDuplicateRecord = errors.New("duplicate record")
	ErrInvalidSourceURL = errors.New("invalid source URL")
)


type Models struct {
	Users       UserModel
	Tokens TokenModel
}


func NewModels(db *sql.DB) Models {
	return Models{
		Users:       UserModel{DB: db},
		Tokens: TokenModel{DB: db},
	}
}
