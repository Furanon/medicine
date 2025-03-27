import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

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

describe('Variable API routes', () => {
	// Helper function to create a variable for testing
	async function createTestVariable(name = 'Test Variable', value = 'Test Value') {
		const response = await SELF.fetch('http://example.com/api/variables', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, value }),
		});
		return await response.json();
	}

	// Helper function to delete a variable
	async function deleteVariable(id) {
		await SELF.fetch(`http://example.com/api/variables/${id}`, {
			method: 'DELETE',
		});
	}

	// Helper to clean up all variables
	async function cleanupVariables() {
		const response = await SELF.fetch('http://example.com/api/variables');
		const variables = await response.json();
		
		if (variables && Array.isArray(variables.data)) {
			for (const variable of variables.data) {
				await deleteVariable(variable.id);
			}
		}
	}

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
});
