import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SELF } from 'cloudflare:test';
import { createTestVariable, cleanupVariables, deleteVariable } from '../utils/test-helpers';

describe('Variables API', () => {
  const API_BASE = 'http://example.com/api/variables';
  
  // Setup test data
  let testVariables = [];
  
  beforeEach(async () => {
    // Clean up any existing variables
    await cleanupVariables();
    
    // Create test variables for use in tests
    const var1 = await createTestVariable('System - Theme', 'light');
    const var2 = await createTestVariable('System - Timezone', 'UTC');
    const var3 = await createTestVariable('System - Language', 'en-US');
    
    testVariables = [var1, var2, var3];
  });
  
  afterEach(async () => {
    // Clean up test variables
    await cleanupVariables();
    testVariables = [];
  });

  // GET endpoint tests
  describe('GET /api/variables', () => {
    it('should list all variables', async () => {
      const response = await SELF.fetch(API_BASE);
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(3);
      
      // Verify all test variables are present
      const names = result.data.map(v => v.name);
      expect(names).toContain('System - Theme');
      expect(names).toContain('System - Timezone');
      expect(names).toContain('System - Language');
    });
    
    it('should return an empty array when no variables exist', async () => {
      // Clear all variables first
      await cleanupVariables();
      
      const response = await SELF.fetch(API_BASE);
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });
  });
  
  describe('GET /api/variables/:id', () => {
    it('should return a single variable by ID', async () => {
      const id = testVariables[0].id;
      const response = await SELF.fetch(`${API_BASE}/${id}`);
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.id).toBe(id);
      expect(result.name).toBe('System - Theme');
      expect(result.value).toBe('light');
    });
    
    it('should return 404 for non-existent variable ID', async () => {
      const nonExistentId = 9999;
      const response = await SELF.fetch(`${API_BASE}/${nonExistentId}`);
      
      expect(response.status).toBe(404);
      
      const result = await response.json();
      expect(result.error).toBeTruthy();
    });
    
    it('should return 400 for invalid ID format', async () => {
      const invalidId = 'not-a-number';
      const response = await SELF.fetch(`${API_BASE}/${invalidId}`);
      
      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBeTruthy();
    });
  });
  
  // POST endpoint tests
  describe('POST /api/variables', () => {
    it('should create a new variable', async () => {
      const newVariable = {
        name: 'New Test Variable',
        value: 'New Test Value'
      };
      
      const response = await SELF.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVariable)
      });
      
      const result = await response.json();
      
      expect(response.status).toBe(201);
      expect(result.id).toBeTruthy();
      expect(result.name).toBe(newVariable.name);
      expect(result.value).toBe(newVariable.value);
      expect(result.created_at).toBeTruthy();
      expect(result.updated_at).toBeTruthy();
      
      // Verify the variable was actually created
      const verifyResponse = await SELF.fetch(`${API_BASE}/${result.id}`);
      const verifyResult = await verifyResponse.json();
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResult.name).toBe(newVariable.name);
    });
    
    it('should return 400 for missing required fields', async () => {
      // Missing name
      let response = await SELF.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'Test Value' })
      });
      
      expect(response.status).toBe(400);
      
      // Missing value
      response = await SELF.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Name' })
      });
      
      expect(response.status).toBe(400);
      
      // Empty body
      response = await SELF.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      expect(response.status).toBe(400);
    });
    
    it('should return 409 for duplicate variable name', async () => {
      const existingName = testVariables[0].name;
      
      const response = await SELF.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: existingName,
          value: 'Duplicate Name Test'
        })
      });
      
      expect(response.status).toBe(409);
      
      const result = await response.json();
      expect(result.error).toBeTruthy();
      expect(result.error.toLowerCase()).toContain('duplicate');
    });
  });
  
  // PUT endpoint tests
  describe('PUT /api/variables/:id', () => {
    it('should update an existing variable', async () => {
      const id = testVariables[0].id;
      const updatedData = {
        name: 'Updated Variable Name',
        value: 'Updated Variable Value'
      };
      
      const response = await SELF.fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.id).toBe(id);
      expect(result.name).toBe(updatedData.name);
      expect(result.value).toBe(updatedData.value);
      
      // Verify the update actually happened
      const verifyResponse = await SELF.fetch(`${API_BASE}/${id}`);
      const verifyResult = await verifyResponse.json();
      
      expect(verifyResult.name).toBe(updatedData.name);
      expect(verifyResult.value).toBe(updatedData.value);
    });
    
    it('should update only the value if only value is provided', async () => {
      const id = testVariables[1].id;
      const originalName = testVariables[1].name;
      const updatedData = {
        value: 'Only Value Updated'
      };
      
      const response = await SELF.fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.id).toBe(id);
      expect(result.name).toBe(originalName); // Name should remain unchanged
      expect(result.value).toBe(updatedData.value);
    });
    
    it('should update only the name if only name is provided', async () => {
      const id = testVariables[2].id;
      const originalValue = testVariables[2].value;
      const updatedData = {
        name: 'Only Name Updated'
      };
      
      const response = await SELF.fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.id).toBe(id);
      expect(result.name).toBe(updatedData.name);
      expect(result.value).toBe(originalValue); // Value should remain unchanged
    });
    
    it('should return 404 for non-existent variable ID', async () => {
      const nonExistentId = 9999;
      const response = await SELF.fetch(`${API_BASE}/${nonExistentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Name',
          value: 'Updated Value'
        })
      });
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 for empty update body', async () => {
      const id = testVariables[0].id;
      const response = await SELF.fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      expect(response.status).toBe(400);
    });
    
    it('should return 409 when updating to a duplicate name', async () => {
      const id = testVariables[0].id;
      const duplicateName = testVariables[1].name;
      
      const response = await SELF.fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: duplicateName,
          value: 'New Value'
        })
      });
      
      expect(response.status).toBe(409);
      
      const result = await response.json();
      expect(result.error).toBeTruthy();
      expect(result.error.toLowerCase()).toContain('duplicate');
    });
  });
  
  // DELETE endpoint tests
  describe('DELETE /api/variables/:id', () => {
    it('should delete a variable', async () => {
      const id = testVariables[0].id;
      
      const response = await SELF.fetch(`${API_BASE}/${id}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(204);
      
      // Verify the variable was actually deleted
      const verifyResponse = await SELF.fetch(`${API_BASE}/${id}`);
      expect(verifyResponse.status).toBe(404);
    });
    
    it('should return 404 for non-existent variable ID', async () => {
      const nonExistentId = 9999;
      const response = await SELF.fetch(`${API_BASE}/${nonExistentId}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 for invalid ID format', async () => {
      const invalidId = 'not-a-number';
      const response = await SELF.fetch(`${API_BASE}/${invalidId}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(400);
    });
  });
  
  // Complex error handling tests
  describe('Error handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await SELF.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "Broken JSON", "value": missing quotes and bracket'
      });
      
      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBeTruthy();
    });
    
    it('should handle invalid Content-Type header', async () => {
      const response = await SELF.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'This is not JSON'
      });
      
      expect(response.status).toBe(415); // Unsupported Media Type
    });
    
    it('should reject variables with extremely long names or values', async () => {
      // Generate a very long string
      const longString = 'a'.repeat(10000);
      
      const response = await SELF.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Normal Name',
          value: longString
        })
      });
      
      // This could be 400 or 413 (Payload Too Large) depending on implementation
      expect([400, 413]).toContain(response.status);
    });
  });
});

