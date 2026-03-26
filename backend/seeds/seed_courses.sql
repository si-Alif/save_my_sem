-- 1st Year Odd Semester
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE1100', 'Computer Fundamentals and Ethics Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE1101', 'Structured Programming', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE1102', 'Structured Programming Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('EEE1151', 'Basic Electrical Engineering', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('EEE1152', 'Basic Electrical Engineering Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('MATH1113', 'Differential and Integral Calculus', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('HUM1113', 'Functional English', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('HUM1114', 'Functional English Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CHEM1113', 'Inorganic and Physical Chemistry', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CHEM1114', 'Inorganic and Physical Chemistry Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;

-- 1st Year Even Semester
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE1200', 'Competitive Programming Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE1201', 'Data Structure', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE1202', 'Data Structure Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE1203', 'Object Oriented Programming', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE1204', 'Object Oriented Programming Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('EEE1251', 'Electronic Devices and Circuits', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('EEE1252', 'Electronic Devices and Circuits Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('MATH1213', 'Coordinate Geometry and Ordinary Differential Equation', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('PHY1213', 'Physics', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('PHY1214', 'Physics Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;

-- 2nd Year Odd Semester
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2100', 'Software Development Project I', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2101', 'Discrete Mathematics', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2102', 'Discrete Mathematics Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2103', 'Digital Logic Design', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2104', 'Digital Logic Design Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('EEE2151', 'Electrical Drives and Instrumentations', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('EEE2152', 'Electrical Drives and Instrumentations Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('MATH2113', 'Vector Analysis and Linear Algebra', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('HUM2113', 'Economics, Government and Sociology', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;

-- 2nd Year Even Semester
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2200', 'Technical Writing and Presentation Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2201', 'Algorithm Analysis and Design', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2202', 'Algorithm Analysis and Design Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2203', 'Numerical Methods', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2204', 'Numerical Methods Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2205', 'Microprocessors, Microcontrollers and Assembly Language', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE2206', 'Microprocessors, Microcontrollers and Assembly Language Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('MATH2213', 'Complex Variable, Partial Differential Equation and Harmonic Analysis', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('HUM2213', 'Industrial Management and Accountancy', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;

-- 3rd Year Odd Semester
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3100', 'Web Based Application Project', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3101', 'Database Systems', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3102', 'Database Systems Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3103', 'Theory of Computation', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3105', 'Computer Interfacing and Embedded System', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3106', 'Computer Interfacing and Embedded System Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3107', 'Computer Architecture', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3108', 'Computer Architecture Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3109', 'Applied Statistics and Queuing Theory', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;

-- 3rd Year Even Semester
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3200', 'Software Development Project II', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3201', 'Operating Systems', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3202', 'Operating System Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3203', 'Data Communication', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3204', 'Data Communication Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3205', 'Software Engineering', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3206', 'Software Engineering Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3207', 'Artificial Intelligence', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3208', 'Artificial Intelligence Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3209', 'Digital Signal Processing', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE3210', 'Digital Signal Processing Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;

-- 4th Year Odd Semester
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4000', 'Project/Thesis I', 1.00, 2, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4101', 'Compiler Design', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4102', 'Compiler Design Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4103', 'Computer Networks', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4104', 'Computer Networks Sessional', 1.50, 3, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4105', 'Digital Image Processing', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4106', 'Digital Image Processing Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4108', 'Industrial Attachment', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;

-- 4th Year Even Semester
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4000', 'Project/Thesis II', 3.00, 6, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4201', 'Computer Graphics', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4202', 'Computer Graphics Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4203', 'Machine Learning', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4204', 'Machine Learning Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4205', 'Security and Privacy', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4206', 'Security and Privacy Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4208', 'Seminar', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;

-- Optional I/II Courses (4th Year Odd Semester)
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4109', 'Information Systems Analysis and Design', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4110', 'Information Systems Analysis and Design Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4111', 'Unix Programming', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4112', 'Unix Programming Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4113', 'Digital System Design', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4114', 'Digital System Design Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4115', 'Simulation and Modeling', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4116', 'Simulation and Modeling Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4117', 'Wireless Networks', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4118', 'Wireless Networks Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4119', 'Data Mining', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4120', 'Data Mining Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4121', 'Computer Vision', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4122', 'Computer Vision Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4123', 'Knowledge Engineering', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4124', 'Knowledge Engineering Sessional', 0.75, 1.5, 'sessional') ON CONFLICT (code) DO NOTHING;

-- Optional III/IV Courses (4th Year Even Semester)
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4209', 'VLSI Design', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4211', 'Parallel and Distributed Processing', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4213', 'Impact of Computer on Society', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4215', 'Decision Support System', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4217', 'Network Planning', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4219', 'Human Computer Interaction', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4221', 'Switching Systems', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;
INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type) VALUES ('CSE4223', 'Control System Engineering', 3.00, 3, 'theory') ON CONFLICT (code) DO NOTHING;