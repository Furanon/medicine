/**
 * API client for managing system variables
 */

// Define TypeScript interfaces for the API
export interface Variable {
  id: string;
  name: string;
  value: string;
  type: VariableType;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type VariableType = 'string' | 'number' | 'boolean' | 'json';

export interface CreateVariablePayload {
  name: string;
  value: string;
  type: VariableType;
  description?: string;
}

export interface UpdateVariablePayload {
  value: string;
  type?: VariableType;
  description?: string;
}

export interface VariableResponse {
  success: boolean;
  message: string;
  data: Variable;
}

export interface VariablesListResponse {
  success: boolean;
  message: string;
  data: Variable[];
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

// Base API URL
const API_BASE_URL = '/api/variables';

/**
 * API class for variable management operations
 */
export class VariablesAPI {
  /**
   * Get all system variables
   * @returns Promise with list of variables
   */
  static async getAll(): Promise<Variable[]> {
    try {
      const response = await fetch(API_BASE_URL);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || 'Failed to fetch variables');
      }
      
      const data: VariablesListResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching variables:', error);
      throw error;
    }
  }

  /**
   * Get a specific variable by ID
   * @param id - Variable ID
   * @returns Promise with variable data
   */
  static async getById(id: string): Promise<Variable> {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || `Failed to fetch variable ${id}`);
      }
      
      const data: VariableResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error fetching variable ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific variable by name
   * @param name - Variable name
   * @returns Promise with variable data
   */
  static async getByName(name: string): Promise<Variable> {
    try {
      const response = await fetch(`${API_BASE_URL}/name/${name}`);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || `Failed to fetch variable ${name}`);
      }
      
      const data: VariableResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error fetching variable ${name}:`, error);
      throw error;
    }
  }

  /**
   * Create a new variable
   * @param variable - New variable data
   * @returns Promise with created variable
   */
  static async create(variable: CreateVariablePayload): Promise<Variable> {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variable),
      });
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || 'Failed to create variable');
      }
      
      const data: VariableResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating variable:', error);
      throw error;
    }
  }

  /**
   * Update an existing variable
   * @param id - Variable ID
   * @param variable - Updated variable data
   * @returns Promise with updated variable
   */
  static async update(id: string, variable: UpdateVariablePayload): Promise<Variable> {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variable),
      });
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || `Failed to update variable ${id}`);
      }
      
      const data: VariableResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error updating variable ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a variable
   * @param id - Variable ID
   * @returns Promise with success status
   */
  static async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || `Failed to delete variable ${id}`);
      }
    } catch (error) {
      console.error(`Error deleting variable ${id}:`, error);
      throw error;
    }
  }

  /**
   * Batch update multiple variables at once
   * @param variables - Array of variables with updates
   * @returns Promise with updated variables
   */
  static async batchUpdate(variables: { id: string; updates: UpdateVariablePayload }[]): Promise<Variable[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/batch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variables }),
      });
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || 'Failed to batch update variables');
      }
      
      const data: VariablesListResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error batch updating variables:', error);
      throw error;
    }
  }

  /**
   * Export all variables (for backup/migration)
   * @returns Promise with all variables in exportable format
   */
  static async exportAll(): Promise<{ variables: Variable[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/export`);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || 'Failed to export variables');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error exporting variables:', error);
      throw error;
    }
  }

  /**
   * Import variables from a backup
   * @param importData - Variables to import
   * @returns Promise with imported variables
   */
  static async importVariables(importData: { variables: CreateVariablePayload[] }): Promise<Variable[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importData),
      });
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || 'Failed to import variables');
      }
      
      const data: VariablesListResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error importing variables:', error);
      throw error;
    }
  }
}

export default VariablesAPI;

