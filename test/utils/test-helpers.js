import { SELF } from 'cloudflare:test';

// Helper function to create a variable for testing
export async function createTestVariable(name = 'Test Variable', value = 'Test Value') {
	const response = await SELF.fetch('http://example.com/api/variables', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, value }),
	});
	return await response.json();
}

// Helper function to delete a variable
export async function deleteVariable(id) {
	await SELF.fetch(`http://example.com/api/variables/${id}`, {
		method: 'DELETE',
	});
}

// Helper to clean up all variables
export async function cleanupVariables() {
	const response = await SELF.fetch('http://example.com/api/variables');
	const variables = await response.json();
	
	if (variables && Array.isArray(variables.data)) {
		for (const variable of variables.data) {
			await deleteVariable(variable.id);
		}
	}
}

// Helper to perform an operation with transaction and proper error handling
export async function executeWithTransaction(endpoint, method, body = null) {
	const headers = { 
		'Content-Type': 'application/json',
		'X-Transaction': 'begin'  // Signal to begin transaction
	};
	
	try {
		const response = await SELF.fetch(endpoint, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});
		
		const result = await response.json();
		
		// Check if operation was successful before committing
		if (response.status >= 200 && response.status < 300) {
			// Commit transaction
			await SELF.fetch(endpoint, {
				method: 'POST',
				headers: { 'X-Transaction': 'commit' },
			});
		} else {
			// Rollback transaction on error
			await SELF.fetch(endpoint, {
				method: 'POST',
				headers: { 'X-Transaction': 'rollback' },
			});
		}
		
		return { status: response.status, data: result };
	} catch (error) {
		// Ensure rollback on any exception
		await SELF.fetch(endpoint, {
			method: 'POST',
			headers: { 'X-Transaction': 'rollback' },
		});
		throw error;
	}
}

