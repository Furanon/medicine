const express = require('express');
const router = express.Router();
const pool = require('../db');
const { body, param, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

// Middleware to handle validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route   GET /venues
 * @desc    Get all venues
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM venues ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   POST /venues
 * @desc    Create a new venue
 * @access  Private (Admin only)
 */
router.post(
  '/',
  [
    auth, // Authentication middleware
    // Admin check middleware would go here if available
    body('name').notEmpty().withMessage('Name is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
    body('location').notEmpty().withMessage('Location is required'),
    body('equipment').isArray().optional(),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { name, capacity, location, equipment } = req.body;
      
      const { rows } = await pool.query(
        'INSERT INTO venues (name, capacity, location, equipment) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, capacity, location, equipment ? JSON.stringify(equipment) : null]
      );
      
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

/**
 * @route   GET /venues/:id
 * @desc    Get venue by ID
 * @access  Public
 */
router.get(
  '/:id',
  [
    param('id').isInt().withMessage('Valid venue ID is required'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const { rows } = await pool.query(
        'SELECT * FROM venues WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ msg: 'Venue not found' });
      }
      
      res.json(rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

/**
 * @route   PUT /venues/:id
 * @desc    Update a venue
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  [
    auth, // Authentication middleware
    // Admin check middleware would go here if available
    param('id').isInt().withMessage('Valid venue ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
    body('location').notEmpty().withMessage('Location is required'),
    body('equipment').isArray().optional(),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, capacity, location, equipment } = req.body;
      
      // Check if venue exists
      const venueCheck = await pool.query(
        'SELECT * FROM venues WHERE id = $1',
        [id]
      );
      
      if (venueCheck.rows.length === 0) {
        return res.status(404).json({ msg: 'Venue not found' });
      }
      
      // Update venue
      const { rows } = await pool.query(
        'UPDATE venues SET name = $1, capacity = $2, location = $3, equipment = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [name, capacity, location, equipment ? JSON.stringify(equipment) : null, id]
      );
      
      res.json(rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

/**
 * @route   DELETE /venues/:id
 * @desc    Delete a venue
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  [
    auth, // Authentication middleware
    // Admin check middleware would go here if available
    param('id').isInt().withMessage('Valid venue ID is required'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if venue exists
      const venueCheck = await pool.query(
        'SELECT * FROM venues WHERE id = $1',
        [id]
      );
      
      if (venueCheck.rows.length === 0) {
        return res.status(404).json({ msg: 'Venue not found' });
      }
      
      // Delete related bookings and availability first (respecting foreign key constraints)
      await pool.query('DELETE FROM venue_bookings WHERE venue_id = $1', [id]);
      await pool.query('DELETE FROM venue_availability WHERE venue_id = $1', [id]);
      
      // Delete venue
      await pool.query('DELETE FROM venues WHERE id = $1', [id]);
      
      res.json({ msg: 'Venue removed' });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

/**
 * @route   GET /venues/:id/availability
 * @desc    Get availability for a venue
 * @access  Public
 */
router.get(
  '/:id/availability',
  [
    param('id').isInt().withMessage('Valid venue ID is required'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if venue exists
      const venueCheck = await pool.query(
        'SELECT * FROM venues WHERE id = $1',
        [id]
      );
      
      if (venueCheck.rows.length === 0) {
        return res.status(404).json({ msg: 'Venue not found' });
      }
      
      // Get availability
      const { rows } = await pool.query(
        `SELECT * FROM venue_availability 
         WHERE venue_id = $1 
         AND date_time_slot >= NOW() 
         ORDER BY date_time_slot ASC`,
        [id]
      );
      
      res.json(rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

/**
 * @route   POST /venues/:id/bookings
 * @desc    Create a booking for a venue
 * @access  Private
 */
router.post(
  '/:id/bookings',
  [
    auth, // Authentication middleware
    param('id').isInt().withMessage('Valid venue ID is required'),
    body('date_time_start').isISO8601().withMessage('Valid start date/time is required'),
    body('date_time_end').isISO8601().withMessage('Valid end date/time is required'),
    body('course_id').isInt().optional().withMessage('Course ID must be an integer'),
    body('session_id').isInt().optional().withMessage('Session ID must be an integer'),
    body('notes').isString().optional(),
    validateRequest,
    // Custom validator to ensure end time is after start time
    (req, res, next) => {
      const { date_time_start, date_time_end } = req.body;
      if (new Date(date_time_end) <= new Date(date_time_start)) {
        return res.status(400).json({ 
          errors: [{ msg: 'End time must be after start time' }] 
        });
      }
      next();
    }
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { date_time_start, date_time_end, course_id, session_id, notes } = req.body;
      const user_id = req.user.id; // Assuming auth middleware adds user to req
      
      // Check if venue exists
      const venueCheck = await pool.query(
        'SELECT * FROM venues WHERE id = $1',
        [id]
      );
      
      if (venueCheck.rows.length === 0) {
        return res.status(404).json({ msg: 'Venue not found' });
      }
      
      // Check if the venue is available during the requested time
      const availabilityCheck = await pool.query(
        `SELECT * FROM venue_bookings 
         WHERE venue_id = $1 
         AND ((date_time_start <= $2 AND date_time_end > $2) 
         OR (date_time_start < $3 AND date_time_end >= $3) 
         OR ($2 <= date_time_start AND $3 >= date_time_end))`,
        [id, date_time_start, date_time_end]
      );
      
      if (availabilityCheck.rows.length > 0) {
        return res.status(400).json({ msg: 'Venue is not available during the requested time' });
      }
      
      // Create booking
      const { rows } = await pool.query(
        `INSERT INTO venue_bookings 
         (venue_id, user_id, course_id, session_id, date_time_start, date_time_end, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [id, user_id, course_id || null, session_id || null, date_time_start, date_time_end, notes || null]
      );
      
      // Update availability (mark as unavailable)
      await pool.query(
        `DELETE FROM venue_availability 
         WHERE venue_id = $1 
         AND date_time_slot >= $2 
         AND date_time_slot < $3`,
        [id, date_time_start, date_time_end]
      );
      
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

module.exports = router;

