import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { executeWithTransaction } from '../utils/test-helpers';

// Base URL for recurring events API
const RECURRING_EVENTS_ENDPOINT = 'http://example.com/api/recurring-events';
const EVENT_INSTANCES_ENDPOINT = 'http://example.com/api/event-instances';
const EVENT_EXCEPTIONS_ENDPOINT = 'http://example.com/api/event-exceptions';

// Helper function to create a recurring event
async function createRecurringEvent(eventData) {
  const defaultEvent = {
    title: 'Test Recurring Event',
    description: 'This is a test recurring event',
    start_date: '2023-01-01',
    end_date: '2023-12-31',
    frequency: 'daily',
    interval: 1,
    start_time: '09:00',
    end_time: '10:00',
    location: 'Test Location'
  };

  const response = await SELF.fetch(RECURRING_EVENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...defaultEvent, ...eventData }),
  });

  return {
    status: response.status,
    data: await response.json()
  };
}

// Helper function to get all instances of a recurring event
async function getEventInstances(recurringEventId) {
  const response = await SELF.fetch(`${EVENT_INSTANCES_ENDPOINT}?recurring_event_id=${recurringEventId}`);
  return await response.json();
}

// Helper function to update a recurring event
async function updateRecurringEvent(eventId, updateData, updateMethod = 'single') {
  const response = await SELF.fetch(`${RECURRING_EVENTS_ENDPOINT}/${eventId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'X-Update-Method': updateMethod // single, all, future
    },
    body: JSON.stringify(updateData),
  });

  return {
    status: response.status,
    data: await response.json()
  };
}

// Helper function to delete a recurring event
async function deleteRecurringEvent(eventId, deleteMethod = 'single') {
  const response = await SELF.fetch(`${RECURRING_EVENTS_ENDPOINT}/${eventId}`, {
    method: 'DELETE',
    headers: {
      'X-Delete-Method': deleteMethod // single, all, future
    }
  });

  return {
    status: response.status,
    data: response.status !== 204 ? await response.json() : null
  };
}

// Helper function to create an exception for a recurring event
async function createEventException(recurringEventId, exceptionData) {
  const defaultException = {
    exception_date: '2023-01-15',
    reason: 'Test Exception'
  };

  const response = await SELF.fetch(EVENT_EXCEPTIONS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      recurring_event_id: recurringEventId,
      ...defaultException,
      ...exceptionData 
    }),
  });

  return {
    status: response.status,
    data: await response.json()
  };
}

// Helper function to verify database entries
async function verifyDatabaseEntries(recurringEventId) {
  // Get recurring event
  const eventQuery = await env.DB.prepare(
    'SELECT * FROM Recurring_Events WHERE id = ?'
  ).bind(recurringEventId).all();
  
  // Get event instances
  const instancesQuery = await env.DB.prepare(
    'SELECT * FROM Event_Instances WHERE recurring_event_id = ?'
  ).bind(recurringEventId).all();
  
  // Get event exceptions
  const exceptionsQuery = await env.DB.prepare(
    'SELECT * FROM Event_Exceptions WHERE recurring_event_id = ?'
  ).bind(recurringEventId).all();
  
  return {
    event: eventQuery.results && eventQuery.results.length > 0 ? eventQuery.results[0] : null,
    instances: instancesQuery.results || [],
    exceptions: exceptionsQuery.results || []
  };
}

// Helper to count number of instances between dates
async function countInstancesBetweenDates(recurringEventId, startDate, endDate) {
  const query = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM Event_Instances WHERE recurring_event_id = ? AND instance_date BETWEEN ? AND ?'
  ).bind(recurringEventId, startDate, endDate).all();
  
  return query.results[0].count;
}

describe('Recurring Events API Integration Tests', () => {
  
  // Test suite for event creation with different recurrence patterns
  describe('Event Creation with Different Recurrence Patterns', () => {
    
    it('should create a daily recurring event', async () => {
      // Create a daily recurring event
      const eventData = {
        title: 'Daily Meeting',
        description: 'Daily standup meeting',
        start_date: '2023-01-01',
        end_date: '2023-01-10',
        frequency: 'daily',
        interval: 1,
        start_time: '09:00',
        end_time: '09:30',
        location: 'Conference Room A'
      };
      
      const { status, data } = await createRecurringEvent(eventData);
      expect(status).toBe(201);
      expect(data).toHaveProperty('id');
      
      // Verify the number of instances created (should be 10 days)
      const instances = await getEventInstances(data.id);
      expect(instances.data).toHaveLength(10);
      
      // Verify database entries
      const dbEntries = await verifyDatabaseEntries(data.id);
      expect(dbEntries.event).not.toBeNull();
      expect(dbEntries.instances).toHaveLength(10);
      expect(dbEntries.event.frequency).toBe('daily');
    });
    
    it('should create a weekly recurring event', async () => {
      // Create a weekly recurring event (every Monday and Wednesday)
      const eventData = {
        title: 'Weekly Team Meeting',
        description: 'Weekly team sync',
        start_date: '2023-01-02', // Monday
        end_date: '2023-01-31',
        frequency: 'weekly',
        interval: 1,
        days_of_week: 'Monday,Wednesday', // Multiple days
        start_time: '14:00',
        end_time: '15:00',
        location: 'Conference Room B'
      };
      
      const { status, data } = await createRecurringEvent(eventData);
      expect(status).toBe(201);
      expect(data).toHaveProperty('id');
      
      // Check instances (should be about 8-9 instances - all Mondays and Wednesdays in January)
      const instances = await getEventInstances(data.id);
      expect(instances.data.length).toBeGreaterThanOrEqual(8);
      
      // Verify each instance falls on either Monday or Wednesday
      for (const instance of instances.data) {
        const date = new Date(instance.instance_date);
        const dayOfWeek = date.getDay();
        // Sunday is 0, Monday is 1, Wednesday is 3
        expect(dayOfWeek === 1 || dayOfWeek === 3).toBe(true);
      }
    });
    
    it('should create a monthly recurring event', async () => {
      // Create a monthly recurring event (15th of each month)
      const eventData = {
        title: 'Monthly Review',
        description: 'Monthly performance review',
        start_date: '2023-01-15',
        end_date: '2023-12-15',
        frequency: 'monthly',
        interval: 1,
        start_time: '10:00',
        end_time: '11:30',
        location: 'Meeting Room 1'
      };
      
      const { status, data } = await createRecurringEvent(eventData);
      expect(status).toBe(201);
      expect(data).toHaveProperty('id');
      
      // Check instances (should be 12 instances - one for each month)
      const instances = await getEventInstances(data.id);
      expect(instances.data).toHaveLength(12);
      
      // Verify each instance falls on the 15th of the month
      for (const instance of instances.data) {
        const date = new Date(instance.instance_date);
        expect(date.getDate()).toBe(15);
      }
    });
    
    it('should create a yearly recurring event', async () => {
      // Create a yearly recurring event
      const eventData = {
        title: 'Annual Planning',
        description: 'Annual budget planning',
        start_date: '2023-01-10',
        end_date: '2033-01-10', // 10 years
        frequency: 'yearly',
        interval: 1,
        start_time: '09:00',
        end_time: '17:00',
        location: 'Boardroom'
      };
      
      const { status, data } = await createRecurringEvent(eventData);
      expect(status).toBe(201);
      expect(data).toHaveProperty('id');
      
      // Check instances (should be 11 instances - one per year for 10 years + the start year)
      const instances = await getEventInstances(data.id);
      expect(instances.data).toHaveLength(11);
      
      // Verify the dates are one year apart
      const dates = instances.data.map(instance => new Date(instance.instance_date)).sort((a, b) => a - b);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i].getFullYear() - dates[i-1].getFullYear()).toBe(1);
      }
    });
    
    it('should handle complex recurrence patterns', async () => {
      // Create a biweekly recurring event (every other Friday)
      const eventData = {
        title: 'Biweekly Report',
        description: 'Biweekly progress report',
        start_date: '2023-01-06', // Friday
        end_date: '2023-06-30',
        frequency: 'weekly',
        interval: 2, // Every other week
        days_of_week: 'Friday',
        start_time: '15:00',
        end_time: '16:00',
        location: 'Meeting Room C'
      };
      
      const { status, data } = await createRecurringEvent(eventData);
      expect(status).toBe(201);
      expect(data).toHaveProperty('id');
      
      // Get all instances
      const instances = await getEventInstances(data.id);
      
      // Verify all instances fall on Friday
      for (const instance of instances.data) {
        const date = new Date(instance.instance_date);
        expect(date.getDay()).toBe(5); // Friday is 5
      }
      
      // Verify biweekly pattern (dates should be 14 days apart)
      const dates = instances.data.map(instance => new Date(instance.instance_date)).sort((a, b) => a - b);
      for (let i = 1; i < dates.length; i++) {
        const dayDiff = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
        expect(dayDiff).toBe(14); // 14 days between occurrences
      }
    });
  });
  
  // Test suite for event updates across multiple recurrences
  describe('Event Updates Across Multiple Recurrences', () => {
    let recurringEventId;
    
    beforeEach(async () => {
      // Create a base recurring event for testing updates
      const eventData = {
        title: 'Update Test Event',
        description: 'Event to test updates',
        start_date: '2023-01-01',
        end_date: '2023-03-31',
        frequency: 'weekly',
        interval: 1,
        days_of_week: 'Monday',
        start_time: '10:00',
        end_time: '11:00',
        location: 'Test Room'
      };
      
      const { data } = await createRecurringEvent(eventData);
      recurringEventId = data.id;
    });
    
    it('should update a single instance of a recurring event', async () => {
      // Get all instances
      const instances = await getEventInstances(recurringEventId);
      const instanceId = instances.data[2].id; // Update the third instance
      
      // Update just one instance
      const updateData = {
        title: 'Updated Single Instance',
        location: 'New Location',
        start_time: '11:00',
        end_time: '12:00'
      };
      
      const response = await SELF.fetch(`${EVENT_INSTANCES_ENDPOINT}/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      expect(response.status).toBe(200);
      
      // Verify only that instance was updated
      const updatedInstances = await getEventInstances(recurringEventId);
      const updatedInstance = updatedInstances.data.find(i => i.id === instanceId);
      
      expect(updatedInstance.title).toBe('Updated Single Instance');
      expect(updatedInstance.location).toBe('New Location');
      expect(updatedInstance.start_time).toBe('11:00');
      
      // Check that other instances weren't updated
      const otherInstances = updatedInstances.data.filter(i => i.id !== instanceId);
      for (const instance of otherInstances) {
        expect(instance.title).toBe('Update Test Event');
        expect(instance.location).toBe('Test Room');
      }
    });
    
    it('should update all instances of a recurring event', async () => {
      // Update all instances
      const updateData = {
        title: 'Updated All Instances',
        description: 'All instances updated',
        location: 'Global Location'
      };
      
      const { status } = await updateRecurringEvent(recurringEventId, updateData, 'all');
      expect(status).toBe(200);
      
      // Verify all instances were updated
      const updatedInstances = await getEventInstances(recurringEventId);
      
      for (const instance of updatedInstances.data) {
        expect(instance.title).toBe('Updated All Instances');
        expect(instance.description).toBe('All instances updated');
        expect(instance.description).toBe('All instances updated');
        expect(instance.location).toBe('Global Location');
      }
      
      // Verify changes in database
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.event.title).toBe('Updated All Instances');
      expect(dbEntries.event.description).toBe('All instances updated');
    });
    
    it('should update future instances of a recurring event', async () => {
      // Get all instances to find a pivot point
      const instances = await getEventInstances(recurringEventId);
      const pivotInstanceId = instances.data[5].id; // Pick the 6th instance
      const pivotInstanceDate = instances.data[5].instance_date;
      
      // Update future instances from the pivot point
      const updateData = {
        title: 'Updated Future Instances',
        description: 'Future instances updated',
        location: 'Future Location',
        instance_id: pivotInstanceId // Specify the pivot instance
      };
      
      const { status } = await updateRecurringEvent(recurringEventId, updateData, 'future');
      expect(status).toBe(200);
      
      // Verify instances before the pivot weren't updated
      const updatedInstances = await getEventInstances(recurringEventId);
      
      // Check instances before pivot date
      const beforePivot = updatedInstances.data.filter(
        instance => new Date(instance.instance_date) < new Date(pivotInstanceDate)
      );
      
      for (const instance of beforePivot) {
        expect(instance.title).not.toBe('Updated Future Instances');
        expect(instance.location).not.toBe('Future Location');
      }
      
      // Check instances on or after pivot date
      const afterPivot = updatedInstances.data.filter(
        instance => new Date(instance.instance_date) >= new Date(pivotInstanceDate)
      );
      
      for (const instance of afterPivot) {
        expect(instance.title).toBe('Updated Future Instances');
        expect(instance.description).toBe('Future instances updated');
        expect(instance.location).toBe('Future Location');
      }
    });
    
    it('should handle time changes in recurring events', async () => {
      // Update the time for all instances
      const updateData = {
        start_time: '13:00',
        end_time: '14:30'
      };
      
      const { status } = await updateRecurringEvent(recurringEventId, updateData, 'all');
      expect(status).toBe(200);
      
      // Verify time changes in all instances
      const updatedInstances = await getEventInstances(recurringEventId);
      
      for (const instance of updatedInstances.data) {
        expect(instance.start_time).toBe('13:00');
        expect(instance.end_time).toBe('14:30');
      }
      
      // Verify time changes in database
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.event.start_time).toBe('13:00');
      expect(dbEntries.event.end_time).toBe('14:30');
    });
    
    it('should handle frequency changes in recurring events', async () => {
      // Change frequency from weekly to daily
      const updateData = {
        frequency: 'daily',
        interval: 2, // Every other day
        days_of_week: null // Clear the days of week as it's not needed for daily
      };
      
      const { status } = await updateRecurringEvent(recurringEventId, updateData, 'all');
      expect(status).toBe(200);
      
      // Count the number of instances before and after the change
      const beforeCount = await countInstancesBetweenDates(
        recurringEventId, 
        '2023-01-01', 
        '2023-01-31'
      );
      
      // Get updated instances
      const updatedInstances = await getEventInstances(recurringEventId);
      
      // Verify frequency change in parent event
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.event.frequency).toBe('daily');
      expect(dbEntries.event.interval).toBe(2);
      
      // Verify the new instances follow the updated pattern
      // Every other day should have roughly twice as many instances as weekly
      const afterCount = updatedInstances.data.filter(
        instance => new Date(instance.instance_date) <= new Date('2023-01-31')
      ).length;
      
      // Every other day (15-16 instances) vs weekly (4-5 instances)
      expect(afterCount).toBeGreaterThan(beforeCount);
    });
  });
  
  // Test suite for event deletion and instance management
  describe('Event Deletion and Instance Management', () => {
    let recurringEventId;
    
    beforeEach(async () => {
      // Create a base recurring event for testing deletion
      const eventData = {
        title: 'Deletion Test Event',
        description: 'Event to test deletion',
        start_date: '2023-02-01',
        end_date: '2023-04-30',
        frequency: 'weekly',
        interval: 1,
        days_of_week: 'Tuesday,Thursday',
        start_time: '09:00',
        end_time: '10:00',
        location: 'Deletion Test Room'
      };
      
      const { data } = await createRecurringEvent(eventData);
      recurringEventId = data.id;
    });
    
    it('should delete a single instance of a recurring event', async () => {
      // Get all instances
      const instances = await getEventInstances(recurringEventId);
      const instanceIdToDelete = instances.data[3].id; // Delete the 4th instance
      
      // Delete a single instance
      const { status } = await deleteRecurringEvent(instanceIdToDelete, 'single');
      expect(status).toBe(200);
      
      // Verify instance was deleted
      const updatedInstances = await getEventInstances(recurringEventId);
      const deletedInstance = updatedInstances.data.find(i => i.id === instanceIdToDelete);
      expect(deletedInstance).toBeUndefined();
      
      // Verify that an exception was created
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.exceptions.length).toBe(1);
      
      // Verify total count is reduced by 1
      expect(updatedInstances.data.length).toBe(instances.data.length - 1);
    });
    
    it('should delete all instances of a recurring event', async () => {
      // Delete all instances
      const { status } = await deleteRecurringEvent(recurringEventId, 'all');
      expect(status).toBe(200);
      
      // Verify all instances and the parent event were deleted
      const response = await SELF.fetch(`${RECURRING_EVENTS_ENDPOINT}/${recurringEventId}`);
      expect(response.status).toBe(404);
      
      // Verify no instances exist
      const instances = await getEventInstances(recurringEventId);
      expect(instances.data).toHaveLength(0);
      
      // Verify database has been cleaned up
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.event).toBeNull();
      expect(dbEntries.instances).toHaveLength(0);
      expect(dbEntries.exceptions).toHaveLength(0);
    });
    
    it('should delete future instances of a recurring event', async () => {
      // Get all instances to find a pivot point
      const instances = await getEventInstances(recurringEventId);
      const pivotInstanceId = instances.data[5].id; // Delete from the 6th instance forward
      const pivotInstanceDate = instances.data[5].instance_date;
      
      // Set up the deletion request
      const response = await SELF.fetch(`${RECURRING_EVENTS_ENDPOINT}/${recurringEventId}/instances/${pivotInstanceId}/future`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(200);
      
      // Verify instances before the pivot remain
      const updatedInstances = await getEventInstances(recurringEventId);
      
      // Calculate number of instances we expect to keep
      const expectedRemainingCount = instances.data.filter(
        instance => new Date(instance.instance_date) < new Date(pivotInstanceDate)
      ).length;
      
      expect(updatedInstances.data.length).toBe(expectedRemainingCount);
      
      // Verify no instances exist after the pivot date
      const afterPivot = updatedInstances.data.filter(
        instance => new Date(instance.instance_date) >= new Date(pivotInstanceDate)
      );
      
      expect(afterPivot).toHaveLength(0);
      
      // Verify the end_date of the parent event was updated
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      const endDate = new Date(dbEntries.event.end_date);
      const pivotDate = new Date(pivotInstanceDate);
      
      // End date should be before or on the pivot date
      expect(endDate.getTime()).toBeLessThanOrEqual(pivotDate.getTime());
    });
    
    it('should handle deletion with cascade in database', async () => {
      // Create an exception for one of the instances
      const instances = await getEventInstances(recurringEventId);
      const exceptionDate = new Date(instances.data[2].instance_date);
      
      await createEventException(recurringEventId, {
        exception_date: exceptionDate.toISOString().split('T')[0],
        reason: 'Test exception before deletion'
      });
      
      // Verify exception was created
      let dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.exceptions).toHaveLength(1);
      
      // Delete the recurring event
      const { status } = await deleteRecurringEvent(recurringEventId, 'all');
      expect(status).toBe(200);
      
      // Verify cascade deletion worked properly
      dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.event).toBeNull();
      expect(dbEntries.instances).toHaveLength(0);
      expect(dbEntries.exceptions).toHaveLength(0);
    });
  });
  
  // Test suite for exception handling for recurring events
  describe('Exception Handling for Recurring Events', () => {
    let recurringEventId;
    
    beforeEach(async () => {
      // Create a base recurring event for testing exceptions
      const eventData = {
        title: 'Exception Test Event',
        description: 'Event to test exceptions',
        start_date: '2023-03-01',
        end_date: '2023-05-31',
        frequency: 'weekly',
        interval: 1,
        days_of_week: 'Monday,Wednesday,Friday',
        start_time: '14:00',
        end_time: '15:00',
        location: 'Exception Test Room'
      };
      
      const { data } = await createRecurringEvent(eventData);
      recurringEventId = data.id;
    });
    
    it('should create an exception for a specific date', async () => {
      // Create an exception for a specific date
      const exceptionDate = '2023-03-15'; // A Wednesday
      const { status, data } = await createEventException(recurringEventId, {
        exception_date: exceptionDate,
        reason: 'Holiday exception'
      });
      
      expect(status).toBe(201);
      expect(data).toHaveProperty('id');
      
      // Verify instance for the exception date is excluded
      const instances = await getEventInstances(recurringEventId);
      const exceptedInstance = instances.data.find(
        instance => instance.instance_date === exceptionDate
      );
      
      expect(exceptedInstance).toBeUndefined();
      
      // Verify exception is recorded in database
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      const exception = dbEntries.exceptions.find(e => e.exception_date === exceptionDate);
      expect(exception).toBeDefined();
      expect(exception.reason).toBe('Holiday exception');
    });
    
    it('should modify an instance while creating an exception', async () => {
      // Get all instances
      const instances = await getEventInstances(recurringEventId);
      const instanceToModify = instances.data[4]; // 5th instance
      
      // Create a modified instance (exception)
      const response = await SELF.fetch(`${EVENT_INSTANCES_ENDPOINT}/${instanceToModify.id}/exception`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Modified Exception Instance',
          start_time: '16:00',
          end_time: '17:00',
          location: 'Exception Room',
          reason: 'Special occurrence'
        }),
      });
      
      expect(response.status).toBe(201);
      const exceptionData = await response.json();
      
      // Verify the exception instance has the modified properties
      expect(exceptionData).toHaveProperty('id');
      expect(exceptionData.title).toBe('Modified Exception Instance');
      expect(exceptionData.start_time).toBe('16:00');
      expect(exceptionData.end_time).toBe('17:00');
      
      // Verify database records
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.exceptions).toHaveLength(1);
      
      // Verify the exception is linked to the correct instance
      const exceptionDate = instanceToModify.instance_date;
      const exception = dbEntries.exceptions.find(e => e.exception_date === exceptionDate);
      expect(exception).toBeDefined();
      expect(exception.reason).toBe('Special occurrence');
    });
    
    it('should handle multiple exceptions for a recurring event', async () => {
      // Create multiple exceptions
      const exceptionDates = ['2023-03-06', '2023-03-15', '2023-03-24']; // Different weekdays
      
      for (const date of exceptionDates) {
        await createEventException(recurringEventId, {
          exception_date: date,
          reason: `Exception for ${date}`
        });
      }
      
      // Verify all exceptions were created
      const dbEntries = await verifyDatabaseEntries(recurringEventId);
      expect(dbEntries.exceptions).toHaveLength(exceptionDates.length);
      
      // Verify that the instances for these dates are excluded
      const instances = await getEventInstances(recurringEventId);
      for (const date of exceptionDates) {
