-- Drop existing tables if they exist
DROP TABLE IF EXISTS Event_Exceptions;
DROP TABLE IF EXISTS Event_Instances;
DROP TABLE IF EXISTS Recurring_Events;

-- Create Recurring Events table
CREATE TABLE Recurring_Events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,        -- ISO 8601 datetime
    end_time TEXT NOT NULL,          -- ISO 8601 datetime
    recurrence_rule TEXT NOT NULL,   -- FREQ=WEEKLY;COUNT=4 format
    venue_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Event Exceptions table
CREATE TABLE Event_Exceptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recurring_event_id INTEGER NOT NULL,
    instance_date TEXT NOT NULL,  -- ISO 8601 date
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recurring_event_id) 
        REFERENCES Recurring_Events(id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_recurring_events_time ON Recurring_Events(start_time, end_time);
CREATE INDEX idx_event_exceptions_date ON Event_Exceptions(instance_date);

-- Enable foreign key support
PRAGMA foreign_keys = ON;
