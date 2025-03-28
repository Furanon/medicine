 * @param {Object} request.body - Event data
 * @returns {Object} Created event and its instances
 */
eventsRouter.post('/api/events', async (request, env, ctx) => {
  try {
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate required fields
    const requiredFields = ['title', 'startTime', 'endTime', 'venueId'];
    const missingFields = validateRequiredFields(data, requiredFields);
    if (missingFields) {
      return errorResponse(missingFields, 400);
    }

    // Parse recurrence rule if provided
    let recurrenceRule = null;
    if (data.recurrenceRule) {
      try {
        recurrenceRule = parseRRule(data.recurrenceRule);
      } catch (error) {
        return errorResponse(`Invalid recurrence rule: ${error.message}`, 400);
      }
    }

    // Extract start date from startTime
    const startDate = data.startTime.split('T')[0];
    
    // Create transaction to ensure all operations succeed or fail together
    const event = {
      title: data.title,
      description: data.description || null,
      start_date: startDate,
      end_date: data.endTime ? data.endTime.split('T')[0] : startDate,
      start_time: data.startTime.split('T')[1].substring(0, 8),
      end_time: data.endTime ? data.endTime.split('T')[1].substring(0, 8) : null,
      location: data.venueId
    };

    // Insert recurring event
    const recurringEventResult = await env.DB.prepare(`
      INSERT INTO Recurring_Events (
        title, description, start_date, end_date, 
        frequency, interval, days_of_week,
        start_time, end_time, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event.title,
      event.description,
      event.start_date,
      event.end_date,
      recurrenceRule ? recurrenceRule.frequency : null,
      recurrenceRule ? recurrenceRule.interval : null,
      recurrenceRule ? recurrenceRule.days_of_week : null,
      event.start_time,
      event.end_time,
      event.location
    ).run();

    // Get the newly created event ID
    const newEventResult = await env.DB.prepare(
      'SELECT * FROM Recurring_Events WHERE id = last_insert_rowid()'
    ).first();

    // Generate event instances if it's a recurring event
    if (recurrenceRule && newEventResult) {
      // Determine how many instances to generate initially
      const instanceCount = recurrenceRule.count || 10;
      
      // Generate instances
      const instances = generateInstances(newEventResult, recurrenceRule, instanceCount);
      
      // Insert instances
      const insertInstanceStmt = await env.DB.prepare(`
        INSERT INTO Event_Instances (
          recurring_event_id, instance_date, start_time, end_time,
          title, description, location, is_cancelled
        

// Get all recurring events
eventsRouter.get('/api/events', async (request, env, ctx) => {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    // Get events with pagination
    const eventsResult = await env.DB.prepare(`
      SELECT * FROM Recurring_Events
      ORDER BY start_date DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    // Get the total count for pagination metadata
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM Recurring_Events
    `).first();
    
    const events = eventsResult.results || [];
    
    // Optionally fetch the next upcoming instance for each event
    if (events.length > 0) {
      const eventIds = events.map(event => event.id);
      
      // Using a single query with WHERE IN for better performance
      const instancesQuery = `
        SELECT i.* FROM Event_Instances i
        JOIN (
          SELECT recurring_event_id, MIN(instance_date) as next_date
          FROM Event_Instances
          WHERE recurring_event_id IN (${eventIds.map(() => '?').join(',')})
          AND instance_date >= DATE('now')
          AND is_cancelled = 0
          GROUP BY recurring_event_id
        ) n ON i.recurring_event_id = n.recurring_event_id AND i.instance_date = n.next_date
      `;
      
      const upcomingInstances = await env.DB.prepare(instancesQuery)
        .bind(...eventIds)
        .all();
      
      // Map instances to their respective events
      const instanceMap = {};
      (upcomingInstances.results || []).forEach(instance => {
        instanceMap[instance.recurring_event_id] = instance;
      });
      
      // Add the next instance to each event
      events.forEach(event => {
        event.nextInstance = instanceMap[event.id] || null;
      });
    }
    
    return jsonResponse({
      events,
      pagination: {
        total: countResult ? countResult.total : 0,
        limit,
        offset,
        hasMore: countResult && (offset + limit < countResult.total)
      }
    });
  } catch (error) {
    console.error('Error retrieving events:', error);
    return errorResponse(`Error retrieving events: ${error.message}`, 500);
  }
});

// Get a specific recurring event by ID
eventsRouter.get('/api/events/:id', async (request, env, ctx) => {
  try {
    const eventId = request.params.id;
    
    // Get the event details
    const event = await env.DB.prepare(`
      SELECT * FROM Recurring_Events
      WHERE id = ?
    `).bind(eventId).first();
    
    if (!event) {
      return errorResponse('Event not found', 404);
    }
    
    // Get the event instances
    const instances = await env.DB.prepare(`
      SELECT * FROM Event_Instances
      WHERE recurring_event_id = ?
      ORDER BY instance_date ASC
    `).bind(eventId).all();
    
    return jsonResponse({
      event,
      instances: instances.results || []
    });
  } catch (error) {
    console.error('Error retrieving event:', error);
    return errorResponse(`Error retrieving event: ${error.message}`, 500);
  }
});

/**
 * Update a recurring event by ID
 * 
 * @route PUT /api/events/:id
 * @param {string} id - ID of the event to update
 * @param {Object} request.body - Updated event data
 * @param {string} request.body.title - Event title
 * @param {string} request.body.description - Event description
 * @param {string} request.body.startTime - Event start time (ISO format)
 * @param {string} request.body.endTime - Event end time (ISO format)
 * @param {string} request.body.venueId - Location/venue ID
 * @param {string} request.body.recurrenceRule - RRULE format string
 * @param {string} request.body.updateScope - Scope of update: "this", "thisAndFuture", or "all"
 * @returns {Object} Updated event and its instances
 */
eventsRouter.put('/api/events/:id', async (request, env, ctx) => {
  try {
    const eventId = request.params.id;
    
    // Parse JSON request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    // Validate required fields
    const requiredFields = ['title', 'startTime', 'endTime', 'venueId'];
    const missingFields = validateRequiredFields(data, requiredFields);
    if (missingFields) {
      return errorResponse(missingFields, 400);
    }
    
    // Get the existing event
    const existingEvent = await env.DB.prepare(`
      SELECT * FROM Recurring_Events
      WHERE id = ?
    `).bind(eventId).first();
    
    if (!existingEvent) {
      return errorResponse('Event not found', 404);
    }
    
    // Parse recurrence rule if provided
    let recurrenceRule = null;
    if (data.recurrenceRule) {
      try {
        recurrenceRule = parseRRule(data.recurrenceRule);
      } catch (error) {
        return errorResponse(`Invalid recurrence rule: ${error.message}`, 400);
      }
    }
    
    // Extract start date from startTime
    const startDate = data.startTime.split('T')[0];
    
    // Determine update scope
    const updateScope = data.updateScope || 'all'; // Default to 'all'
    
    // Create transaction
    const db = env.DB;
    
    try {
      await db.prepare('BEGIN').run();
      
      // Update the recurring event
      await db.prepare(`
        UPDATE Recurring_Events 
        SET 
          title = ?,
          description = ?,
          start_date = ?,
          end_date = ?,
          frequency = ?,
          interval = ?,
          days_of_week = ?,
          start_time = ?,
          end_time = ?,
          location = ?
        WHERE id = ?
      `).bind(
        data.title,
        data.description || null,
        startDate,
        data.endTime ? data.endTime.split('T')[0] : startDate,
        recurrenceRule ? recurrenceRule.frequency : null,
        recurrenceRule ? recurrenceRule.interval : null,
        recurrenceRule ? recurrenceRule.days_of_week : null,
        data.startTime.split('T')[1].substring(0, 8),
        data.endTime ? data.endTime.split('T')[1].substring(0, 8) : null,
        data.venueId,
        eventId
      ).run();
      
      // Handle instances based on updateScope
      const today = new Date().toISOString().split('T')[0];
      
      if (updateScope === 'all') {
        // Delete all non-modified instances
        await db.prepare(`
          DELETE FROM Event_Instances
          WHERE recurring_event_id = ?
          AND instance_date NOT IN (
            SELECT instance_date FROM Event_Exceptions
            WHERE recurring_event_id = ?
          )
        `).bind(eventId, eventId).run();
        
      } else if (updateScope === 'thisAndFuture') {
        // Delete future non-modified instances
        await db.prepare(`
          DELETE FROM Event_Instances
          WHERE recurring_event_id = ?
          AND instance_date >= ?
          AND instance_date NOT IN (
            SELECT instance_date FROM Event_Exceptions
            WHERE recurring_event_id = ?
          )
        `).bind(eventId, today, eventId).run();
      }
      
      // Regenerate instances if it's a recurring event
      if (recurrenceRule) {
        // Get the updated event details
        const updatedEvent = await db.prepare(`
          SELECT * FROM Recurring_Events WHERE id = ?
        `).bind(eventId).first();
        
        // Determine how many instances to generate
        const instanceCount = recurrenceRule.count || 10;
        
        // Generate instances
        const instances = generateInstances(updatedEvent, recurrenceRule, instanceCount);
        
        // Prepare statement for inserting instances
        const insertInstanceStmt = await db.prepare(`
          INSERT INTO Event_Instances (
            recurring_event_id, instance_date, start_time, end_time,
            title, description, location, is_cancelled
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(recurring_event_id, instance_date) DO UPDATE SET
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            title = excluded.title,
            description = excluded.description,
            location = excluded.location
        `);
        
        // Insert new or update existing instances
        for (const instance of instances) {
          // Skip past instances if scope is 'thisAndFuture'
          if (updateScope === 'thisAndFuture' && instance.instance_date < today) {
            continue;
          }
          
          await insertInstanceStmt.bind(
            instance.recurring_event_id,
            instance.instance_date,
            instance.start_time,
            instance.end_time,
            instance.title,
            instance.description,
            instance.location,
            instance.is_cancelled ? 1 : 0
          ).run();
        }
      }
      
      await db.prepare('COMMIT').run();
      
      // Fetch the updated event and its instances
      const updatedEvent = await db.prepare(`
        SELECT * FROM Recurring_Events WHERE id = ?
      `).bind(eventId).first();
      
      const updatedInstances = await db.prepare(`
        SELECT * FROM Event_Instances 
        WHERE recurring_event_id = ? 
        ORDER BY instance_date ASC
      `).bind(eventId).all();
      
      return jsonResponse({
        event: updatedEvent,
        instances: updatedInstances.results || []
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.prepare('ROLLBACK').run();
      throw error;
    }
    
  } catch (error) {
    console.error('Error updating recurring event:', error);
    return errorResponse(`Error updating recurring event: ${error.message}`, 500);
  }
});

/**
 * Delete a recurring event by ID
 * 
 * @route DELETE /api/events/:id
 * @param {string} id - ID of the event to delete
 * @param {string} request.query.deleteScope - Scope of deletion: "this", "thisAndFuture", or "all"
 * @returns {Object} Confirmation of deletion
 */
eventsRouter.delete('/api/events/:id', async (request, env, ctx) => {
  try {
    const eventId = request.params.id;
    const url = new URL(request.url);
    const deleteScope = url.searchParams.get('deleteScope') || 'all'; // Default to 'all'
    const instanceDate = url.searchParams.get('instanceDate'); // For 'this' scope
    
    // Verify event exists
    const existingEvent = await env.DB.prepare(`
      SELECT * FROM Recurring_Events
      WHERE id = ?
    `).bind(eventId).first();
    
    if (!existingEvent) {
      return errorResponse('Event not found', 404);
    }
    
    // Create transaction
    const db = env.DB;
    
    try {
      await db.prepare('BEGIN').run();
      
      if (deleteScope === 'all') {
        // Delete all instances first (cascading delete)
        await db.prepare(`
          DELETE FROM Event_Instances
          WHERE recurring_event_id = ?
        `).bind(eventId).run();
        
        // Delete all exceptions
        await db.prepare(`
          DELETE FROM Event_Exceptions
          WHERE recurring_event_id = ?
        `).bind(eventId).run();
        
        // Delete the recurring event
        await db.prepare(`
          DELETE FROM Recurring_Events
          WHERE id = ?
        `).bind(eventId).run();
        
      } else if (deleteScope === 'thisAndFuture' && instanceDate) {
        // Mark future instances as cancelled
        await db.prepare(`
          UPDATE Event_Instances
          SET is_cancelled = 1
          WHERE recurring_event_id = ?
          AND instance_date >= ?
        `).bind(eventId, instanceDate).run();
        
        // Create exceptions for these instances
        const futureDates = await db.prepare(`
          SELECT instance_date FROM Event_Instances
          WHERE recurring_event_id = ?
          AND instance_date >= ?
        `).bind(eventId, instanceDate).all();
        
        // Insert exceptions for each cancelled instance
        if (futureDates.results && futureDates.results.length > 0) {
          const insertExceptionStmt = await db.prepare(`
            INSERT OR IGNORE INTO Event_Exceptions (
              recurring_event_id, instance_date, exception_type
            ) VALUES (?, ?, 'cancelled')
          `);
          
          for (const dateObj of futureDates.results) {
            await insertExceptionStmt.bind(eventId, dateObj.instance_date).run();
          }
        }
        
      } else if (deleteScope === 'this' && instanceDate) {
        // Mark the specific instance as cancelled
        await db.prepare(`
          UPDATE Event_Instances
          SET is_cancelled = 1
          WHERE recurring_event_id = ?
          AND instance_date = ?
        `).bind(eventId, instanceDate).run();
        
        // Create an exception for this instance
        await db.prepare(`
          INSERT OR IGNORE INTO Event_Exceptions (
            recurring_event_id, instance_date, exception_type
          ) VALUES (?, ?, 'cancelled')
        `).bind(eventId, instanceDate).run();
      }
      
      await db.prepare('COMMIT').run();
      
      return jsonResponse({
        success: true,
        message: `Event ${deleteScope === 'all' ? 'deleted' : 'cancelled'} successfully`,
        scope: deleteScope
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.prepare('ROLLBACK').run();
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting recurring event:', error);
    return errorResponse(`Error deleting recurring event: ${error.message}`, 500);
  }
});

// Export the router for use in the main application
module.exports = eventsRouter;
