const { initStripe, processPayment, handleStripeWebhook } = require('./stripe');
import { handleImageRoutes } from './routes/images';
import { Router } from './router';  // Assuming you have a router module

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function handleOptions(request) {
  if (request.headers.get('Origin') !== null &&
      request.headers.get('Access-Control-Request-Method') !== null &&
      request.headers.get('Access-Control-Request-Headers') !== null) {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, PUT, OPTIONS',
      },
    });
  }
}

function wrapResponse(response) {
  const headers = new Headers(response.headers);
  Object.keys(corsHeaders).forEach(key => {
    headers.set(key, corsHeaders[key]);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    status,
  });
}

const router = new Router();  // Initialize your router

// Add your router configurations here
// router.get('/api/someEndpoint', handleSomeEndpoint);

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    try {
      const url = new URL(request.url);
      
      // Health check endpoint
      if (url.pathname === '/api/health') {
        return jsonResponse({
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
      }

      // Events endpoints
      if (url.pathname === '/api/events') {
        if (request.method === 'GET') {
          // TODO: Implement event fetching from D1
          return jsonResponse([
            {
              id: 1,
              title: 'Test Event',
              start: new Date().toISOString(),
              end: new Date(Date.now() + 3600000).toISOString(),
            }
          ]);
        }
      }

      // Handle image routes
      const imageResponse = await handleImageRoutes(request, env);
      if (imageResponse) {
        return wrapResponse(imageResponse);
      }

      // Handle all other routes with the router
      const response = await router.handle(request, env, ctx);
      return wrapResponse(response);

    } catch (error) {
      console.error("Error processing request:", error);
      return jsonResponse({
        success: false,
        error: error.message || "An unexpected error occurred",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, error.status || 500);
    }
  }
};

const { initStripe, processPayment, handleStripeWebhook } = require('./stripe');
import { handleImageRoutes } from './routes/images';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function handleOptions(request) {
  if (request.headers.get('Origin') !== null &&
      request.headers.get('Access-Control-Request-Method') !== null &&
      request.headers.get('Access-Control-Request-Headers') !== null) {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, PUT, OPTIONS',
      },
    });
  }
}

function wrapResponse(response) {
  const headers = new Headers(response.headers);
  Object.keys(corsHeaders).forEach(key => {
    headers.set(key, corsHeaders[key]);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// Helper function to create JSON response
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    status,
  });
}

export default {
  async fetch(request, env, ctx) {
    // Handle OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    try {
      const url = new URL(request.url);
      
      // Health check endpoint
      if (url.pathname === '/api/health') {
        return jsonResponse({
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
      }

      // Events endpoints
      if (url.pathname === '/api/events') {
        if (request.method === 'GET') {
          // TODO: Implement event fetching from D1
          return jsonResponse([
            {
              id: 1,
              title: 'Test Event',
              start: new Date().toISOString(),
              end: new Date(Date.now() + 3600000).toISOString(),
            }
          ]);
        }
      }

      // Try handling image routes
      const imageResponse = await handleImageRoutes(request, env);
      if (imageResponse) {
        return wrapResponse(imageResponse);
      }

      // Handle the request with our router
      const response = await router.handle(request, env, ctx);
      return wrapResponse(response);

    } catch (error) {
      console.error("Error processing request:", error);
      return jsonResponse({
        success: false,
        error: error.message || "An unexpected error occurred",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, error.status || 500);
    }
  }
};

// Middleware to handle CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper function to handle CORS preflight requests
function handleOptions(request) {
  if (request.headers.get('Origin') !== null &&
      request.headers.get('Access-Control-Request-Method') !== null &&
      request.headers.get('Access-Control-Request-Headers') !== null) {
    return new Response(null, {
      headers: corsHeaders
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: 'GET, POST, PUT, DELETE, OPTIONS',
      },
    });
  }
}

// Helper function to wrap responses with CORS headers
function wrapResponse(response) {
  const headers = new Headers(response.headers);
  Object.keys(corsHeaders).forEach(key => {
    headers.set(key, corsHeaders[key]);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Fire Circus API - A RESTful API for managing courses, sessions, users, and bookings
 * 
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 */
const { initStripe, processPayment, handleStripeWebhook } = require('./stripe');
import { handleImageRoutes } from './routes/images';
// Helper function to create JSON response
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

// Helper function to handle errors
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Helper function to validate required fields
function validateRequiredFields(data, fields) {
  const missingFields = fields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`;
  }
  return null;
}

// Router class to handle different HTTP methods for the same path
class Router {
  constructor() {
    this.routes = {
      GET: {},
      POST: {},
      PUT: {},
      PATCH: {},
      DELETE: {},
    };
  }

  get(path, handler) {
    this.routes.GET[path] = handler;
    return this;
  }

  post(path, handler) {
    this.routes.POST[path] = handler;
    return this;
  }

  put(path, handler) {
    this.routes.PUT[path] = handler;
    return this;
  }

  patch(path, handler) {
    this.routes.PATCH[path] = handler;
    return this;
  }

  delete(path, handler) {
    this.routes.DELETE[path] = handler;
    return this;
  }

  async handle(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Check for exact route match
    if (this.routes[method][path]) {
      return await this.routes[method][path](request, env, ctx);
    }

    // Check for dynamic routes with parameters
    for (const routePath in this.routes[method]) {
      if (routePath.includes(':')) {
        const routeParts = routePath.split('/');
        const pathParts = path.split('/');

        if (routeParts.length !== pathParts.length) {
          continue;
        }

        const params = {};
        let match = true;

        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(':')) {
            const paramName = routeParts[i].substring(1);
            params[paramName] = pathParts[i];
          } else if (routeParts[i] !== pathParts[i]) {
            match = false;
            break;
          }
        }

        if (match) {
          request.params = params;
          return await this.routes[method][routePath](request, env, ctx);
        }
      }
    }

    return errorResponse('Not Found', 404);
  }
}

// Create and configure the router
const router = new Router();

// Helper function to get Stripe instance with environment variables
function getStripeInstance(env) {
  return initStripe(env.STRIPE_SECRET_KEY);
}

// --- COURSE ROUTES ---

// Get all courses
router.get('/api/courses', async (request, env, ctx) => {
  try {
    const { results } = await env.DB.prepare(
      `SELECT c.*, ct.type_name as course_type
       FROM Courses c
       JOIN Course_Types ct ON c.type_id = ct.type_id
       ORDER BY c.course_name`
    ).all();
    
    return jsonResponse({ courses: results })
  } catch (error) {
    console.error('Error fetching courses:', error);
    return errorResponse('Failed to fetch courses', 500);
  }
})

// Get a specific course by ID
router.get('/api/courses/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;
    
    // Fetch course details
    const course = await env.DB.prepare(
      `SELECT c.*, ct.type_name as course_type
       FROM Courses c
       JOIN Course_Types ct ON c.type_id = ct.type_id
       WHERE c.course_id = ?`
    ).bind(id).first();
    
    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Fetch course materials
    const { results: materials } = await env.DB.prepare(
      `SELECT * FROM Course_Materials WHERE course_id = ?`
    ).bind(id).all();

    // Fetch upcoming sessions
    const { results: sessions } = await env.DB.prepare(
      `SELECT * FROM Course_Sessions 
       WHERE course_id = ? AND start_date >= CURRENT_DATE
       ORDER BY start_date, start_time`
    ).bind(id).all();

    return jsonResponse({
      ...course,
      materials,
      sessions
    })
  } catch (error) {
    console.error('Error fetching course:', error);
    return errorResponse('Failed to fetch course details', 500);
  }
})

// Create a new course
router.post('/api/courses', async (request, env, ctx) => {
  try {
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate required fields
    const requiredFields = ['course_name', 'type_id', 'duration_type', 'duration_value', 'regular_price', 'max_participants'];
    const missingFields = validateRequiredFields(data, requiredFields);
    if (missingFields) {
      return errorResponse(missingFields, 400);
    }

    // Insert new course
    const result = await env.DB.prepare(
      `INSERT INTO Courses (
        course_name, description, type_id, skill_level_required,
        max_participants, duration_type, duration_value, regular_price,
        instructor_id, location, equipment_required, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.course_name,
      data.description || '',
      data.type_id,
      data.skill_level_required || 'beginner',
      data.max_participants,
      data.duration_type,
      data.duration_value,
      data.regular_price,
      data.instructor_id || null,
      data.location || null,
      data.equipment_required || null,
      data.is_active !== undefined ? data.is_active : 1
    ).run();

    // Get the newly created course
    const newCourse = await env.DB.prepare(
      'SELECT * FROM Courses WHERE course_id = last_insert_rowid()'
    ).first();

    return jsonResponse(newCourse, 201);
  } catch (error) {
    console.error('Error creating course:', error);
    return errorResponse('Failed to create course', 500);
  }
})

// Update a course
router.put('/api/courses/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;
    
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Check if course exists
    const existingCourse = await env.DB.prepare(
      'SELECT * FROM Courses WHERE course_id = ?'
    ).bind(id).first();

    if (!existingCourse) {
      return errorResponse('Course not found', 404);
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const params = [];

    const allowedFields = [
      'course_name', 'description', 'type_id', 'skill_level_required',
      'max_participants', 'duration_type', 'duration_value', 'regular_price',
      'instructor_id', 'location', 'equipment_required', 'is_active'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    // Add ID as the last parameter
    params.push(id);

    // Execute update
    await env.DB.prepare(
      `UPDATE Courses SET ${updateFields.join(', ')} WHERE course_id = ?`
    ).bind(...params).run();

    // Fetch updated course
    const updatedCourse = await env.DB.prepare(
      'SELECT * FROM Courses WHERE course_id = ?'
    ).bind(id).first();

    return jsonResponse(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    return errorResponse('Failed to update course', 500);
  }
})

// Delete a course
router.delete('/api/courses/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;

    // Check if course exists
    const existingCourse = await env.DB.prepare(
      'SELECT * FROM Courses WHERE course_id = ?'
    ).bind(id).first();

    if (!existingCourse) {
      return errorResponse('Course not found', 404);
    }

    // Check if there are any active sessions for this course
    const { count } = await env.DB.prepare(
      `SELECT COUNT(*) as count 
       FROM Course_Sessions 
       WHERE course_id = ? AND start_date >= CURRENT_DATE`
    ).bind(id).first();

    if (count > 0) {
      return errorResponse('Cannot delete course with active sessions', 400);
    }

    // Delete course
    await env.DB.prepare('DELETE FROM Courses WHERE course_id = ?').bind(id).run();

    return jsonResponse({ success: true, message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Error deleting course:', error);
    return errorResponse('Failed to delete course', 500);
  }
})

// --- SESSION ROUTES ---

// Get all sessions
router.get('/api/sessions', async (request, env, ctx) => {
  try {
    const url = new URL(request.url);
    const upcoming = url.searchParams.get('upcoming') === 'true';
    const courseId = url.searchParams.get('courseId');
    
    let query = `
      SELECT s.*, c.course_name, c.duration_type, c.duration_value
      FROM Course_Sessions s
      JOIN Courses c ON s.course_id = c.course_id
    `;
    
    const params = [];
    const conditions = [];
    
    if (upcoming) {
      conditions.push('s.start_date >= CURRENT_DATE');
    }
    
    if (courseId) {
      conditions.push('s.course_id = ?');
      params.push(courseId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY s.start_date, s.start_time';
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    return jsonResponse({ sessions: results })
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return errorResponse('Failed to fetch sessions', 500);
  }
})

// Get a specific session
router.get('/api/sessions/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;
    
    const session = await env.DB.prepare(`
      SELECT s.*, c.course_name, c.description, c.max_participants, 
             c.duration_type, c.duration_value, c.skill_level_required
      FROM Course_Sessions s
      JOIN Courses c ON s.course_id = c.course_id
      WHERE s.session_id = ?
    `).bind(id).first();
    
    if (!session) {
      return errorResponse('Session not found', 404);
    }

    // Get schedule details if it's a multi-day session
    if (session.duration_type === 'days' || session.duration_type === 'weeks') {
      const { results: scheduleDetails } = await env.DB.prepare(`
        SELECT * FROM Course_Schedule_Details
        WHERE session_id = ?
        ORDER BY day_number
      `).bind(id).all();
      
      session.schedule_details = scheduleDetails;
    }

    // Get instructor info
    const instructor = await env.DB.prepare(`
      SELECT i.instructor_id, i.first_name, i.last_name, i.specialties
      FROM Instructors i
      JOIN Courses c ON i.instructor_id = c.instructor_id
      JOIN Course_Sessions s ON c.course_id = s.course_id
      WHERE s.session_id = ?
    `).bind(id).first();
    
    if (instructor) {
      session.instructor = instructor;
    }

    return jsonResponse(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return errorResponse('Failed to fetch session details', 500);
  }
})

// Create a new session
router.post('/api/sessions', async (request, env, ctx) => {
  try {
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate required fields
    const requiredFields = ['course_id', 'start_date', 'start_time'];
    const missingFields = validateRequiredFields(data, requiredFields);
    if (missingFields) {
      return errorResponse(missingFields, 400);
    }

    // Check if course exists
    const course = await env.DB.prepare(
      'SELECT * FROM Courses WHERE course_id = ?'
    ).bind(data.course_id).first();

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Insert new session
    const result = await env.DB.prepare(`
      INSERT INTO Course_Sessions (
        course_id, start_date, start_time, end_date, end_time,
        current_participants, status, notes, venue_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.course_id,
      data.start_date,
      data.start_time,
      data.end_date || data.start_date,
      data.end_time || null,
      data.current_participants || 0,
      data.status || 'scheduled',
      data.notes || null,
      data.venue_details || null
    ).run();

    // Get the newly created session
    const newSession = await env.DB.prepare(
      'SELECT * FROM Course_Sessions WHERE session_id = last_insert_rowid()'
    ).first();

    // If multi-day course and schedule details provided, add them
    if (data.schedule_details && Array.isArray(data.schedule_details) && data.schedule_details.length > 0) {
      const scheduleStmt = await env.DB.prepare(`
        INSERT INTO Course_Schedule_Details (
          session_id, day_number, date, start_time, end_time, 
          activity_description, location_details, instructor_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const detail of data.schedule_details) {
        await scheduleStmt.bind(
          newSession.session_id,
          detail.day_number,
          detail.date,
          detail.start_time,
          detail.end_time,
          detail.activity_description || null,
          detail.location_details || null,
          detail.instructor_id || null,
          detail.notes || null
        ).run();
      }
    }

    return jsonResponse(newSession, 201);
  } catch (error) {
    console.error('Error creating session:', error);
    return errorResponse('Failed to create session', 500);
  }
})

// Update a session
router.put('/api/sessions/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;
    
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Check if session exists
    const existingSession = await env.DB.prepare(
      'SELECT * FROM Course_Sessions WHERE session_id = ?'
    ).bind(id).first();

    if (!existingSession) {
      return errorResponse('Session not found', 404);
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const params = [];

    const allowedFields = [
      'course_id', 'start_date', 'start_time', 'end_date', 'end_time',
      'current_participants', 'status', 'notes', 'venue_details'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    // Add ID as the last parameter
    params.push(id);

    // Execute update
    await env.DB.prepare(
      `UPDATE Course_Sessions SET ${updateFields.join(', ')} WHERE session_id = ?`
    ).bind(...params).run();

    // Update schedule details if provided
    if (data.schedule_details && Array.isArray(data.schedule_details)) {
      // First, delete existing schedule details
      await env.DB.prepare(
        'DELETE FROM Course_Schedule_Details WHERE session_id = ?'
      ).bind(id).run();

      // Then insert new schedule details
      if (data.schedule_details.length > 0) {
        const scheduleStmt = await env.DB.prepare(`
          INSERT INTO Course_Schedule_Details (
            session_id, day_number, date, start_time, end_time, 
            activity_description, location_details, instructor_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const detail of data.schedule_details) {
          await scheduleStmt.bind(
            id,
            detail.day_number,
            detail.date,
            detail.start_time,
            detail.end_time,
            detail.activity_description || null,
            detail.location_details || null,
            detail.instructor_id || null,
            detail.notes || null
          ).run();
        }
      }
    }

    // Fetch updated session
    const updatedSession = await env.DB.prepare(
      'SELECT * FROM Course_Sessions WHERE session_id = ?'
    ).bind(id).first();

    return jsonResponse(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return errorResponse('Failed to update session', 500);
  }
})

// Delete a session
router.delete('/api/sessions/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;

    // Check if session exists
    const existingSession = await env.DB.prepare(
      'SELECT * FROM Course_Sessions WHERE session_id = ?'
    ).bind(id).first();

    if (!existingSession) {
      return errorResponse('Session not found', 404);
    }

    // Check if there are any bookings for this session
    const { count } = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM Bookings WHERE session_id = ?'
    ).bind(id).first();

    if (count > 0) {
      return errorResponse('Cannot delete session with existing bookings', 400);
    }

    // Delete associated schedule details first
    await env.DB.prepare(
      'DELETE FROM Course_Schedule_Details WHERE session_id = ?'
    ).bind(id).run();

    // Delete session
    await env.DB.prepare(
      'DELETE FROM Course_Sessions WHERE session_id = ?'
    ).bind(id).run();

    return jsonResponse({ success: true, message: 'Session deleted successfully' })
  } catch (error) {
    console.error('Error deleting session:', error);
    return errorResponse('Failed to delete session', 500);
  }
})

// --- USER ROUTES ---

// Get all users
router.get('/api/users', async (request, env, ctx) => {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    
    let query = 'SELECT * FROM Users';
    const params = [];
    
    if (email) {
      query += ' WHERE email = ?';
      params.push(email);
    }
    
    query += ' ORDER BY last_name, first_name';
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    return jsonResponse({ users: results })
  } catch (error) {
    console.error('Error fetching users:', error);
    return errorResponse('Failed to fetch users', 500);
  }
})

// Get a specific user by ID
router.get('/api/users/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;
    
    const user = await env.DB.prepare(
      'SELECT * FROM Users WHERE user_id = ?'
    ).bind(id).first();
    
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Get user's bookings
    const { results: bookings } = await env.DB.prepare(`
      SELECT b.*, c.course_name, s.start_date, s.start_time
      FROM Bookings b
      JOIN Course_Sessions s ON b.session_id = s.session_id
      JOIN Courses c ON s.course_id = c.course_id
      WHERE b.user_id = ?
      ORDER BY s.start_date DESC
    `).bind(id).all();
    
    // Remove sensitive information
    delete user.emergency_contact_name;
    delete user.emergency_contact_phone;
    delete user.medical_conditions;
    
    return jsonResponse({
      ...user,
      bookings
    })
  } catch (error) {
    console.error('Error fetching user:', error);
    return errorResponse('Failed to fetch user details', 500);
  }
})

// Create a new user
router.post('/api/users', async (request, env, ctx) => {
  try {
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate required fields
    const requiredFields = ['first_name', 'last_name', 'email'];
    const missingFields = validateRequiredFields(data, requiredFields);
    if (missingFields) {
      return errorResponse(missingFields, 400);
    }

    // Check if email already exists
    const existingUser = await env.DB.prepare(
      'SELECT * FROM Users WHERE email = ?'
    ).bind(data.email).first();

    if (existingUser) {
      return errorResponse('A user with this email already exists', 400);
    }

    // Insert new user
    const result = await env.DB.prepare(`
      INSERT INTO Users (
        first_name, last_name, email, phone, 
        emergency_contact_name, emergency_contact_phone,
        experience_level, medical_conditions, waiver_signed, 
        waiver_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.first_name,
      data.last_name,
      data.email,
      data.phone || null,
      data.emergency_contact_name || null,
      data.emergency_contact_phone || null,
      data.experience_level || 'beginner',
      data.medical_conditions || null,
      data.waiver_signed || false,
      data.waiver_date || null
    ).run();

    // Get the newly created user
    const newUser = await env.DB.prepare(
      'SELECT * FROM Users WHERE user_id = last_insert_rowid()'
    ).first();

    // Remove sensitive information
    delete newUser.emergency_contact_name;
    delete newUser.emergency_contact_phone;
    delete newUser.medical_conditions;

    return jsonResponse(newUser, 201);
  } catch (error) {
    console.error('Error creating user:', error);
    return errorResponse('Failed to create user', 500);
  }
})

// Update a user
router.put('/api/users/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;
    
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Check if user exists
    const existingUser = await env.DB.prepare(
      'SELECT * FROM Users WHERE user_id = ?'
    ).bind(id).first();

    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // If email is being changed, check if it's already taken
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await env.DB.prepare(
        'SELECT * FROM Users WHERE email = ? AND user_id != ?'
      ).bind(data.email, id).first();

      if (emailExists) {
        return errorResponse('This email is already registered to another user', 400);
      }
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const params = [];

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 
      'emergency_contact_name', 'emergency_contact_phone',
      'experience_level', 'medical_conditions', 'waiver_signed', 
      'waiver_date'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    // Add ID as the last parameter
    params.push(id);

    // Execute update
    await env.DB.prepare(
      `UPDATE Users SET ${updateFields.join(', ')} WHERE user_id = ?`
    ).bind(...params).run();

    // Fetch updated user
    const updatedUser = await env.DB.prepare(
      'SELECT * FROM Users WHERE user_id = ?'
    ).bind(id).first();

    // Remove sensitive information
    delete updatedUser.emergency_contact_name;
    delete updatedUser.emergency_contact_phone;
    delete updatedUser.medical_conditions;

    return jsonResponse(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return errorResponse('Failed to update user', 500);
  }
})

// Delete a user
router.delete('/api/users/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;

    // Check if user exists
    const existingUser = await env.DB.prepare(
      'SELECT * FROM Users WHERE user_id = ?'
    ).bind(id).first();

    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // Check if user has any bookings
    const { count } = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM Bookings WHERE user_id = ?'
    ).bind(id).first();

    if (count > 0) {
      return errorResponse(
        'Cannot delete user with existing bookings. Please cancel all bookings first.',
        400
      );
    }

    // Delete user
    await env.DB.prepare('DELETE FROM Users WHERE user_id = ?').bind(id).run();

    return jsonResponse({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error);
    return errorResponse('Failed to delete user', 500);
  }
})
// --- BOOKING ROUTES ---

// Get all bookings
router.get('/api/bookings', async (request, env, ctx) => {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const sessionId = url.searchParams.get('sessionId');
    
    let query = `
      SELECT b.*, u.first_name, u.last_name, u.email,
             s.start_date, s.start_time, c.course_name
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Course_Sessions s ON b.session_id = s.session_id
      JOIN Courses c ON s.course_id = c.course_id
    `;
    
    const params = [];
    const conditions = [];
    
    if (userId) {
      conditions.push('b.user_id = ?');
      params.push(userId);
    }
    
    if (sessionId) {
      conditions.push('b.session_id = ?');
      params.push(sessionId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY s.start_date, s.start_time';
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    return jsonResponse({ bookings: results })
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return errorResponse('Failed to fetch bookings', 500);
  }
})

// Get a specific booking by ID
router.get('/api/bookings/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;
    
    const booking = await env.DB.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.email,
             s.start_date, s.start_time, c.course_name, c.course_id
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Course_Sessions s ON b.session_id = s.session_id
      JOIN Courses c ON s.course_id = c.course_id
      WHERE b.booking_id = ?
    `).bind(id).first();
    
    if (!booking) {
      return errorResponse('Booking not found', 404);
    }
    
    return jsonResponse(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return errorResponse('Failed to fetch booking details', 500);
  }
})

// Create a new booking
router.post('/api/bookings', async (request, env, ctx) => {
  try {
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate required fields
    const requiredFields = ['user_id', 'session_id', 'payment_method'];
    const missingFields = validateRequiredFields(data, requiredFields);
    if (missingFields) {
      return errorResponse(missingFields, 400);
    }

    // Check if user exists
    const user = await env.DB.prepare(
      'SELECT * FROM Users WHERE user_id = ?'
    ).bind(data.user_id).first();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Check if session exists and has capacity
    const session = await env.DB.prepare(`
      SELECT s.*, c.max_participants
      FROM Course_Sessions s
      JOIN Courses c ON s.course_id = c.course_id
      WHERE s.session_id = ?
    `).bind(data.session_id).first();

    if (!session) {
      return errorResponse('Session not found', 404);
    }

    // Check if session is in the past
    const sessionDate = new Date(`${session.start_date}T${session.start_time}`);
    if (sessionDate < new Date()) {
      return errorResponse('Cannot book a session that has already started', 400);
    }

    // Check if session is full
    if (session.current_participants >= session.max_participants) {
      return errorResponse('Session is full', 400);
    }

    // Check if user already has a booking for this session
    const existingBooking = await env.DB.prepare(
      'SELECT * FROM Bookings WHERE user_id = ? AND session_id = ?'
    ).bind(data.user_id, data.session_id).first();

    if (existingBooking) {
      return errorResponse('User already has a booking for this session', 400);
    }

    // Get course pricing information
    const courseInfo = await env.DB.prepare(`
      SELECT c.regular_price, c.course_name
      FROM Courses c
      JOIN Course_Sessions s ON c.course_id = s.course_id
      WHERE s.session_id = ?
    `).bind(data.session_id).first();
    
    // Create payment intent with Stripe
    const stripe = getStripeInstance(env);
    const paymentIntent = await processPayment({
      amount: courseInfo.regular_price * 100, // Convert to cents
      currency: 'usd',
      paymentMethod: data.payment_method,
      metadata: {
        user_id: data.user_id,
        session_id: data.session_id,
        course_name: courseInfo.course_name
      }
    });
    
    if (!paymentIntent || paymentIntent.error) {
      return errorResponse(paymentIntent.error || 'Failed to create payment', 400);
    }

    // Insert new booking
    await env.DB.prepare(`
      INSERT INTO Bookings (
        user_id, session_id, booking_datetime, payment_status,
        payment_amount, payment_method, transaction_id, is_confirmed,
        attendance_status, cancellation_reason, refund_status
      ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.user_id,
      data.session_id,
      'payment_required',
      courseInfo.regular_price,
      data.payment_method,
      paymentIntent.id,
      data.is_confirmed || false,
      data.attendance_status || 'registered',
      data.cancellation_reason || null,
      data.refund_status || null
    ).run();

    // Update session participant count
    await env.DB.prepare(`
      UPDATE Course_Sessions 
      SET current_participants = current_participants + 1
      WHERE session_id = ?
    `).bind(data.session_id).run();

    // Get the newly created booking
    const newBooking = await env.DB.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.email,
             s.start_date, s.start_time, c.course_name
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Course_Sessions s ON b.session_id = s.session_id
      JOIN Courses c ON s.course_id = c.course_id
      WHERE b.booking_id = last_insert_rowid()
    `).first();

    // Add client secret to response (needed for frontend to confirm payment)
    newBooking.client_secret = paymentIntent.client_secret;
    
    return jsonResponse(newBooking, 201);
  } catch (error) {
    console.error('Error creating booking:', error);
    return errorResponse('Failed to create booking', 500);
  }
})

// Update a booking
router.put('/api/bookings/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;
    
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Check if booking exists
    const existingBooking = await env.DB.prepare(
      'SELECT * FROM Bookings WHERE booking_id = ?'
    ).bind(id).first();

    if (!existingBooking) {
      return errorResponse('Booking not found', 404);
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const params = [];

    const allowedFields = [
      'payment_status', 'payment_amount', 'payment_method', 
      'transaction_id', 'is_confirmed', 'attendance_status',
      'cancellation_reason', 'refund_status'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // If confirming payment with a payment intent
    if (data.payment_intent_id && data.payment_status === 'paid') {
      // Verify payment with Stripe
      try {
        const stripe = getStripeInstance(env);
        const paymentVerification = await stripe.paymentIntents.retrieve(data.payment_intent_id);
        if (paymentVerification.status !== 'succeeded') {
          return errorResponse('Payment has not been completed', 400);
        }
        // Payment verified, update is_confirmed
        updateFields.push('is_confirmed = ?');
        params.push(true);
      } catch (stripeError) {
        console.error('Stripe verification error:', stripeError);
        return errorResponse('Payment verification failed', 400);
      }
    }

    // Add ID as the last parameter
    params.push(id);

    // Execute update
    await env.DB.prepare(
      `UPDATE Bookings SET ${updateFields.join(', ')} WHERE booking_id = ?`
    ).bind(...params).run();

    // Handle cancellation: update session participant count if attendance status changed to cancelled
    if (data.attendance_status === 'cancelled' && existingBooking.attendance_status !== 'cancelled') {
      await env.DB.prepare(`
        UPDATE Course_Sessions 
        SET current_participants = current_participants - 1
        WHERE session_id = ?
      `).bind(existingBooking.session_id).run();
    }

    // Fetch updated booking
    const updatedBooking = await env.DB.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.email,
             s.start_date, s.start_time, c.course_name
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Course_Sessions s ON b.session_id = s.session_id
      JOIN Courses c ON s.course_id = c.course_id
      WHERE b.booking_id = ?
    `).bind(id).first();

    return jsonResponse(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return errorResponse('Failed to update booking', 500);
  }
})

// Delete a booking
router.delete('/api/bookings/:id', async (request, env, ctx) => {
  try {
    const { id } = request.params;

    // Check if booking exists
    const existingBooking = await env.DB.prepare(
      'SELECT * FROM Bookings WHERE booking_id = ?'
    ).bind(id).first();

    if (!existingBooking) {
      return errorResponse('Booking not found', 404);
    }

    // Check if the session hasn't happened yet
    const session = await env.DB.prepare(
      'SELECT * FROM Course_Sessions WHERE session_id = ?'
    ).bind(existingBooking.session_id).first();

    const sessionDate = new Date(`${session.start_date}T${session.start_time}`);
    const now = new Date();

    if (sessionDate < now) {
      return errorResponse('Cannot delete a booking for a session that has already occurred', 400);
    }

    // Delete booking
    await env.DB.prepare('DELETE FROM Bookings WHERE booking_id = ?').bind(id).run();

    // Update session participant count
    await env.DB.prepare(`
      UPDATE Course_Sessions 
      SET current_participants = current_participants - 1
      WHERE session_id = ?
    `).bind(existingBooking.session_id).run();

    return jsonResponse({ success: true, message: 'Booking deleted successfully' })
  } catch (error) {
    console.error('Error deleting booking:', error);
    return errorResponse('Failed to delete booking', 500);
  }
})

// Stripe webhook endpoint
router.post('/api/webhooks/stripe', async (request, env, ctx) => {
  try {
    const stripe = getStripeInstance(env);
    const result = await handleStripeWebhook(request, env.STRIPE_WEBHOOK_SECRET);
    return jsonResponse(result, result.code);
  } catch (error) {
    return errorResponse('Webhook processing failed', 500);
  }
});

// Export the fetch handler for the Worker
export default {
  async fetch(request, env, ctx) {
    // Handle OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    try {
      const url = new URL(request.url);
      
      // Health check endpoint
      if (url.pathname === '/api/health') {
        return wrapResponse(new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json'
          }
        }));
      }

      // Events endpoints
      if (url.pathname === '/api/events') {
        if (request.method === 'GET') {
          // TODO: Implement event fetching from D1
          return wrapResponse(new Response(JSON.stringify([
            // Sample event data
            {
              id: 1,
              title: 'Test Event',
              start: new Date().toISOString(),
              end: new Date(Date.now() + 3600000).toISOString(),
            }
          ]), {
            headers: {
              'Content-Type': 'application/json'
            }
          }));
        }
      }

      // Try handling image routes
      const imageResponse = await handleImageRoutes(request, env);
      if (imageResponse) {
        return wrapResponse(imageResponse);
      }

      // Handle the request with our router
      const response = await router.handle(request, env, ctx);
      return wrapResponse(response);
    }      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "An unexpected error occurred",
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }),
        {
          status: error.status || 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
