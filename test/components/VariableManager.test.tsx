import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SELF } from 'cloudflare:test';
import VariableManager from '../../src/components/admin/VariableManager';
import { createTestVariable, cleanupVariables } from '../utils/test-helpers';

// Mock the fetch API to use SELF.fetch for all fetch requests
global.fetch = SELF.fetch;

// Helper to wait for loading to complete
const waitForLoadingToComplete = async () => {
  await waitFor(() => {
    const loadingElement = screen.queryByText('Loading variables...');
    return !loadingElement;
  });
};

describe('VariableManager Component Integration Tests', () => {
  // Clean up variables before each test
  beforeEach(async () => {
    await cleanupVariables();
  });

  // Cleanup after each test
  afterEach(async () => {
    await cleanupVariables();
    vi.restoreAllMocks();
  });

  describe('Component Rendering and Initialization', () => {
    it('should render the component with initial UI elements', async () => {
      render(<VariableManager />);
      
      // Check for main heading
      expect(screen.getByText('System Variables')).toBeInTheDocument();
      
      // Check for "Add Variable" button
      expect(screen.getByText('Add Variable')).toBeInTheDocument();
      
      // Check for search and filter controls
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Type')).toBeInTheDocument();
      
      // Check for table headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Updated At')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      
      // Wait for loading state to complete
      await waitForLoadingToComplete();
    });
    
    it('should display loading state while fetching data', async () => {
      // Slow down fetch to test loading state
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (...args) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return originalFetch(...args);
      });
      
      render(<VariableManager />);
      
      // Should show loading state initially
      expect(screen.getByText('Loading variables...')).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitForLoadingToComplete();
      
      // Loading text should be gone
      expect(screen.queryByText('Loading variables...')).not.toBeInTheDocument();
      
      // Restore original fetch
      global.fetch = originalFetch;
    });
    
    it('should display empty state message when no variables exist', async () => {
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Should show empty state message
      expect(screen.getByText('No variables found. Click "Add Variable" to create one.')).toBeInTheDocument();
    });
    
    it('should load and display variables from the API', async () => {
      // Create test variables in the database
      await createTestVariable('TEST_VAR1', 'value1');
      await createTestVariable('TEST_VAR2', 'value2');
      
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Check that variables are displayed
      expect(screen.getByText('TEST_VAR1')).toBeInTheDocument();
      expect(screen.getByText('TEST_VAR2')).toBeInTheDocument();
    });
  });
  
  describe('CRUD Operations with Real D1 Database', () => {
    it('should create a new variable when form is submitted', async () => {
      const user = userEvent.setup();
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Click Add Variable button
      await user.click(screen.getByText('Add Variable'));
      
      // Fill out the form
      await user.type(screen.getByLabelText('Variable Name'), 'TEST_CREATE');
      
      // Select variable type
      await user.click(screen.getByLabelText('Variable Type'));
      await user.click(screen.getByText('Number'));
      
      await user.type(screen.getByLabelText('Value'), '42');
      await user.type(screen.getByLabelText('Description'), 'Test description for created variable');
      
      // Submit the form
      await user.click(screen.getByText('Create'));
      
      // Wait for the success message
      await waitFor(() => {
        expect(screen.getByText('Variable created successfully!')).toBeInTheDocument();
      });
      
      // Check that the new variable is displayed in the table
      expect(screen.getByText('TEST_CREATE')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Test description for created variable')).toBeInTheDocument();
      
      // Verify the variable was actually saved to the database
      const response = await SELF.fetch('http://example.com/api/variables');
      const data = await response.json();
      const createdVar = data.data.find(v => v.name === 'TEST_CREATE');
      expect(createdVar).toBeTruthy();
      expect(createdVar.value).toBe('42');
    });
    
    it('should update an existing variable', async () => {
      // Create a test variable first
      await createTestVariable('TEST_UPDATE', 'old_value');
      
      const user = userEvent.setup();
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Find the variable row and click the edit button
      const row = screen.getByText('TEST_UPDATE').closest('tr');
      const editButton = within(row).getByLabelText('edit');
      await user.click(editButton);
      
      // Update the value and description
      const valueInput = screen.getByLabelText('Value');
      await user.clear(valueInput);
      await user.type(valueInput, 'new_value');
      
      const descriptionInput = screen.getByLabelText('Description');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');
      
      // Submit the form
      await user.click(screen.getByText('Update'));
      
      // Wait for the success message
      await waitFor(() => {
        expect(screen.getByText('Variable updated successfully!')).toBeInTheDocument();
      });
      
      // Verify the updated variable is displayed
      expect(screen.getByText('new_value')).toBeInTheDocument();
      expect(screen.getByText('Updated description')).toBeInTheDocument();
      
      // Verify it was actually updated in the database
      const response = await SELF.fetch('http://example.com/api/variables');
      const data = await response.json();
      const updatedVar = data.data.find(v => v.name === 'TEST_UPDATE');
      expect(updatedVar).toBeTruthy();
      expect(updatedVar.value).toBe('new_value');
    });
    
    it('should delete a variable', async () => {
      // Create a test variable first
      await createTestVariable('TEST_DELETE', 'delete_me');
      
      const user = userEvent.setup();
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Find the variable row and click the delete button
      const row = screen.getByText('TEST_DELETE').closest('tr');
      const deleteButton = within(row).getByLabelText('delete');
      await user.click(deleteButton);
      
      // Confirm deletion
      await user.click(screen.getByText('Delete'));
      
      // Wait for the success message
      await waitFor(() => {
        expect(screen.getByText('Variable deleted successfully!')).toBeInTheDocument();
      });
      
      // Verify the variable is no longer displayed
      expect(screen.queryByText('TEST_DELETE')).not.toBeInTheDocument();
      
      // Verify it was actually deleted from the database
      const response = await SELF.fetch('http://example.com/api/variables');
      const data = await response.json();
      const deletedVar = data.data.find(v => v.name === 'TEST_DELETE');
      expect(deletedVar).toBeFalsy();
    });
  });
  
  describe('Sorting and Filtering Functionality', () => {
    beforeEach(async () => {
      // Create test variables with different types for sorting/filtering tests
      await createTestVariable('Z_STRING_VAR', 'string value');
      await createTestVariable('A_NUMBER_VAR', '123', 'number');
      await createTestVariable('M_BOOLEAN_VAR', 'true', 'boolean');
      await createTestVariable('B_JSON_VAR', '{"test":true}', 'json');
    });
    
    it('should sort variables by name', async () => {
      const user = userEvent.setup();
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // By default, variables should be sorted by name in ascending order
      const rows = screen.getAllByRole('row');
      const firstRowNameCell = within(rows[1]).getAllByRole('cell')[0];
      const lastRowNameCell = within(rows[4]).getAllByRole('cell')[0];
      
      expect(firstRowNameCell).toHaveTextContent('A_NUMBER_VAR');
      expect(lastRowNameCell).toHaveTextContent('Z_STRING_VAR');
      
      // Click the Name header to sort in descending order
      await user.click(screen.getByText('Name'));
      
      // Check that the order is reversed
      const rowsAfterSort = screen.getAllByRole('row');
      const firstRowAfterSort = within(rowsAfterSort[1]).getAllByRole('cell')[0];
      const lastRowAfterSort = within(rowsAfterSort[4]).getAllByRole('cell')[0];
      
      expect(firstRowAfterSort).toHaveTextContent('Z_STRING_VAR');
      expect(lastRowAfterSort).toHaveTextContent('A_NUMBER_VAR');
    });
    
    it('should sort variables by type', async () => {
      const user = userEvent.setup();
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Click the Type header to sort by type
      await user.click(screen.getByText('Type'));
      
      // Check the order: boolean, json, number, string (alphabetical)
      const rows = screen.getAllByRole('row');
      const cellContents = rows.slice(1).map(row => 
        within(row).getAllByRole('cell')[2].textContent
      );
      
      expect(cellContents[0]).toBe('boolean');
      expect(cellContents[3]).toBe('string');
      
      // Click again to reverse the order
      await user.click(screen.getByText('Type'));
      
      // Check the reversed order
      const rowsAfterSort = screen.getAllByRole('row');
      const cellContentsAfterSort = rowsAfterSort.slice(1).map(row => 
        within(row).getAllByRole('cell')[2].textContent
      );
      
      expect(cellContentsAfterSort[0]).toBe('string');
      expect(cellContentsAfterSort[3]).toBe('boolean');
    });
    
    it('should filter variables by type', async () => {
      const user = userEvent.setup();
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Initially all 4 variables should be visible
      expect(screen.getAllByRole('row').length).toBe(5); // 4 data rows + 1 header row
      
      // Filter by 'number' type
      await user.click(screen.getByLabelText('Filter by Type'));
      await user.click(screen.getByText('Number'));
      
      // Should only show the number variable
      expect(screen.getAllByRole('row').length).toBe(2); // 1 data row + 1 header row
      expect(screen.getByText('A_NUMBER_VAR')).toBeInTheDocument();
      expect(screen.queryByText('Z_STRING_VAR')).not.toBeInTheDocument();
      
      // Filter by 'boolean' type
      await user.click(screen.getByLabelText('Filter by Type'));
      await user.click(screen.getByText('Boolean'));
      
      // Should only show the boolean variable
      expect(screen.getByText('M_BOOLEAN_VAR')).toBeInTheDocument();
      expect(screen.queryByText('A_NUMBER_VAR')).not.toBeInTheDocument();
      
      // Reset to show all variables
      await user.click(screen.getByLabelText('Filter by Type'));
      await user.click(screen.getByText('All Types'));
      
      // Should show all 4 variables again
      expect(screen.getAllByRole('row').length).toBe(5);
    });
    
    it('should filter variables by search term', async () => {
      const user = userEvent.setup();
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Search for "JSON"
      await user.type(screen.getByLabelText('Search'), 'JSON');
      
      // Should only show the JSON variable
      expect(screen.getAllByRole('row').length).toBe(2); // 1 data row + 1 header row
      expect(screen.getByText('B_JSON_VAR')).toBeInTheDocument();
      expect(screen.queryByText('A_NUMBER_VAR')).not.toBeInTheDocument();
      
      // Clear the search
      await user.clear(screen.getByLabelText('Search'));
      
      // Should show all variables again
      expect(screen.getAllByRole('row').length).toBe(5);
      
      // Search for "NUMBER"
      await user.type(screen.getByLabelText('Search'), 'NUMBER');
      
      // Should only show the NUMBER variable
      expect(screen.getByText('A_NUMBER_VAR')).toBeInTheDocument();
      expect(screen.queryByText('Z_STRING_VAR')).not.toBeInTheDocument();
    });
    
    it('should combine search and type filters', async () => {
      const user = userEvent.setup();
      render(<VariableManager />);
      
      await waitForLoadingToComplete();
      
      // Filter by boolean type
      await user.click(screen.getByLabelText('Filter by Type'));
      await user.click(screen.getByText('Boolean'));
      
      // Should only show the boolean variable
      expect(screen.getAllByRole('row').length).toBe(2); // 1 data row + 1 header row
      expect(screen.getByText('M_BOOLEAN_VAR')).toBeInTheDocument();
      
      // Add a search term to further filter
      await user.type(screen.getByLabelText('Search'), 'BOOL');
      
      // Should still show the boolean variable (matches both filters)
      expect(screen.getAllByRole('row').length).toBe(2);
      expect(screen.getByText('M_BOOLEAN_VAR')).toBeInTheDocument();
      
      // Change search to something that doesn't match any boolean variables
      await user.clear(screen.getByLabelText('Search'));
      await user.type(screen.getByLabelText('Search'), 'JSON');
      
      // Should show no variables (no boolean variables with "JSON" in the name)
      expect(screen.queryByText('M_BOOLEAN_VAR')).not.toBeInTheDocument();
      expect(screen.getByText('No variables match the current filters')).toBeInTheDocument();
      
      // Reset filters and test another combination
      await user.clear(screen.getByLabelText('Search'));
      await user.click(screen.getByLabelText('Filter by Type'));
      await user.click(screen.getByText('All Types'));
      
      // Filter by string type and search for "Z"
      await user.click(screen.getByLabelText('Filter by Type'));
      await user.click(screen.getByText('String'));
      await user.type(screen.getByLabelText('Search'), 'Z');
      
      // Should only show Z_STRING_VAR
      expect(screen.getAllByRole('row').length).toBe(2);
      expect(screen.getByText('Z_STRING_VAR')).toBeInTheDocument();
      expect(screen.queryByText('A_NUMBER_VAR')).not.toBeInTheDocument();
      expect(screen.queryByText('M_BOOLEAN_VAR')).not.toBeInTheDocument();
      expect(screen.queryByText('B_JSON_VAR')).not.toBeInTheDocument();
    });
