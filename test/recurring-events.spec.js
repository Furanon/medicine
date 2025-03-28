import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import worker from '../src';

describe('Recurring Events API', () => {
  // Helper function to create a recurring event
  async function createRecurringEvent(eventData = {}) {
    const defaultData = {
      title: 'Test Recurring Event',
      startTime: '2025-04-01T10:00:00Z',
      endTime: '2025-04-01T11:00:00Z',
      recurrenceRule: 'FREQ=WEEKLY;COUNT=4',
      description: 'Test Description',
      venueId: 1
    };
    
    const response = await SELF.fetch('http://example.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...defaultData, ...eventData }),
    });
    return response;
  }

  // Helper function to delete an event
  async function deleteEvent(id) {
    await SELF.fetch(`http://example.com/api/events/${id}`, {
      method: 'DELETE',
    });
  }

  // Clean up after each test
  afterEach(async () => {
    const response = await SELF.fetch('http://example.com/api/events');
    const events = await response.json();
    
    if (events && Array.isArray(events.data)) {
      for (const event of events.data) {
        await deleteEvent(event.id);
      }
    }
  });

  describe('POST /api/events (Recurring)', () => {
    it('creates a recurring event with valid data', async () => {
      const response = await createRecurringEvent();
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('recurrenceRule');
      expect(result.recurrenceRule).toBe('FREQ=WEEKLY;COUNT=4');
    });

    it('validates recurrence rule format', async () => {
      const response = await createRecurringEvent({
        recurrenceRule: 'INVALID_RULE'
      });
      
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error).toHaveProperty('error');
      expect(error.error).toContain('Invalid recurrence rule');
    });
  });

  describe('GET /api/events/instances', () => {
    it('returns all instances of a recurring event', async () => {
      const createResponse = await createRecurringEvent();
      const event = await createResponse.json();
      
      const response = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      expect(response.status).toBe(200);
      
      const instances = await response.json();
      expect(Array.isArray(instances.data)).toBe(true);
      expect(instances.data.length).toBe(4); // Based on COUNT=4
      
      // Verify each instance has the correct properties
      instances.data.forEach((instance, index) => {
        expect(instance).toHaveProperty('id');
        expect(instance).toHaveProperty('startTime');
        expect(instance).toHaveProperty('endTime');
        if (index > 0) {
          const prevDate = new Date(instances.data[index - 1].startTime);
          const currentDate = new Date(instance.startTime);
          const diffDays = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
          expect(diffDays).toBe(7); // Weekly recurrence
        }
      });
    });
  });

  describe('PUT /api/events/:id (Recurring)', () => {
    it('updates recurrence rule of an existing event', async () => {
      const createResponse = await createRecurringEvent();
      const event = await createResponse.json();
      
      const updateResponse = await SELF.fetch(`http://example.com/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          recurrenceRule: 'FREQ=WEEKLY;COUNT=6'
        }),
      });
      
      expect(updateResponse.status).toBe(200);
      const updated = await updateResponse.json();
      expect(updated.recurrenceRule).toBe('FREQ=WEEKLY;COUNT=6');
      
      // Verify number of instances updated
      const instancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const instances = await instancesResponse.json();
      expect(instances.data.length).toBe(6);
    });
  });

  describe('DELETE /api/events/:id (Recurring)', () => {
    it('deletes all instances of a recurring event', async () => {
      const createResponse = await createRecurringEvent();
      const event = await createResponse.json();
      
      // Get instances before deletion
      const beforeResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const beforeInstances = await beforeResponse.json();
      expect(beforeInstances.data.length).toBeGreaterThan(0);
      
      // Delete the event
      const deleteResponse = await SELF.fetch(`http://example.com/api/events/${event.id}`, {
        method: 'DELETE',
      });
      expect(deleteResponse.status).toBe(200);
      
      // Verify instances are deleted
      const afterResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      expect(afterResponse.status).toBe(404);
    });

    it('deletes a single instance of a recurring event', async () => {
      const createResponse = await createRecurringEvent();
      const event = await createResponse.json();
      
      // Get instances
      const instancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const instances = await instancesResponse.json();
      const firstInstance = instances.data[0];
      
      // Delete one instance
      const deleteResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances/${firstInstance.id}`, {
        method: 'DELETE',
      });
      expect(deleteResponse.status).toBe(200);
      
      // Verify remaining instances
      const afterResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const remainingInstances = await afterResponse.json();
      expect(remainingInstances.data.length).toBe(instances.data.length - 1);
    });
  });

  describe('Event Exceptions', () => {
    it('creates an exception for a specific instance', async () => {
      // Create a recurring event
      const createResponse = await createRecurringEvent();
      const event = await createResponse.json();
      
      // Get instances
      const instancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const instances = await instancesResponse.json();
      const secondInstance = instances.data[1];
      
      // Create exception for the second instance
      const exceptionData = {
        title: 'Modified Instance Title',
        startTime: new Date(new Date(secondInstance.startTime).getTime() + 3600000).toISOString(), // 1 hour later
        endTime: new Date(new Date(secondInstance.endTime).getTime() + 3600000).toISOString(),
        description: 'Exception description'
      };
      
      const exceptionResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances/${secondInstance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exceptionData),
      });
      
      expect(exceptionResponse.status).toBe(200);
      
      // Verify the exception is applied correctly
      const updatedInstancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const updatedInstances = await updatedInstancesResponse.json();
      
      const modifiedInstance = updatedInstances.data.find(i => i.id === secondInstance.id);
      expect(modifiedInstance.title).toBe('Modified Instance Title');
      expect(modifiedInstance.description).toBe('Exception description');
      expect(new Date(modifiedInstance.startTime).getTime()).toBe(new Date(exceptionData.startTime).getTime());
    });

    it('handles multiple exceptions for the same recurring event', async () => {
      // Create a recurring event with more occurrences
      const createResponse = await createRecurringEvent({
        recurrenceRule: 'FREQ=WEEKLY;COUNT=10'
      });
      const event = await createResponse.json();
      
      // Get instances
      const instancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const instances = await instancesResponse.json();
      
      // Create exceptions for multiple instances
      const instancestoModify = [instances.data[1], instances.data[3], instances.data[5]];
      
      for (let i = 0; i < instancestoModify.length; i++) {
        const instance = instancestoModify[i];
        const exceptionData = {
          title: `Modified Instance ${i+1}`,
          startTime: new Date(new Date(instance.startTime).getTime() + (i+1) * 1800000).toISOString(), // Each 30 mins later than the previous
          endTime: new Date(new Date(instance.endTime).getTime() + (i+1) * 1800000).toISOString(),
          description: `Exception description ${i+1}`
        };
        
        const exceptionResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances/${instance.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exceptionData),
        });
        
        expect(exceptionResponse.status).toBe(200);
      }
      
      // Verify all exceptions are applied correctly
      const updatedInstancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const updatedInstances = await updatedInstancesResponse.json();
      
      // Verify each modified instance
      for (let i = 0; i < instancestoModify.length; i++) {
        const originalInstance = instancestoModify[i];
        const modifiedInstance = updatedInstances.data.find(inst => inst.id === originalInstance.id);
        
        expect(modifiedInstance.title).toBe(`Modified Instance ${i+1}`);
        expect(modifiedInstance.description).toBe(`Exception description ${i+1}`);
      }
      
      // Verify unmodified instances remain unchanged
      const unmodifiedIndices = [0, 2, 4, 6, 7, 8, 9];
      for (const index of unmodifiedIndices) {
        const originalInstance = instances.data[index];
        const unchangedInstance = updatedInstances.data.find(inst => inst.id === originalInstance.id);
        
        expect(unchangedInstance.title).toBe(event.title);
        expect(unchangedInstance.description).toBe(event.description);
        expect(new Date(unchangedInstance.startTime).getTime()).toBe(new Date(originalInstance.startTime).getTime());
      }
    });

    it('handles exception cancellation and restoration', async () => {
      // Create a recurring event
      const createResponse = await createRecurringEvent();
      const event = await createResponse.json();
      
      // Get instances
      const instancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const instances = await instancesResponse.json();
      const thirdInstance = instances.data[2];
      
      // Cancel the instance (soft delete)
      const cancelResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances/${thirdInstance.id}/cancel`, {
        method: 'POST'
      });
      
      expect(cancelResponse.status).toBe(200);
      
      // Verify instance is marked as cancelled
      const afterCancelResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const afterCancelInstances = await afterCancelResponse.json();
      const cancelledInstance = afterCancelInstances.data.find(i => i.id === thirdInstance.id);
      
      expect(cancelledInstance.status).toBe('cancelled');
      
      // Restore the cancelled instance
      const restoreResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances/${thirdInstance.id}/restore`, {
        method: 'POST'
      });
      
      expect(restoreResponse.status).toBe(200);
      
      // Verify instance is restored
      const afterRestoreResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const afterRestoreInstances = await afterRestoreResponse.json();
      const restoredInstance = afterRestoreInstances.data.find(i => i.id === thirdInstance.id);
      
      expect(restoredInstance.status).toBe('active');
    });
  });

  describe('State Transitions', () => {
    it('verifies state transitions for a normal recurring event lifecycle', async () => {
      // 1. Create recurring event
      const createResponse = await createRecurringEvent();
      expect(createResponse.status).toBe(200);
      const event = await createResponse.json();
      
      // Verify event state
      expect(event.status).toBe('active');
      
      // 2. Get instances and verify their states
      const instancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const instances = await instancesResponse.json();
      
      instances.data.forEach(instance => {
        expect(instance.status).toBe('active');
      });
      
      // 3. Update the recurring event
      const updateResponse = await SELF.fetch(`http://example.com/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          title: 'Updated Title'
        }),
      });
      
      expect(updateResponse.status).toBe(200);
      const updatedEvent = await updateResponse.json();
      expect(updatedEvent.title).toBe('Updated Title');
      expect(updatedEvent.status).toBe('active');
      
      // 4. Create an exception
      const firstInstance = instances.data[0];
      const exceptionResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances/${firstInstance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Exception Title'
        }),
      });
      
      expect(exceptionResponse.status).toBe(200);
      
      // Verify instance state with exception
      const updatedInstancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const updatedInstances = await updatedInstancesResponse.json();
      const modifiedInstance = updatedInstances.data.find(i => i.id === firstInstance.id);
      
      expect(modifiedInstance.title).toBe('Exception Title');
      expect(modifiedInstance.status).toBe('active');
      expect(modifiedInstance.isException).toBe(true);
    });

    it('verifies state transitions for cancelled instances', async () => {
      // Create recurring event
      const createResponse = await createRecurringEvent();
      const event = await createResponse.json();
      
      // Get instances
      const instancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const instances = await instancesResponse.json();
      
      // Cancel specific instance
      const secondInstance = instances.data[1];
      const cancelResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances/${secondInstance.id}/cancel`, {
        method: 'POST'
      });
      
      expect(cancelResponse.status).toBe(200);
      
      // Verify parent recurring event stays active
      const eventResponse = await SELF.fetch(`http://example.com/api/events/${event.id}`);
      const eventData = await eventResponse.json();
      expect(eventData.status).toBe('active');
      
      // Verify only the specific instance is cancelled
      const afterCancelResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const afterCancelInstances = await afterCancelResponse.json();
      
      const cancelledInstance = afterCancelInstances.data.find(i => i.id === secondInstance.id);
      expect(cancelledInstance.status).toBe('cancelled');
      
      // Verify other instances remain active
      const activeInstances = afterCancelInstances.data.filter(i => i.id !== secondInstance.id);
      activeInstances.forEach(instance => {
        expect(instance.status).toBe('active');
      });
    });

    it('verifies state transitions when updating recurrence rule', async () => {
      // Create recurring event
      const createResponse = await createRecurringEvent({
        recurrenceRule: 'FREQ=WEEKLY;COUNT=3'
      });
      const event = await createResponse.json();
      
      // Get original instances
      const origInstancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const origInstances = await origInstancesResponse.json();
      expect(origInstances.data.length).toBe(3);
      
      // Update recurrence rule to extend the series
      const updateResponse = await SELF.fetch(`http://example.com/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          recurrenceRule: 'FREQ=WEEKLY;COUNT=5'
        }),
      });
      
      expect(updateResponse.status).toBe(200);
      
      // Get updated instances
      const updatedInstancesResponse = await SELF.fetch(`http://example.com/api/events/${event.id}/instances`);
      const updatedInstances = await updatedInstancesResponse.json();
      
      // Verify number of instances increased
      expect(updatedInstances.data.length).toBe(5);
      
      // Verify original instances preserved their IDs
      origInstances.data.forEach(origInstance => {
        const matchingInstance = updatedInstances.data.find(i => i.id === origInstance.id);
        expect(matchingInstance).toBeTruthy();
        expect(matchingInstance.status).toBe('active');
      });
      
      // Verify new instances are active
      const newInstances = updatedInstances.data.filter(
        i => !origInstances.data.some(orig => orig.id === i.id)
      );
      
      expect(newInstances.length).toBe(2);
      newInstances.forEach(instance => {
        expect(instance.status).toB
