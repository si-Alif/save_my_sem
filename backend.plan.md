## Plan: RescueMySemester Backend PRD (MVP, 1 Week)

Backend-only execution plan for a college submission where progress must be visible after each step. This PRD is intentionally milestone-driven so each completed block gives a clear sense of movement.

**Product Intent**
Build a reliable backend that supports:
1. User auth
2. Course management
3. Attendance tracking with risk computation
4. Deadline/task tracking
5. Extracurricular tracking
6. Dashboard summary and simple study recommendations

The backend must be fully testable locally and easy to integrate with a minimal React Native frontend.

**Delivery Style**
1. Backend-first
2. Deterministic logic only (no AI/ML)
3. Strictly minimal schema and routes
4. Every step ends with a done checklist and visible API output

---

**Scope**
Included:
1. Auth: register + login + bearer token middleware
2. Courses CRUD
3. Attendance logging and attendance summary math
4. Tasks CRUD with due-date urgency
5. Extracurricular CRUD
6. Dashboard summary endpoint
7. Study recommendation endpoint (rule-based)

Excluded for MVP:
1. Push notifications
2. Email reminders
3. File upload/resource hub
4. Advanced analytics charts
5. Calendar sync
6. Multi-user collaboration

---

**Data Model and Migration Plan (Sequential)**

Step M1: Extensions and helper functions
1. Create extensions needed by your existing pattern (for example citext)
2. Optional updated_at trigger helper if already used in your code style

Done when:
1. Migration up and down run successfully
2. Database has expected extension/function objects

Step M2: users table
Columns:
1. id
2. name
3. email unique case-insensitive
4. password_hash
5. activated
6. created_at
7. version
Indexes and constraints:
1. Unique email

Done when:
1. User row can be inserted manually
2. Duplicate email is rejected

Step M3: tokens table
Columns:
1. hash
2. user_id
3. expiry
4. scope
Constraints:
1. Foreign key user_id to users
2. Cascade delete with user

Done when:
1. Token insert works for existing user
2. Token query by hash returns owner user

Step M4: courses table
Columns:
1. id
2. user_id
3. name
4. code
5. credit_hours optional
6. difficulty_level optional
7. target_attendance_percent default 75
8. created_at
9. version
Constraints and indexes:
1. Foreign key user_id
2. Unique user_id + code
3. Index on user_id

Done when:
1. One user can create multiple courses
2. Same user cannot create duplicate code
3. Different users can use same code

Step M5: attendance_logs table
Columns:
1. id
2. user_id
3. course_id
4. class_date
5. status present or absent
6. created_at
Constraints and indexes:
1. Foreign key course_id and user_id
2. Unique course_id + class_date
3. Index on course_id and class_date

Done when:
1. Attendance for a date can be inserted once
2. Duplicate date for same course is blocked

Step M6: tasks table
Columns:
1. id
2. user_id
3. course_id nullable
4. title
5. description optional
6. due_at
7. priority low medium high
8. status pending completed
9. created_at
10. version
Indexes:
1. user_id + due_at
2. user_id + status

Done when:
1. Tasks can be inserted and filtered by status
2. Overdue tasks can be fetched by due date condition

Step M7: extracurricular_events table
Columns:
1. id
2. user_id
3. title
4. category optional
5. start_time
6. end_time
7. notes optional
8. created_at
Indexes:
1. user_id + start_time

Done when:
1. Events can be inserted and listed by week range

Migration acceptance rule:
1. Run full up on empty DB
2. Run full down
3. Run full up again
4. No failure allowed

---

**API Contract and Frontend Mapping**

Standard response envelope style:
1. Success returns a top-level object named by resource, or list plus metadata
2. Validation errors return errors map
3. Unauthorized returns authentication error message
4. Not found returns not found error message

Feature A: Authentication
Route A1
1. Method and path: POST /v1/users
2. Purpose: register user
3. Request body:
- name
- email
- password
4. Success response:
- user object: id, name, email, activated, created_at
5. Frontend usage:
- Screen: Register screen
- Feature: account creation before first login

Route A2
1. Method and path: POST /v1/tokens/authentication
2. Purpose: login and issue auth token
3. Request body:
- email
- password
4. Success response:
- authentication_token object: token, expiry
5. Frontend usage:
- Screen: Login screen
- Feature: save token in auth store and navigate to tabs

Feature B: Courses
Route B1
1. Method and path: POST /v1/courses
2. Purpose: create course
3. Request body:
- name
- code
- credit_hours optional
- difficulty_level optional
- target_attendance_percent optional
4. Success response:
- course object with id and timestamps
5. Frontend usage:
- Screen: Courses tab add-course modal
- Feature: create semester courses

Route B2
1. Method and path: GET /v1/courses
2. Purpose: list user courses
3. Query params optional:
- page
- page_size
- sort
4. Success response:
- courses list
- metadata object
5. Frontend usage:
- Screen: Courses tab main list
- Feature: display all courses

Route B3
1. Method and path: GET /v1/courses/:id
2. Purpose: fetch course detail
3. Success response:
- course object
4. Frontend usage:
- Screen: Course detail screen
- Feature: show course summary before attendance actions

Route B4
1. Method and path: PATCH /v1/courses/:id
2. Purpose: update course fields
3. Request body partial update allowed
4. Success response:
- course object updated
5. Frontend usage:
- Screen: Course settings/edit modal
- Feature: modify target attendance or labels

Route B5
1. Method and path: DELETE /v1/courses/:id
2. Purpose: delete a course
3. Success response:
- message confirming deletion
4. Frontend usage:
- Screen: Course detail actions
- Feature: remove course

Feature C: Attendance
Route C1
1. Method and path: POST /v1/courses/:id/attendance
2. Purpose: log attendance for one class date
3. Request body:
- class_date
- status present or absent
4. Success response:
- attendance_log object
5. Frontend usage:
- Screen: Attendance screen
- Feature: mark present or absent for selected day

Route C2
1. Method and path: PATCH /v1/courses/:id/attendance/:attendance_id
2. Purpose: correct an attendance entry
3. Request body:
- status
4. Success response:
- attendance_log updated
5. Frontend usage:
- Screen: Attendance history item actions
- Feature: fix wrong mark

Route C3
1. Method and path: GET /v1/courses/:id/attendance
2. Purpose: monthly attendance list
3. Query params:
- month in year-month format
4. Success response:
- attendance_logs list sorted by class_date
5. Frontend usage:
- Screen: Attendance screen calendar or list
- Feature: render month data

Route C4
1. Method and path: GET /v1/courses/:id/attendance-summary
2. Purpose: return attendance math
3. Success response:
- total_classes
- present_count
- attendance_percent
- target_attendance_percent
- classes_needed_to_reach_target
- risk_level
4. Frontend usage:
- Screen: Course detail and dashboard cards
- Feature: danger zone warning

Feature D: Tasks and Deadlines
Route D1
1. Method and path: POST /v1/tasks
2. Purpose: create task
3. Request body:
- title
- course_id optional
- due_at
- priority
- description optional
4. Success response:
- task object
5. Frontend usage:
- Screen: Tasks tab add-task form
- Feature: add assignment quiz exam

Route D2
1. Method and path: GET /v1/tasks
2. Purpose: list tasks
3. Query params optional:
- status
- due_before
- due_after
- page
- page_size
4. Success response:
- tasks list
- metadata
5. Frontend usage:
- Screen: Tasks tab
- Feature: pending/completed sections and filters

Route D3
1. Method and path: GET /v1/tasks/:id
2. Purpose: task detail
3. Success response:
- task object
4. Frontend usage:
- Screen: Task detail modal
- Feature: view full description and due date

Route D4
1. Method and path: PATCH /v1/tasks/:id
2. Purpose: update task fields or mark completed
3. Request body partial
4. Success response:
- task updated
5. Frontend usage:
- Screen: Task list row actions
- Feature: mark done or edit deadline

Route D5
1. Method and path: DELETE /v1/tasks/:id
2. Purpose: remove task
3. Success response:
- message confirming deletion
4. Frontend usage:
- Screen: Task detail actions
- Feature: remove obsolete task

Feature E: Extracurriculars
Route E1
1. Method and path: POST /v1/extracurriculars
2. Purpose: create extracurricular event
3. Request body:
- title
- category optional
- start_time
- end_time
- notes optional
4. Success response:
- extracurricular_event object
5. Frontend usage:
- Screen: Extracurricular tab add-event form
- Feature: log non-academic commitments

Route E2
1. Method and path: GET /v1/extracurriculars
2. Purpose: list events
3. Query params optional:
- start
- end
- page
- page_size
4. Success response:
- extracurricular_events list
- metadata
5. Frontend usage:
- Screen: Extracurricular tab
- Feature: weekly load view

Route E3
1. Method and path: PATCH /v1/extracurriculars/:id
2. Purpose: update event
3. Success response:
- extracurricular_event updated
4. Frontend usage:
- Screen: Event detail edit modal
- Feature: fix timing conflicts

Route E4
1. Method and path: DELETE /v1/extracurriculars/:id
2. Purpose: delete event
3. Success response:
- message confirming deletion
4. Frontend usage:
- Screen: Event detail actions
- Feature: remove canceled events

Feature F: Dashboard and Study Planner
Route F1
1. Method and path: GET /v1/dashboard/summary
2. Purpose: aggregate risk and priorities
3. Success response:
- attendance_overview by course
- upcoming_deadlines next 7 days
- extracurricular_hours_this_week
- overloaded_week boolean
- academic_stability_score 0 to 100
4. Frontend usage:
- Screen: Dashboard tab
- Feature: single-page academic health snapshot

Route F2
1. Method and path: POST /v1/study-plan/recommendations
2. Purpose: compute study suggestions from current data and free slots
3. Request body:
- week_start
- free_slots list with day and duration
4. Success response:
- recommendations list with course_id, reason, priority, suggested_duration_minutes, suggested_day
5. Frontend usage:
- Screen: Dashboard or Study Planner card
- Feature: what to study this week

---

**Business Rules (Deterministic)**
1. Attendance percent equals present_count divided by total_classes multiplied by 100
2. Classes needed to hit target attendance:
- if current percent already meets target then 0
- otherwise compute smallest integer future classes x satisfying (present + x) divided by (total + x) greater than or equal to target_fraction
3. Risk levels:
- safe: attendance percent at least target + 5
- warning: between target and target + 5
- danger: below target
4. Task urgency order:
- overdue first
- due within 48 hours second
- high priority pending next
- remaining pending by due date
5. Overloaded week flag:
- true when extracurricular hours this week plus suggested study hours exceed available free-slot hours

---

**Execution Plan with Psychological Checkpoints**

Phase 1: Foundation checkpoint
Goal:
1. App boots
2. DB connects
3. Health endpoint works
Tasks:
1. Wire config and DB
2. Add migration runner command usage
3. Add healthcheck route
Completion feeling marker:
1. You can run server and see healthy response

Phase 2: Schema checkpoint
Goal:
1. All seven migration steps done
Tasks:
1. Implement M1 to M7
2. Run full up/down/up cycle
Completion feeling marker:
1. Schema stable and no migration errors

Phase 3: Auth checkpoint
Goal:
1. User can register and login
2. Protected route blocks unauthenticated requests
Tasks:
1. Implement users create handler
2. Implement token create handler
3. Add auth middleware and context user extraction
Completion feeling marker:
1. You receive token and can access protected courses route

Phase 4: Courses checkpoint
Goal:
1. Full course CRUD works
Tasks:
1. Create model queries
2. Add handlers and route registration
3. Validate ownership checks
Completion feeling marker:
1. You can create/list/get/update/delete a course from API client

Phase 5: Attendance checkpoint
Goal:
1. Attendance logging and summary math work
Tasks:
1. Insert/update attendance endpoints
2. Monthly listing endpoint
3. Summary endpoint with classes-needed math
Completion feeling marker:
1. You can mark dates and immediately see risk and target gap

Phase 6: Tasks checkpoint
Goal:
1. Task CRUD and filtering work
Tasks:
1. Create/list/get/patch/delete task handlers
2. Filter pending and date windows
Completion feeling marker:
1. Upcoming and overdue tasks appear correctly

Phase 7: Extracurricular checkpoint
Goal:
1. Event CRUD works with time validation
Tasks:
1. Create/list/patch/delete events
2. Validate end_time after start_time
Completion feeling marker:
1. Weekly extracurricular load can be fetched cleanly

Phase 8: Dashboard checkpoint
Goal:
1. Summary endpoint integrates attendance plus tasks plus extracurricular hours
Tasks:
1. Build dashboard aggregation query/service
2. Compute stability score and overloaded flag
Completion feeling marker:
1. One endpoint gives full student snapshot

Phase 9: Study recommendation checkpoint
Goal:
1. Recommendation endpoint returns ordered plan
Tasks:
1. Accept free slots
2. Apply urgency and attendance weighting
3. Return top study sessions
Completion feeling marker:
1. Backend can explain what to study next and why

Phase 10: Stabilization checkpoint
Goal:
1. Demo-ready API with predictable behavior
Tasks:
1. Validate error responses are consistent
2. Add minimal automated tests for auth and attendance math
3. Run end-to-end manual checklist
Completion feeling marker:
1. You can demo complete flow without manual fixes

---

**Five-Day Build Schedule (Backend Only)**

Day 1:
1. Phase 1 and Phase 2
2. Start Phase 3 register/login basics
Expected output:
1. Migrations complete
2. Register and login partially or fully working

Day 2:
1. Finish Phase 3
2. Complete Phase 4
Expected output:
1. Auth done
2. Course CRUD done

Day 3:
1. Complete Phase 5
2. Start and mostly complete Phase 6
Expected output:
1. Attendance with summary done
2. Tasks create/list working

Day 4:
1. Finish Phase 6
2. Complete Phase 7
3. Complete Phase 8
Expected output:
1. Tasks done
2. Extracurricular done
3. Dashboard summary done

Day 5:
1. Complete Phase 9
2. Complete Phase 10
Expected output:
1. Study recommendation endpoint done
2. Stabilized API and demo checklist passed

---

**Demo Checklist (Final Acceptance)**
1. Register user
2. Login and obtain token
3. Create two courses
4. Log attendance for four dates each
5. Verify attendance summary and classes needed result
6. Create three tasks with mixed due dates
7. Mark one task completed
8. Create two extracurricular events in current week
9. Fetch dashboard summary and verify score and overloaded flag
10. Post study recommendation request and verify ranked suggestions

If all ten pass, backend MVP is complete and frontend integration can proceed with low risk.
