-- Enable Foreign Key constraints
PRAGMA foreign_keys = ON;

-- Variables table for storing key-value pairs
CREATE TABLE Variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookup by name
CREATE INDEX idx_variables_name ON Variables(name);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_variables_timestamp 
AFTER UPDATE ON Variables
BEGIN
    UPDATE Variables SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

