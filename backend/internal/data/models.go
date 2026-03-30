package data

import (
	"database/sql"
	"errors"
)

var (
	ErrRecordNotFound   = errors.New("record not found")
	ErrEditConflict     = errors.New("edit conflict")
	ErrDuplicateRecord  = errors.New("duplicate record")
	ErrInvalidSourceURL = errors.New("invalid source URL")
)

type Models struct {
	Users           UserModel
	Tokens          TokenModel
	Courses         CourseModel
	SemesterConfigs SemesterConfigModel
	UserCourses     UserCourseModel
	ScheduleRules   ScheduleRuleModel
	ClassSessions   ClassSessionModel
	AttendanceLogs  AttendanceLogModel
}

func NewModels(db *sql.DB) Models {
	return Models{
		Users:           UserModel{DB: db},
		Tokens:          TokenModel{DB: db},
		Courses:         CourseModel{DB: db},
		SemesterConfigs: SemesterConfigModel{DB: db},
		UserCourses:     UserCourseModel{DB: db},
		ScheduleRules:   ScheduleRuleModel{DB: db},
		ClassSessions:   ClassSessionModel{DB: db},
		AttendanceLogs:  AttendanceLogModel{DB: db},
	}
}
