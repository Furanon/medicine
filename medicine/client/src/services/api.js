import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // You can modify the request config here (add headers, auth tokens, etc.)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || 'An unexpected error occurred'
    console.error('API Error:', errorMessage)
    
    // You can handle specific error cases here
    if (error.response?.status === 401) {
      // Handle unauthorized errors
      console.log('Unauthorized access, redirecting to login')
    }
    
    return Promise.reject({
      ...error,
      message: errorMessage,
      statusCode: error.response?.status
    })
  }
)
export const fetchEvents = async (params) => {
  const response = await api.get('/events', { params })
  return response.data
}

export const createEvent = async (eventData) => {
  const response = await api.post('/events', eventData)
  return response.data
}

export const updateEvent = async (eventId, eventData) => {
  const response = await api.put(`/events/${eventId}`, eventData)
  return response.data
}

export const deleteEvent = async (eventId) => {
  const response = await api.delete(`/events/${eventId}`)
  return response.data
}

// Venue Endpoints
export const fetchVenues = async (params) => {
  try {
    const response = await api.get('/venues', { params })
    return response.data
  } catch (error) {
    throw error
  }
}

export const getVenueDetails = async (venueId) => {
  try {
    const response = await api.get(`/venues/${venueId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const createVenue = async (venueData) => {
  try {
    const response = await api.post('/venues', venueData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateVenue = async (venueId, venueData) => {
  try {
    const response = await api.put(`/venues/${venueId}`, venueData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const deleteVenue = async (venueId) => {
  try {
    const response = await api.delete(`/venues/${venueId}`)
    return response.data
  } catch (error) {
    throw error
  }
}
103|
// Enhanced Endpoints for Recurring Events
/**
 * Fetches recurring events with expanded instances based on recurrence rules
 * @param {Object} params - Query parameters for filtering events
 * @param {Date} [params.startDate] - Start date range for expanded instances
 * @param {Date} [params.endDate] - End date range for expanded instances
 * @param {Boolean} [params.includeExceptions=true] - Whether to include exceptions
 * @returns {Promise<Array>} - Array of recurring events with expanded instances
 */
export const fetchRecurringEvents = async (params = {}) => {
  try {
    const response = await api.get('/events/recurring', { params })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Creates a new recurring event with recurrence rule
 * @param {Object} eventData - Event data including recurrence information
 * @param {String} eventData.title - Event title
 * @param {String} eventData.description - Event description
 * @param {Number} eventData.venueId - Venue ID
 * @param {Date} eventData.startTime - Event start time
 * @param {Date} eventData.endTime - Event end time
 * @param {String} eventData.recurrenceRule - iCalendar RRULE string
 * @param {Number} [eventData.maxParticipants] - Maximum number of participants
 * @returns {Promise<Object>} - Created recurring event object
 */
export const createRecurringEvent = async (eventData) => {
  if (!eventData.recurrenceRule) {
    throw new Error('Recurrence rule is required for recurring events')
  }
  
  try {
    const response = await api.post('/events/recurring', eventData)
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Updates a recurring event and its instances
 * @param {String|Number} eventId - ID of the recurring event
 * @param {Object} eventData - Updated event data
 * @param {String} [updateScope='this'] - Update scope: 'this', 'thisAndFuture', or 'all'
 * @returns {Promise<Object>} - Updated recurring event
 */
export const updateRecurringEvent = async (eventId, eventData, updateScope = 'this') => {
  try {
    const response = await api.put(`/events/recurring/${eventId}`, {
      ...eventData,
      updateScope
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Deletes a recurring event and its instances
 * @param {String|Number} eventId - ID of the recurring event
 * @param {String} [deleteScope='this'] - Delete scope: 'this', 'thisAndFuture', or 'all'
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteRecurringEvent = async (eventId, deleteScope = 'this') => {
  try {
    const response = await api.delete(`/events/recurring/${eventId}`, {
      params: { deleteScope }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Manages exceptions for recurring events (modify or cancel specific instances)
 * @param {String|Number} eventId - ID of the recurring event
 * @param {Object} exceptionData - Exception details
 * @param {Date} exceptionData.exceptionDate - Date of the exception
 * @param {String} exceptionData.modificationType - Type: 'cancel', 'modify'
 * @param {Object} [exceptionData.modifiedProperties] - Modified properties for this instance
 * @returns {Promise<Object>} - Created/updated exception
 */
export const manageEventExceptions = async (eventId, exceptionData) => {
  if (!exceptionData.exceptionDate) {
    throw new Error('Exception date is required')
  }
  
  if (!['cancel', 'modify'].includes(exceptionData.modificationType)) {
    throw new Error('Modification type must be either "cancel" or "modify"')
  }
  
  try {
    const response = await api.post(`/events/${eventId}/exceptions`, exceptionData)
    return response.data
  } catch (error) {
    throw error
  }
}

// Registration Management Endpoints
/**
 * Registers a user for an event
 * @param {String|Number} eventId - ID of the event
 * @param {Object} registrationData - Registration details
 * @param {String|Number} registrationData.userId - User ID
 * @param {String} [registrationData.status='pending'] - Registration status
 * @returns {Promise<Object>} - Created registration
 */
export const registerForEvent = async (eventId, registrationData) => {
  if (!registrationData.userId) {
    throw new Error('User ID is required for registration')
  }
  
  try {
    const response = await api.post(`/events/${eventId}/registrations`, registrationData)
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Cancels a user's registration for an event
 * @param {String|Number} eventId - ID of the event
 * @param {String|Number} registrationId - ID of the registration
 * @param {Object} [cancellationData] - Additional cancellation details
 * @returns {Promise<Object>} - Cancellation result
 */
export const cancelRegistration = async (eventId, registrationId, cancellationData = {}) => {
  try {
    const response = await api.delete(
      `/events/${eventId}/registrations/${registrationId}`, 
      { data: cancellationData }
    )
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Gets all registrations for an event
 * @param {String|Number} eventId - ID of the event
 * @param {Object} [params] - Query parameters for filtering
 * @param {String} [params.status] - Filter by registration status
 * @param {Number} [params.limit] - Limit number of results
 * @param {Number} [params.offset] - Offset for pagination
 * @returns {Promise<Array>} - Array of registrations
 */
export const getEventRegistrations = async (eventId, params = {}) => {
  try {
    const response = await api.get(`/events/${eventId}/registrations`, { params })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Updates the status of an event registration
 * @param {String|Number} eventId - ID of the event
 * @param {String|Number} registrationId - ID of the registration
 * @param {Object} updateData - Update details
 * @param {String} updateData.status - New status: 'confirmed', 'cancelled', 'waitlisted', etc.
 * @returns {Promise<Object>} - Updated registration
 */
export const updateRegistrationStatus = async (eventId, registrationId, updateData) => {
  if (!updateData.status) {
    throw new Error('Status is required for registration update')
  }
  
  if (!['confirmed', 'cancelled', 'waitlisted', 'pending', 'rejected'].includes(updateData.status)) {
    throw new Error('Invalid registration status')
  }
  
  try {
    const response = await api.patch(
      `/events/${eventId}/registrations/${registrationId}`,
      updateData
    )
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Gets registration capacity information for an event
 * @param {String|Number} eventId - ID of the event
 * @returns {Promise<Object>} - Capacity information
 */
export const getRegistrationCapacity = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}/capacity`)
    return response.data
  } catch (error) {
    throw error
  }
}
