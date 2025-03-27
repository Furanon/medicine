-- Migration: Create images table
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    format TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    related_course_id INTEGER,
    related_session_id INTEGER,
    FOREIGN KEY (related_course_id) REFERENCES courses(id),
    FOREIGN KEY (related_session_id) REFERENCES sessions(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_images_course ON images(related_course_id);
CREATE INDEX IF NOT EXISTS idx_images_session ON images(related_session_id);

