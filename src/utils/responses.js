/**
 * Response utility functions for API responses
 */

/**
 * Creates a standardized JSON response with appropriate headers
 * @param {Object} data - The data to be returned in the response body
 * @param {number} status - HTTP status code (default: 200)
 * @returns {Response} - A Response object with JSON content type
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    status
  });
}

/**
 * Creates a standardized error response
 * @param {string} message - Error message to be returned
 * @param {number} status - HTTP status code (default: 400)
 * @returns {Response} - A Response object with error details
 */
export function errorResponse(message, status = 400) {
  return jsonResponse({
    success: false,
    error: message
  }, status);
}

/**
 * Validates that all required fields are present in the request body
 * @param {Object} body - The request body to validate
 * @param {Array<string>} requiredFields - Array of field names that are required
 * @returns {Object} - Object with validation result and error message if applicable
 */
export function validateRequiredFields(body, requiredFields) {
  const missingFields = requiredFields.filter(field => !body[field]);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }
  
  return {
    valid: true
  };
}

