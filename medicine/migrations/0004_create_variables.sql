-- Migration: Create variables table
CREATE TABLE IF NOT EXISTS variables (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

