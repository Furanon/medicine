-- Migration: Create Variables table
CREATE TABLE IF NOT EXISTS Variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_variables_timestamp AFTER UPDATE ON Variables
BEGIN
    UPDATE Variables SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

