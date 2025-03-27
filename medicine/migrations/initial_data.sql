-- Initial data for Medicine Circus Database
-- This file contains sample data for testing

-- Course Types
INSERT INTO Course_Types (type_name, description) VALUES 
('Workshop', 'Short, focused sessions typically lasting a few hours'),
('Intensive', 'Deep-dive training sessions with concentrated learning'),
('Regular Class', 'Ongoing weekly classes for consistent skill development'),
('Multi-Day Training', 'Extended training programs spanning multiple days');

-- Sample Instructor
INSERT INTO Instructors (first_name, last_name, bio, specialties, email, phone, is_active, certification_details) VALUES
('Alex', 'Rivera', 'Professional fire performer with 10 years of experience', 'Fire staff, poi, fire breathing', 'alex.rivera@example.com', '555-123-4567', true, 'Certified in advanced fire safety protocols');

-- Sample Course
INSERT INTO Courses (course_name, description, type_id, skill_level_required, max_participants, duration_type, duration_value, regular_price, instructor_id, location, equipment_required, is_active, prerequisites, curriculum_outline, is_certification_provided) VALUES
('Fire Poi Fundamentals', 'Learn the basics of fire poi performance in a safe, controlled environment', 
(SELECT type_id FROM Course_Types WHERE type_name = 'Workshop'), 
'Beginner', 12, 'hours', 3, 75.00, 
(SELECT instructor_id FROM Instructors WHERE first_name = 'Alex' AND last_name = 'Rivera'),
'Main Practice Space', 'Practice poi provided, fire poi for demonstrations', true, 
'No prior experience required', 'Safety basics, grip techniques, basic moves, flame management', false);

-- Sample Course Session
INSERT INTO Course_Sessions (course_id, start_date, start_time, end_date, end_time, current_participants, status, notes) VALUES
((SELECT course_id FROM Courses WHERE course_name = 'Fire Poi Fundamentals'),
'2023-09-15', '14:00:00', '2023-09-15', '17:00:00', 0, 'scheduled', 'Outdoor session, weather permitting');

-- Sample User
INSERT INTO Users (first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone, experience_level, medical_conditions, waiver_signed, waiver_date, created_at) VALUES
('Jamie', 'Smith', 'jamie.smith@example.com', '555-987-6543', 'Taylor Smith', '555-789-0123', 'Novice', 'None', true, CURRENT_DATE, CURRENT_TIMESTAMP);

-- Sample Booking
INSERT INTO Bookings (user_id, session_id, booking_datetime, payment_status, payment_amount, payment_method, is_confirmed, attendance_status, created_at) VALUES
((SELECT user_id FROM Users WHERE email = 'jamie.smith@example.com'),
(SELECT session_id FROM Course_Sessions WHERE course_id = (SELECT course_id FROM Courses WHERE course_name = 'Fire Poi Fundamentals')),
CURRENT_TIMESTAMP, 'paid', 75.00, 'credit_card', true, 'registered', CURRENT_TIMESTAMP);

