-- Enable Foreign Key constraints
PRAGMA foreign_keys = ON;

-- =============================================
-- Venues: Store venue details
-- =============================================
CREATE TABLE venues (
    venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER,
    configuration JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_venues_active ON venues(is_active);

-- =============================================
-- Events: Store event details
-- =============================================
CREATE TABLE events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    venue_id INTEGER,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    recurrence_rule TEXT, -- iCal RRULE format
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id)
);

CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_events_dates ON events(start_time, end_time);
CREATE INDEX idx_events_status ON events(status);

-- =============================================
-- Event Registrations: Track event participants
-- =============================================
CREATE TABLE event_registrations (
    registration_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('registered', 'cancelled', 'attended', 'no-show')) DEFAULT 'registered',
    registration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE INDEX idx_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_registrations_status ON event_registrations(status);

-- =============================================
-- Recurring Exceptions: Store modifications to recurring events
-- =============================================
CREATE TABLE recurring_exceptions (
    exception_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    exception_date TIMESTAMP NOT NULL,
    modification_type TEXT CHECK(modification_type IN ('cancelled', 'modified')) NOT NULL,
    modified_start_time TIMESTAMP,
    modified_end_time TIMESTAMP,
    modified_title TEXT,
    modified_description TEXT,
    modified_venue_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (modified_venue_id) REFERENCES venues(venue_id)
);

CREATE INDEX idx_exceptions_event ON recurring_exceptions(event_id);
CREATE INDEX idx_exceptions_date ON recurring_exceptions(exception_date);

-- Add triggers to automatically update updated_at timestamps
CREATE TRIGGER update_venues_timestamp AFTER UPDATE ON venues
BEGIN
    UPDATE venues SET updated_at = CURRENT_TIMESTAMP WHERE venue_id = NEW.venue_id;
END;

CREATE TRIGGER update_events_timestamp AFTER UPDATE ON events
BEGIN
    UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE event_id = NEW.event_id;
END;

CREATE TRIGGER update_event_registrations_timestamp AFTER UPDATE ON event_registrations
BEGIN
    UPDATE event_registrations SET updated_at = CURRENT_TIMESTAMP WHERE registration_id = NEW.registration_id;
END;

CREATE TRIGGER update_recurring_exceptions_timestamp AFTER UPDATE ON recurring_exceptions
BEGIN
    UPDATE recurring_exceptions SET updated_at = CURRENT_TIMESTAMP WHERE exception_id = NEW.exception_id;
END;

-- Add trigger to update current_participants when registrations change
CREATE TRIGGER update_event_participants_after_registration
AFTER INSERT ON event_registrations
BEGIN
    UPDATE events 
    SET current_participants = (
        SELECT COUNT(*) 
        FROM event_registrations 
        WHERE event_id = NEW.event_id 
        AND status = 'registered'
    )
    WHERE event_id = NEW.event_id;
END;

CREATE TRIGGER update_event_participants_after_registration_update
AFTER UPDATE ON event_registrations
WHEN OLD.status != NEW.status
BEGIN
    UPDATE events 
    SET current_participants = (
        SELECT COUNT(*) 
        FROM event_registrations 
        WHERE event_id = NEW.event_id 
        AND status = 'registered'
    )
    WHERE event_id = NEW.event_id;
END;

