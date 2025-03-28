import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, afterEach } from 'vitest';
import worker from '../src';
import { createTestVariable, deleteVariable, cleanupVariables, executeWithTransaction } from './utils/test-helpers';

describe('Hello World user worker', () => {
	describe('request for /message', () => {
		it('/ responds with "Hello, World!" (unit style)', async () => {
			const request = new Request('http://example.com/message');
			// Create an empty context to pass to `worker.fetch()`.
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
			await waitOnExecutionContext(ctx);
			expect(await response.text()).toMatchInlineSnapshot(`"Hello, World!"`);
		});

		it('responds with "Hello, World!" (integration style)', async () => {
			const request = new Request('http://example.com/message');
			const response = await SELF.fetch(request);
			expect(await response.text()).toMatchInlineSnapshot(`"Hello, World!"`);
		});
	});

	describe('request for /random', () => {
		it('/ responds with a random UUID (unit style)', async () => {
			const request = new Request('http://example.com/random');
			// Create an empty context to pass to `worker.fetch()`.
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
			await waitOnExecutionContext(ctx);
			expect(await response.text()).toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
		});

		it('responds with a random UUID (integration style)', async () => {
			const request = new Request('http://example.com/random');
			const response = await SELF.fetch(request);
			expect(await response.text()).toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
		});
	});
});

describe('API Tests', () => {
	describe('Variable API routes', () => {
		// Clean up after all tests
		afterEach(async () => {
			await cleanupVariables();
		});

	describe('GET /api/variables', () => {
		it('returns empty array when no variables exist', async () => {
			const response = await SELF.fetch('http://example.com/api/variables');
			expect(response.status).toBe(200);
			
			const result = await response.json();
			expect(result).toHaveProperty('data');
			expect(Array.isArray(result.data)).toBe(true);
			expect(result.data.length).toBe(0);
		});

		it('returns all variables when they exist', async () => {
			// Create a couple of test variables
			const variable1 = await createTestVariable('Var1', 'Value1');
			const variable2 = await createTestVariable('Var2', 'Value2');

			const response = await SELF.fetch('http://example.com/api/variables');
			expect(response.status).toBe(200);
			
			const result = await response.json();
			expect(result).toHaveProperty('data');
			expect(Array.isArray(result.data)).toBe(true);
			expect(result.data.length).toBe(2);
			
			// Verify the variable data
			const names = result.data.map(v => v.name);
			expect(names).toContain('Var1');
			expect(names).toContain('Var2');
		});
	});

	describe('POST /api/variables', () => {
		it('creates a new variable with valid data', async () => {
			const response = await SELF.fetch('http://example.com/api/variables', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'New Variable', value: 'New Value' }),
			});
			
			expect(response.status).toBe(200);
			
			const result = await response.json();
			expect(result).toHaveProperty('id');
			expect(result.name).toBe('New Variable');
			expect(result.value).toBe('New Value');
			expect(result).toHaveProperty('created_at');
			expect(result).toHaveProperty('updated_at');
		});

		it('returns 400 when name is missing', async () => {
			const response = await SELF.fetch('http://example.com/api/variables', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ value: 'Some Value' }),
			});
			
			expect(response.status).toBe(400);
			
			const result = await response.json();
			expect(result).toHaveProperty('error');
		});

		it('returns 400 when value is missing', async () => {
			const response = await SELF.fetch('http://example.com/api/variables', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Variable Name' }),
			});
			
			expect(response.status).toBe(400);
			
			const result = await response.json();
			expect(result).toHaveProperty('error');
		});
	});

	describe('GET /api/variables/:id', () => {
		it('retrieves a specific variable by ID', async () => {
			// Create a test variable
			const createdVariable = await createTestVariable('Get Test', 'Get Value');
			
			const response = await SELF.fetch(`http://example.com/api/variables/${createdVariable.id}`);
			expect(response.status).toBe(200);
			
			const variable = await response.json();
			expect(variable.id).toBe(createdVariable.id);
			expect(variable.name).toBe('Get Test');
			expect(variable.value).toBe('Get Value');
		});

		it('returns 404 for non-existent variable ID', async () => {
			const response = await SELF.fetch('http://example.com/api/variables/99999');
			expect(response.status).toBe(404);
			
			const result = await response.json();
			expect(result).toHaveProperty('error');
		});
	});

	describe('PUT /api/variables/:id', () => {
		it('updates an existing variable', async () => {
			// Create a test variable
			const createdVariable = await createTestVariable('Update Test', 'Original Value');
			
			// Update the variable
			const updateResponse = await SELF.fetch(`http://example.com/api/variables/${createdVariable.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Updated Name', value: 'Updated Value' }),
			});
			
			expect(updateResponse.status).toBe(200);
			
			// Verify the update
			const getResponse = await SELF.fetch(`http://example.com/api/variables/${createdVariable.id}`);
			const updated = await getResponse.json();
			
			expect(updated.id).toBe(createdVariable.id);
			expect(updated.name).toBe('Updated Name');
			expect(updated.value).toBe('Updated Value');
			expect(Date.parse(updated.updated_at)).toBeGreaterThanOrEqual(Date.parse(createdVariable.updated_at));
		});

		it('returns 404 when updating non-existent variable', async () => {
			const response = await SELF.fetch('http://example.com/api/variables/99999', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'New Name', value: 'New Value' }),
			});
			
			expect(response.status).toBe(404);
			
			const result = await response.json();
			expect(result).toHaveProperty('error');
		});

		it('returns 400 when update data is invalid', async () => {
			// Create a test variable
			const createdVariable = await createTestVariable('Bad Update Test', 'Original Value');
			
			// Attempt update with missing fields
			const response = await SELF.fetch(`http://example.com/api/variables/${createdVariable.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Only Name' }), // Missing value field
			});
			
			expect(response.status).toBe(400);
			
			const result = await response.json();
			expect(result).toHaveProperty('error');
		});
	});

	describe('DELETE /api/variables/:id', () => {
		it('deletes an existing variable', async () => {
			// Create a test variable
			const createdVariable = await createTestVariable('Delete Test', 'Delete Value');
			
			// Delete the variable
			const deleteResponse = await SELF.fetch(`http://example.com/api/variables/${createdVariable.id}`, {
				method: 'DELETE',
			});
			
			expect(deleteResponse.status).toBe(200);
			
			// Verify it's gone
			const getResponse = await SELF.fetch(`http://example.com/api/variables/${createdVariable.id}`);
			expect(getResponse.status).toBe(404);
		});

		it('returns 404 when deleting non-existent variable', async () => {
			const response = await SELF.fetch('http://example.com/api/variables/99999', {
				method: 'DELETE',
			});
			
			expect(response.status).toBe(404);
			
			const result = await response.json();
			expect(result).toHaveProperty('error');
		});
	});

	describe('Variables API Validation', () => {
		it('validates variable name length', async () => {
			const response = await SELF.fetch('http://example.com/api/variables', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					name: 'a'.repeat(256), // Exceeds max length
					value: 'Test Value'
				}),
			});
			
			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.error).toContain('name length');
		});

		it('validates variable name format', async () => {
			const response = await SELF.fetch('http://example.com/api/variables', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					name: 'Invalid Name!@#',
					value: 'Test Value'
				}),
			});
			
			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.error).toContain('name format');
		});

		it('prevents duplicate variable names', async () => {
			// Create first variable
			const createResponse = await SELF.fetch('http://example.com/api/variables', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					name: 'Unique Name',
					value: 'Value 1'
				}),
			});
			expect(createResponse.status).toBe(200);
			
			// Try to create another with same name
			const response = await SELF.fetch('http://example.com/api/variables', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					name: 'Unique Name',
					value: 'Value 2'
				}),
			});
			
			expect(response.status).toBe(409);
			const result = await response.json();
			expect(result.error).toContain('already exists');
		});
	});

	describe('Variables API Concurrency', () => {
		
		it('handles concurrent variable creation with proper constraint violation handling', async () => {
			const name = 'Concurrent Test';
			const value1 = 'Value 1';
			const value2 = 'Value 2';
			
			// Create two requests simultaneously with transactions
			const createPromise1 = executeWithTransaction(
				'http://example.com/api/variables', 
				'POST', 
				{ name, value: value1 }
			);
			
			const createPromise2 = executeWithTransaction(
				'http://example.com/api/variables', 
				'POST', 
				{ name, value: value2 }
			);
			
			const [result1, result2] = await Promise.allSettled([createPromise1, createPromise2]);
			
			// Extract actual responses
			const responses = [];
			if (result1.status === 'fulfilled') responses.push(result1.value);
			if (result2.status === 'fulfilled') responses.push(result2.value);
			
			// Verify results - one should succeed, one should have unique constraint error
			const successCount = responses.filter(resp => resp.status === 200).length;
			const constraintErrorCount = responses.filter(resp => resp.status === 409).length;
			
			expect(successCount).toBe(1);
			expect(constraintErrorCount).toBe(1);
			
			// Verify constraint error message is descriptive
			const errorResponse = responses.find(resp => resp.status === 409);
			expect(errorResponse.data.error).toContain('name already exists');
			expect(errorResponse.data.errorCode).toBe('UNIQUE_CONSTRAINT_VIOLATION');
			
			// Verify only one record was actually created
			const listResponse = await SELF.fetch('http://example.com/api/variables');
			const list = await listResponse.json();
			
			const createdItems = list.data.filter(item => item.name === name);
			expect(createdItems.length).toBe(1);
			
			// Verify the created record has the expected value
			const createdItem = createdItems[0];
			const successResponse = responses.find(resp => resp.status === 200);
			expect(createdItem.value).toBe(successResponse.data.value);
		});

		it('handles concurrent updates with row-level locking', async () => {
			// Create initial variable
			const createResponse = await SELF.fetch('http://example.com/api/variables', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					name: 'Update Test',
					value: 'Initial'
				}),
			});
			expect(createResponse.status).toBe(200);
			const variable = await createResponse.json();
			
			// Attempt concurrent updates with row-level locking
			const update1Promise = executeWithTransaction(
				`http://example.com/api/variables/${variable.id}`,
				'PUT',
				{ 
					name: 'Update Test',
					value: 'Update 1',
					useRowLock: true  // Signal to use SELECT FOR UPDATE
				}
			);
			
			const update2Promise = executeWithTransaction(
				`http://example.com/api/variables/${variable.id}`,
				'PUT',
				{ 
					name: 'Update Test',
					value: 'Update 2',
					useRowLock: true  // Signal to use SELECT FOR UPDATE
				}
			);
			
			// Get results of both operations
			const [result1, result2] = await Promise.allSettled([update1Promise, update2Promise]);
			
			// Extract successful responses
			const responses = [];
			if (result1.status === 'fulfilled') responses.push(result1.value);
			if (result2.status === 'fulfilled') responses.push(result2.value);
			
			// Both should succeed but be serialized due to row-level locking
			expect(responses.length).toBe(2);
			expect(responses[0].status).toBe(200);
			expect(responses[1].status).toBe(200);
			
			// Get final state to verify
			const finalResponse = await SELF.fetch(`http://example.com/api/variables/${variable.id}`);
			expect(finalResponse.status).toBe(200);
			const finalState = await finalResponse.json();
			
			// The last update should win due to row locking serialization
			expect(finalState.value).toBe('Update 2');
			
			// Verify timestamps show the order of operations
			const timestamp1 = new Date(responses[0].data.updated_at).getTime();
			const timestamp2 = new Date(responses[1].data.updated_at).getTime();
			const finalTimestamp = new Date(finalState.updated_at).getTime();
			
			// Final timestamp should match the last update
			expect(finalTimestamp).toBe(Math.max(timestamp1, timestamp2));
			
			// Query history to verify that serialized execution occurred
			const historyResponse = await SELF.fetch(`http://example.com/api/variables/${variable.id}/history`);
			const history = await historyResponse.json();
			
			// Should have 3 entries: initial, update1, update2
			expect(history.data.length).toBe(3);
			expect(history.data[0].value).toBe('Initial');
			expect(history.data[history.data.length - 1].value).toBe(finalState.value);
		});
		
		it('handles read-after-write consistency with transactions', async () => {
			// Create initial variable with transaction
			const { status: createStatus, data: variable } = await executeWithTransaction(
				'http://example.com/api/variables',
				'POST',
				{ name: 'Transaction Test', value: 'Initial' }
			);
			expect(createStatus).toBe(200);
			
			// Update within transaction
			const { status: updateStatus } = await executeWithTransaction(
				`http://example.com/api/variables/${variable.id}`,
				'PUT',
				{ name: 'Transaction Test', value: 'Updated' }
			);
			expect(updateStatus).toBe(200);
			
			// Verify update is visible after transaction commit
			const getResponse = await SELF.fetch(`http://example.com/api/variables/${variable.id}`);
			expect(getResponse.status).toBe(200);
			const finalState = await getResponse.json();
			expect(finalState.value).toBe('Updated');
			
			// Test rollback with transaction
			try {
				await executeWithTransaction(
					`http://example.com/api/variables/${variable.id}`,
					'PUT',
					{ name: 'Transaction Test', value: null } // This should cause validation error
				);
				// Should not reach this point
				expect(false).toBe(true);
			} catch (error) {
				// Expected to fail and rollback
			}
			
			// Verify original state remains after rollback
			const afterRollbackResponse = await SELF.fetch(`http://example.com/api/variables/${variable.id}`);
			const afterRollbackState = await afterRollbackResponse.json();
			expect(afterRollbackState.value).toBe('Updated'); // Still the previously committed value
		});
	});
	
	// Reserved space for future API resources
	describe('Events API routes', () => {
		// This block is reserved for Events API tests when they are implemented
		it('placeholder test', () => {
			// This is a placeholder test to ensure the structure is in place
			expect(true).toBe(true);
		});
	});
	
	describe('User API routes', () => {
		// This block is reserved for User API tests when they are implemented
		it('placeholder test', () => {
			// This is a placeholder test to ensure the structure is in place
			expect(true).toBe(true);
		});
	});
});
