INSERT INTO courses (code, name, credit_hours, contact_hours_per_week, course_type)
VALUES
('CSE 1101', 'Structured Programming', 3.00, 3, 'theory'),
('CSE 1102', 'Structured Programming Sessional', 1.50, 3, 'sessional'),
('CSE 1201', 'Data Structure', 3.00, 3, 'theory'),
('CSE 1202', 'Data Structure Sessional', 1.50, 3, 'sessional'),
('CSE 1203', 'Object Oriented Programming', 3.00, 3, 'theory'),
('CSE 1204', 'Object Oriented Programming Sessional', 1.50, 3, 'sessional'),
('CSE 2201', 'Algorithm Analysis and Design', 3.00, 3, 'theory'),
('CSE 2202', 'Algorithm Analysis and Design Sessional', 1.50, 3, 'sessional')
ON CONFLICT (code) DO NOTHING;
