-- Medicine Fire Circus Database Schema
-- This schema defines tables for managing course bookings, participants, instructors, and sessions
-- for the Medicine Fire Circus program.

-- Enable Foreign Key constraints
PRAGMA foreign_keys = ON;

-- =============================================
-- Course_Types: Defines different types of courses offered
-- =============================================
CREATE TABLE Course_Types (
    type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_course_types_name ON Course_Types(type_name);

-- =============================================
-- Instructors: Information about course instructors
-- =============================================
CREATE TABLE Instructors (
    instructor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    bio TEXT,
    specialties TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    certification_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_instructors_name ON Instructors(last_name, first_name);
CREATE INDEX idx_instructors_email ON Instructors(email);

-- =============================================
-- Courses: Core information about available courses
-- =============================================
CREATE TABLE Courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    description TEXT,
    type_id INTEGER NOT NULL,
    skill_level_required TEXT,
    max_participants INTEGER NOT NULL,
    duration_type TEXT CHECK(duration_type IN ('hours', 'days', 'weeks')),
    duration_value NUMERIC NOT NULL,
    regular_price DECIMAL(10, 2),
    instructor_id INTEGER,
    location TEXT,
    equipment_required TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    prerequisites TEXT,
    curriculum_outline TEXT,
    is_certification_provided BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES Course_Types(type_id),
    FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id)
);

CREATE INDEX idx_courses_name ON Courses(course_name);
CREATE INDEX idx_courses_type ON Courses(type_id);
CREATE INDEX idx_courses_instructor ON Courses(instructor_id);
CREATE INDEX idx_courses_active ON Courses(is_active);

-- =============================================
-- Course_Sessions: Scheduled instances of courses
-- =============================================
CREATE TABLE Course_Sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME,
    end_date DATE NOT NULL,
    end_time TIME,
    schedule_details JSON, -- For multi-day courses, JSON format to store daily schedules
    current_participants INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('scheduled', 'in_progress', 'cancelled', 'completed')) DEFAULT 'scheduled',
    notes TEXT,
    breaks_schedule JSON,
    venue_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(course_id)
);

CREATE INDEX idx_course_sessions_course ON Course_Sessions(course_id);
CREATE INDEX idx_course_sessions_dates ON Course_Sessions(start_date, end_date);
CREATE INDEX idx_course_sessions_status ON Course_Sessions(status);

-- =============================================
-- Course_Schedule_Details: Detailed schedule for multi-day courses
-- =============================================
CREATE TABLE Course_Schedule_Details (
    schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity_description TEXT,
    location_details TEXT,
    instructor_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES Course_Sessions(session_id),
    FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id)
);

CREATE INDEX idx_schedule_session ON Course_Schedule_Details(session_id);
CREATE INDEX idx_schedule_date ON Course_Schedule_Details(date);
CREATE INDEX idx_schedule_instructor ON Course_Schedule_Details(instructor_id);

-- =============================================
-- Course_Materials: Materials associated with courses
-- =============================================
CREATE TABLE Course_Materials (
    material_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    material_name TEXT NOT NULL,
    type TEXT CHECK(type IN ('document', 'video', 'equipment', 'other')),
    is_provided BOOLEAN DEFAULT FALSE,
    additional_cost DECIMAL(8, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(course_id)
);

CREATE INDEX idx_materials_course ON Course_Materials(course_id);
CREATE INDEX idx_materials_type ON Course_Materials(type);

-- =============================================
-- Users: Information about students/participants
-- =============================================
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    experience_level TEXT,
    medical_conditions TEXT,
    waiver_signed BOOLEAN DEFAULT FALSE,
    waiver_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_name ON Users(last_name, first_name);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_waiver ON Users(waiver_signed);

-- =============================================
-- Bookings: Record of course registrations
-- =============================================
CREATE TABLE Bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    booking_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'failed', 'comp/free')) DEFAULT 'pending',
    payment_amount DECIMAL(10, 2),
    payment_method TEXT,
    transaction_id TEXT,
    is_confirmed BOOLEAN DEFAULT FALSE,
    attendance_status TEXT CHECK(attendance_status IN ('registered', 'attended', 'no-show', 'cancelled')) DEFAULT 'registered',
    cancellation_reason TEXT,
    refund_status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (session_id) REFERENCES Course_Sessions(session_id)
);

CREATE INDEX idx_bookings_user ON Bookings(user_id);
CREATE INDEX idx_bookings_session ON Bookings(session_id);
CREATE INDEX idx_bookings_payment ON Bookings(payment_status);
CREATE INDEX idx_bookings_confirmed ON Bookings(is_confirmed);
CREATE INDEX idx_bookings_attendance ON Bookings(attendance_status);
CREATE INDEX idx_bookings_date ON Bookings(booking_datetime);

-- =============================================
-- WaitingList: Waitlist for full sessions
-- =============================================
CREATE TABLE WaitingList (
    waitlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    request_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('waiting', 'offered', 'accepted', 'declined')) DEFAULT 'waiting',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (session_id) REFERENCES Course_Sessions(session_id)
);

CREATE INDEX idx_waitlist_user ON WaitingList(user_id);
CREATE INDEX idx_waitlist_session ON WaitingList(session_id);
CREATE INDEX idx_waitlist_status ON WaitingList(status);
CREATE INDEX idx_waitlist_date ON WaitingList(request_datetime);

-- Add triggers to automatically update updated_at timestamps
CREATE TRIGGER update_course_types_timestamp AFTER UPDATE ON Course_Types
BEGIN
    UPDATE Course_Types SET updated_at = CURRENT_TIMESTAMP WHERE type_id = NEW.type_id;
END;

CREATE TRIGGER update_instructors_timestamp AFTER UPDATE ON Instructors
BEGIN
    UPDATE Instructors SET updated_at = CURRENT_TIMESTAMP WHERE instructor_id = NEW.instructor_id;
END;

CREATE TRIGGER update_courses_timestamp AFTER UPDATE ON Courses
BEGIN
    UPDATE Courses SET updated_at = CURRENT_TIMESTAMP WHERE course_id = NEW.course_id;
END;

CREATE TRIGGER update_course_sessions_timestamp AFTER UPDATE ON Course_Sessions
BEGIN
    UPDATE Course_Sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = NEW.session_id;
END;

CREATE TRIGGER update_schedule_details_timestamp AFTER UPDATE ON Course_Schedule_Details
BEGIN
    UPDATE Course_Schedule_Details SET updated_at = CURRENT_TIMESTAMP WHERE schedule_id = NEW.schedule_id;
END;

CREATE TRIGGER update_materials_timestamp AFTER UPDATE ON Course_Materials
BEGIN
    UPDATE Course_Materials SET updated_at = CURRENT_TIMESTAMP WHERE material_id = NEW.material_id;
END;

CREATE TRIGGER update_users_timestamp AFTER UPDATE ON Users
BEGIN
    UPDATE Users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER update_bookings_timestamp AFTER UPDATE ON Bookings
BEGIN
    UPDATE Bookings SET updated_at = CURRENT_TIMESTAMP WHERE booking_id = NEW.booking_id;
END;

CREATE TRIGGER update_waitlist_timestamp AFTER UPDATE ON WaitingList
BEGIN
    UPDATE WaitingList SET updated_at = CURRENT_TIMESTAMP WHERE waitlist_id = NEW.waitlist_id;
END;

-- Add a trigger to update current_participants when a booking is made or cancelled
CREATE TRIGGER update_session_participants_after_booking
AFTER INSERT ON Bookings
BEGIN
    UPDATE Course_Sessions 
    SET current_participants = (
        SELECT COUNT(*) 
        FROM Bookings 
        WHERE session_id = NEW.session_id 
        AND attendance_status NOT IN ('cancelled')
    )
    WHERE session_id = NEW.session_id;
END;

CREATE TRIGGER update_session_participants_after_booking_update
AFTER UPDATE ON Bookings
WHEN OLD.attendance_status != NEW.attendance_status
BEGIN
    UPDATE Course_Sessions 
    SET current_participants = (
        SELECT COUNT(*) 
        FROM Bookings 
        WHERE session_id = NEW.session_id 
        AND attendance_status NOT IN ('cancelled')
    )
    WHERE session_id = NEW.session_id;
END;

