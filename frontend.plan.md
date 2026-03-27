PRD: Attendance Mobile App (Student-Facing)
Goal
Deliver a mobile app that lets students log in, view their enrolled courses and sessions, mark attendance, and see their attendance status/marks. Prioritize a pleasing, modern aesthetic with smooth interactions and a subtle sense of reward.

Core Users

Students (primary).
Professors/Admins (future, out of current scope).
Key User Stories (MVP)

As a student, I can log in and stay logged in securely.
I can see my active-semester courses.
I can browse my upcoming/past sessions, filter by course and date range.
I can mark my attendance (present/absent/late/excused) for a session.
I can review my attendance history with filters.
I can view my attendance summary (counts, percentage, mark).
Non-Goals (for now)

Admin/professor views, bulk session management.
Push notifications and offline-first caching (optional later).
Grade management beyond attendance mark.
Backend APIs Available

Auth: POST /v1/tokens/authentication
Courses: GET /v1/users/:id/courses?semester=...
Sessions: GET /v1/users/:id/sessions?course_id&from/to/on&page&page_size&status
Attendance:
Mark: POST /v1/attendance
History: GET /v1/users/:id/attendance?course_id&from/to&page&page_size&sort
Summary: GET /v1/users/:id/attendance/summary?course_id&from/to
Data Shapes (high level)

Session: id, course_id, session_date, start_time, end_time, location, status.
AttendanceLog: id, user_id, class_session_id, status, marked_at, note, marked_by_user_id.
AttendanceSummary: present, absent, late, excused, total_sessions, plus computed percentage/mark client-side.
Success Criteria

End-to-end flow: login → courses → sessions → mark attendance → summary works on real backend.
Pleasant, modern UI that feels rewarding: micro-animations, clear status indicators, progress/mark visualization.
Ready to demo within 1–2 days; easy to extend later.
Frontend Implementation Plan (Expo / React Native / TypeScript)
1) Foundation
Stack: Expo + React Navigation, TypeScript.
State: React Query (for caching + retries + loading states) or minimal context + SWR-style hooks.
Storage: SecureStore/AsyncStorage for token.
Theming: central palette and spacing/typography scale.
2) API Client
Base URL from env; attach bearer token.
Modules: auth, courses, sessions, attendance (history, summary, mark).
Helpers for query params (from/to/on, pagination).
3) Auth Flow
Screens: Login (email/password), optional splash/loading.
On success, store token + userId; gate navigation (AuthStack vs AppStack).
Handle 401 → force logout.
4) Screens (MVP)
Courses: list active-semester enrollments; tap to set active course filter.
Sessions: list with quick filters (Today, This week, Custom range), course filter, status pill; show date/time/location; tap → mark.
Mark Attendance: bottom sheet/modal with statuses (present/absent/late/excused), optional note, confirm CTA.
Attendance History: paginated list with status pills, marked_at, note; filters (course/date).
Summary: cards for counts, a progress ring/bar for percentage, and badge for mark (10–0 scale).
Settings: logout, API URL override (for demos).
5) UI/UX & Visual Direction
Palette: sky-blue primary (#4DA3FF), white backgrounds, light purple accent (#C8B5FF), soft neutrals (#F7F9FC, #E5ECF6, text #1F2933).
Typography: Rounded modern sans (e.g., “Plus Jakarta Sans” or “Manrope”).
Components: Cards with soft shadows, pill chips for status, rounded buttons, subtle gradients (sky-blue → light purple) on key CTAs/progress.
Motion: 150–200ms ease-out transitions; gentle fade/slide for screen transitions; scale/opacity micro-feedback on taps.
Layout: Plenty of whitespace, consistent 8pt spacing, section headers, sticky filter bar for sessions.
Psychological rewards:
Progress ring for attendance percentage with color shift as it improves.
Mark badge (10–0) with celebratory color at high marks.
Friendly empty states with illustrations/icons.
Subtle success toasts/snackbars after marking attendance.
6) Navigation Map
AuthStack: Login.
AppStack (tabbed or stack with bottom tabs): Courses | Sessions | History | Summary | Settings.
Modals: Mark Attendance sheet; Date-range picker.
7) Data & Error Handling
Loading: skeletons/shimmers for lists; pull-to-refresh on sessions/history.
Errors: inline retry and toast; 401 → logout.
Pagination: next/prev or infinite scroll; show total pages from metadata if needed.
8) Seeding for Demo
Script or documented curl to: create a demo user, enroll in a couple courses, activate semester, run session generator, mark sample attendance. Ensure the app has data at first launch.
9) Verification
Manual path: login → courses → sessions (filter) → mark attendance → history reflects → summary updates.
API smoke: fail auth, see 401; network error surfaces toast; pagination works.