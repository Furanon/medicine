import { format, parseISO, addDays, addMonths, getDay, isSameDay, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, format as formatTZ } from 'date-fns-tz';
import { RRule, RRuleSet, rrulestr } from 'rrule';

// Preserve existing date formatting functions
export const formatDateTime = (date) => {
  return format(parseISO(date), 'PPpp');
};

export const formatDate = (date) => {
  return format(parseISO(date), 'PP');
};

export const formatTime = (date) => {
  return format(parseISO(date), 'pp');
};

export const toISOString = (date) => {
  return date.toISOString().slice(0, 16);
};

/**
 * Get user's timezone
 * @returns {string} - User's timezone (e.g., 'America/New_York')
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

/**
 * Convert local date to UTC
 * @param {Date|string} date - Date to convert
 * @param {string} [timezone=getUserTimezone()] - Timezone of the input date
 * @returns {Date} - UTC date
 */
export const toUTC = (date, timezone = getUserTimezone()) => {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return zonedTimeToUtc(parsedDate, timezone);
  } catch (error) {
    console.error('Error converting to UTC:', error);
    return new Date();
  }
};

/**
 * Convert UTC date to local timezone
 * @param {Date|string} utcDate - UTC date to convert
 * @param {string} [timezone=getUserTimezone()] - Target timezone
 * @returns {Date} - Date in the specified timezone
 */
export const fromUTC = (utcDate, timezone = getUserTimezone()) => {
  try {
    const parsedDate = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return utcToZonedTime(parsedDate, timezone);
  } catch (error) {
    console.error('Error converting from UTC:', error);
    return new Date();
  }
};

/**
 * Format a date with timezone consideration
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (date-fns format)
 * @param {string} [timezone=getUserTimezone()] - Timezone for formatting
 * @returns {string} - Formatted date string
 */
export const formatWithTimezone = (date, formatStr, timezone = getUserTimezone()) => {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return formatTZ(parsedDate, formatStr, { timeZone: timezone });
  } catch (error) {
    console.error('Error formatting with timezone:', error);
    return '';
  }
};

/**
 * Parse an RRULE string and return a configured RRule object
 * @param {string} rruleString - iCalendar RRULE string
 * @param {Date} startDate - Start date of the recurring event
 * @returns {RRule|null} - RRule object or null if parsing fails
 */
export const parseRRule = (rruleString, startDate) => {
  try {
    if (!rruleString) return null;
    
    // Create options from the RRULE string and set the start date
    const options = RRule.parseString(rruleString);
    options.dtstart = startDate;
    
    return new RRule(options);
  } catch (error) {
    console.error('Error parsing RRULE:', error);
    return null;
  }
};

/**
 * Generate occurrences of a recurring event
 * @param {string} rruleString - iCalendar RRULE string
 * @param {Date|string} startDate - Start date of the recurring event
 * @param {Date|string} [until] - End date for occurrence calculation
 * @param {number} [count=50] - Maximum number of occurrences to generate
 * @returns {Date[]} - Array of occurrence dates
 */
export const generateEventOccurrences = (rruleString, startDate, until, count = 50) => {
  try {
    const parsedStartDate = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const rrule = parseRRule(rruleString, parsedStartDate);
    
    if (!rrule) return [parsedStartDate];
    
    const options = {
      count: count
    };
    
    if (until) {
      options.until = typeof until === 'string' ? parseISO(until) : until;
    }
    
    return rrule.all(options);
  } catch (error) {
    console.error('Error generating occurrences:', error);
    return [typeof startDate === 'string' ? parseISO(startDate) : startDate];
  }
};

/**
 * Check if a date is an exception to a recurring event
 * @param {Date} date - Date to check
 * @param {Array} exceptions - Array of exception dates or objects with exceptionDate property
 * @returns {boolean} - True if the date is an exception
 */
export const isDateException = (date, exceptions = []) => {
  if (!exceptions || !exceptions.length) return false;
  
  return exceptions.some(exception => {
    const exceptionDate = exception.exceptionDate 
      ? parseISO(exception.exceptionDate) 
      : (typeof exception === 'string' ? parseISO(exception) : exception);
    
    return isSameDay(date, exceptionDate);
  });
};

/**
 * Get all dates for an event, considering recurrence and exceptions
 * @param {Object} event - Event object with start_time, end_time, and recurrence_rule
 * @param {Array} exceptions - Array of exception dates or objects
 * @param {Date} [rangeStart] - Start of the range to generate dates for
 * @param {Date} [rangeEnd] - End of the range to generate dates for
 * @returns {Array} - Array of event objects with start and end dates
 */
export const getEventDatesInRange = (event, exceptions = [], rangeStart, rangeEnd) => {
  try {
    const { start_time, end_time, recurrence_rule, event_id } = event;
    const eventStart = parseISO(start_time);
    const eventEnd = parseISO(end_time);
    const duration = eventEnd.getTime() - eventStart.getTime();

    // If not recurring, just return the single event if it's in range
    if (!recurrence_rule) {
      if (rangeStart && isAfter(rangeStart, eventEnd)) return [];
      if (rangeEnd && isBefore(rangeEnd, eventStart)) return [];
      
      return [{
        ...event,
        start: eventStart,
        end: eventEnd,
        isRecurring: false
      }];
    }

    // Get all occurrences within the specified range
    const occurrences = generateEventOccurrences(
      recurrence_rule,
      eventStart,
      rangeEnd || addMonths(new Date(), 6),
      100
    );

    // Filter occurrences by range and exceptions
    return occurrences
      .filter(date => {
        if (isDateException(date, exceptions)) return false;
        if (rangeStart && isBefore(date, rangeStart)) return false;
        if (rangeEnd && isAfter(date, rangeEnd)) return false;
        return true;
      })
      .map(date => {
        const occurEnd = new Date(date.getTime() + duration);
        return {
          ...event,
          start: date,
          end: occurEnd,
          isRecurring: true,
          originalStartDate: eventStart,
          recurringEventId: event_id
        };
      });
  } catch (error) {
    console.error('Error calculating event dates:', error);
    return [];
  }
};

/**
 * Get the next occurrence of a recurring event after a specified date
 * @param {string} rruleString - iCalendar RRULE string
 * @param {Date|string} startDate - Start date of the recurring event
 * @param {Date|string} afterDate - Date to start looking for occurrences
 * @returns {Date|null} - Next occurrence date or null if none found
 */
export const getNextOccurrence = (rruleString, startDate, afterDate) => {
  try {
    const parsedStartDate = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const parsedAfterDate = typeof afterDate === 'string' ? parseISO(afterDate) : afterDate;
    
    const rrule = parseRRule(rruleString, parsedStartDate);
    if (!rrule) return null;
    
    const nextDates = rrule.after(parsedAfterDate, true);
    return nextDates || null;
  } catch (error) {
    console.error('Error finding next occurrence:', error);
    return null;
  }
};
