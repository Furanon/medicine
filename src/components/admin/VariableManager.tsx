import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  TextField,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Snackbar,
  Alert,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { VariablesAPI, Variable, VariableType, CreateVariablePayload, UpdateVariablePayload, ErrorResponse } from '../../api/variables';

/**
 * Interface definitions for the VariableManager component
 */

/**
 * Represents form data for variable creation and editing
 */
interface VariableFormData {
  name: string;
  value: string;
  type: VariableType;
  description: string;
}

/**
 * Error boundary component that catches JavaScript errors in child components
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Variable Manager Error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" gutterBottom>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Represents the loading and error state of an API operation
 */
interface OperationStatus {
  loading: boolean;
  error: string | null;
}

// For validating variable data
// Using the API error response type directly to extract validation error structure
/**
 * Represents a single validation error for a specific field
 */
type ValidationError = ErrorResponse['errors'] extends Array<infer T> ? T : never;

/**
 * Validates variable form data and returns any validation errors
 * @param data - The variable form data to validate
 * @returns Array of validation errors (empty if valid)
 */
const validateVariableData = (data: VariableFormData): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!data.name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (data.name.length < 3) {
    errors.push({ field: 'name', message: 'Name must be at least 3 characters' });
  } else if (!/^[A-Z][A-Z0-9_]*$/.test(data.name)) {
    errors.push({ 
      field: 'name', 
      message: 'Name must be in uppercase with only letters, numbers, and underscores' 
    });
  }
  
  if (data.type === 'number' && isNaN(Number(data.value))) {
    errors.push({ field: 'value', message: 'Value must be a valid number' });
  } else if (data.type === 'boolean' && !['true', 'false'].includes(data.value.toLowerCase())) {
    errors.push({ field: 'value', message: 'Value must be "true" or "false"' });
  } else if (data.type === 'json') {
    try {
      JSON.parse(data.value);
    } catch (e) {
      errors.push({ field: 'value', message: 'Value must be valid JSON' });
    }
  }
  
  return errors;
};

/**
 * Sort and filter type definitions
 */
/** Fields by which variables can be sorted */
type SortField = 'name' | 'type' | 'updatedAt';
/** Sort directions for variable sorting */
type SortDirection = 'asc' | 'desc';

/** Variable type filter options */
type FilterType = 'all' | 'string' | 'number' | 'boolean' | 'json';

/**
 * VariableManager - A component for managing system variables
 * 
 * Provides a UI for creating, reading, updating, and deleting variables
 * with support for filtering, sorting, and error handling.
 */
const VariableManager: React.FC = () => {
  // State for variables data
  const [variables, setVariables] = useState<Variable[]>([]);
  
  // State for API operations
  const [apiState, setApiState] = useState<{
    fetchStatus: OperationStatus;
    createStatus: OperationStatus;
    updateStatus: OperationStatus;
    deleteStatus: OperationStatus;
  }>({
    fetchStatus: { loading: true, error: null },
    createStatus: { loading: false, error: null },
    updateStatus: { loading: false, error: null },
    deleteStatus: { loading: false, error: null }
  });
  
  // State for sorting and filtering
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State for dialog controls
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [currentVariable, setCurrentVariable] = useState<Variable | null>(null);
  
  // State for form data
  const [formData, setFormData] = useState<VariableFormData>({
    name: '',
    value: '',
    type: 'string',
    description: '',
  });
  
  // State for form validation
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  // State for alerts
  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Load variables on component mount
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setApiState(prev => ({ ...prev, fetchStatus: { loading: true, error: null } }));
        const data = await VariablesAPI.listVariables();
        setVariables(data);
      } catch (err) {
        console.error('Error loading variables:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load variables. Please try again.';
        setApiState(prev => ({ ...prev, fetchStatus: { loading: false, error: errorMessage } }));
      } finally {
        setApiState(prev => ({ ...prev, fetchStatus: { loading: false, error: prev.fetchStatus.error } }));
      }
    };
    
    loadVariables();
  }, []);
  
  // Function to retry loading variables
  const handleRetryFetch = () => {
    const loadVariables = async () => {
      try {
        setApiState(prev => ({ ...prev, fetchStatus: { loading: true, error: null } }));
        const data = await VariablesAPI.listVariables();
        setVariables(data);
      } catch (err) {
        console.error('Error loading variables:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load variables. Please try again.';
        setApiState(prev => ({ ...prev, fetchStatus: { loading: false, error: errorMessage } }));
      } finally {
        setApiState(prev => ({ ...prev, fetchStatus: { loading: false, error: prev.fetchStatus.error } }));
      }
    };
    
    loadVariables();
  };
  
  // Filter and sort variables
  const filteredAndSortedVariables = variables
    .filter((variable) => {
      // Apply type filter
      if (filterType !== 'all' && variable.type !== filterType) {
        return false;
      }
      
      // Apply search filter
      if (searchTerm && !variable.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !variable.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === 'type') {
        return sortDirection === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      } else if (sortField === 'updatedAt') {
        return sortDirection === 'asc'
          ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return 0;
    });
  
  // Handle sort changes
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset direction
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Open edit dialog
  const handleEditClick = (variable: Variable) => {
    setCurrentVariable(variable);
    setFormData({
      name: variable.name,
      value: variable.value,
      type: variable.type,
      description: variable.description || '',
    });
    setValidationErrors([]);
    setEditDialogOpen(true);
  };
  
  // Open create dialog
  const handleCreateClick = () => {
    setFormData({
      name: '',
      value: '',
      type: 'string',
      description: '',
    });
    setValidationErrors([]);
    setCreateDialogOpen(true);
  };
  
  // Open delete dialog
  const handleDeleteClick = (variable: Variable) => {
    setCurrentVariable(variable);
    setDeleteDialogOpen(true);
  };
  
  // Handle form field changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  
  // Handle variable creation
  const handleCreateVariable = async () => {
    const errors = validateVariableData(formData);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      setApiState(prev => ({ ...prev, createStatus: { loading: true, error: null } }));
      
      // Create payload with proper types according to the variable type
      const payload: CreateVariablePayload = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        value: formatValueByType(formData.value, formData.type),
      };
      
      const newVariable = await VariablesAPI.createVariable(payload);
      setVariables((prev) => [...prev, newVariable]);
      setCreateDialogOpen(false);
      setAlert({
        open: true,
        message: 'Variable created successfully!',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error creating variable:', err);
      
      // Handle API validation errors
      if (err instanceof Error) {
        try {
          const errorResponse = JSON.parse(err.message) as ErrorResponse;
          if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
            setValidationErrors(errorResponse.errors);
            setApiState(prev => ({ ...prev, createStatus: { loading: false, error: 'Validation failed' } }));
            return;
          }
        } catch (parseErr) {
          // Not a parseable error, continue with generic error
        }
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to create variable. Please try again.';
      setApiState(prev => ({ ...prev, createStatus: { loading: false, error: errorMessage } }));
      
      setAlert({
        open: true,
        message: 'Failed to create variable. Please try again.',
        severity: 'error',
      });
    } finally {
      setApiState(prev => ({ ...prev, createStatus: { loading: false, error: prev.createStatus.error } }));
    }
  };
  
  // Retry variable creation
  const handleRetryCreate = () => {
    handleCreateVariable();
  };
  
  // Handle variable update
  const handleUpdateVariable = async () => {
    if (!currentVariable) return;
    
    const errors = validateVariableData(formData);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      setApiState(prev => ({ ...prev, updateStatus: { loading: true, error: null } }));
      
      // Create update payload with proper types according to the variable type
      const payload: UpdateVariablePayload = {
        type: formData.type,
        description: formData.description,
        value: formatValueByType(formData.value, formData.type),
      };
      
      const updatedVariable = await VariablesAPI.updateVariable(currentVariable.id, payload);
      setVariables((prev) => 
        prev.map((v) => (v.id === updatedVariable.id ? updatedVariable : v))
      );
      setEditDialogOpen(false);
      setAlert({
        open: true,
        message: 'Variable updated successfully!',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error updating variable:', err);
      
      // Handle API validation errors
      if (err instanceof Error) {
        try {
          const errorResponse = JSON.parse(err.message) as ErrorResponse;
          if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
            setValidationErrors(errorResponse.errors);
            setApiState(prev => ({ ...prev, updateStatus: { loading: false, error: 'Validation failed' } }));
            return;
          }
        } catch (parseErr) {
          // Not a parseable error, continue with generic error
        }
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update variable. Please try again.';
      setApiState(prev => ({ ...prev, updateStatus: { loading: false, error: errorMessage } }));
      
      setAlert({
        open: true,
        message: 'Failed to update variable. Please try again.',
        severity: 'error',
      });
    } finally {
      setApiState(prev => ({ ...prev, updateStatus: { loading: false, error: prev.updateStatus.error } }));
    }
  };
  
  // Retry variable update
  const handleRetryUpdate = () => {
    handleUpdateVariable();
  };
  
  // Handle variable deletion
  const handleDeleteVariable = async () => {
    if (!currentVariable) return;
    
    try {
      setApiState(prev => ({ ...prev, deleteStatus: { loading: true, error: null } }));
      await VariablesAPI.deleteVariable(currentVariable.id);
      setVariables((prev) => prev.filter((v) => v.id !== currentVariable.id));
      setDeleteDialogOpen(false);
      setAlert({
        open: true,
        message: 'Variable deleted successfully!',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error deleting variable:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete variable. Please try again.';
      setApiState(prev => ({ ...prev, deleteStatus: { loading: false, error: errorMessage } }));
      
      setAlert({
        open: true,
        message: 'Failed to delete variable. Please try again.',
        severity: 'error',
      });
    } finally {
      setApiState(prev => ({ ...prev, deleteStatus: { loading: false, error: prev.deleteStatus.error } }));
    }
  };
  
  // Retry variable deletion
  const handleRetryDelete = () => {
    handleDeleteVariable();
  };
  
  // Helper function to format value based on type
  const formatValueByType = (value: string, type: VariableType): string | number | boolean | object => {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch (e) {
          // If JSON parsing fails, return as string
          return value;
        }
      default:
        return value;
    }
  };
  
  // Handle alert close
  const handleAlertClose = () => {
    setAlert((prev) => ({
      ...prev,
      open: false,
    }));
  };
  
  // Get field validation error
  const getFieldError = (field: string) => {
    const error = validationErrors.find((err) => err.field === field);
    return error ? error.message : '';
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  // Render the variable manager UI
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          System Variables
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          disabled={apiState.fetchStatus.loading || apiState.createStatus.loading}
        >
          Add Variable
        </Button>
      </Box>
      
      {/* Search and filter toolbar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="filter-type-label">Filter by Type</InputLabel>
              <Select
                labelId="filter-type-label"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                label="Filter by Type"
                startAdornment={
                  <InputAdornment position="start">
                    <FilterIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="string">String</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="boolean">Boolean</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" justifyContent="flex-end">
              <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
                {filteredAndSortedVariables.length} variables found
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Error message */}
      {apiState.fetchStatus.error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetryFetch}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          {apiState.fetchStatus.error}
        </Alert>
      )}
      
      {/* Variables table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => handleSortChange('name')}
                >
                  Name
                  {sortField === 'name' && (
                    <SortIcon
                      fontSize="small"
                      sx={{
                        ml: 0.5,
                        transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>Value</TableCell>
              <TableCell>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => handleSortChange('type')}
                >
                  Type
                  {sortField === 'type' && (
                    <SortIcon
                      fontSize="small"
                      sx={{
                        ml: 0.5,
                        transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>Description</TableCell>
              <TableCell>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => handleSortChange('updatedAt')}
                >
                  Updated At
                  {sortField === 'updatedAt' && (
                    <SortIcon
                      fontSize="small"
                      sx={{
                        ml: 0.5,
                        transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiState.fetchStatus.loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <CircularProgress size={48} thickness={4} sx={{ mb: 2 }} />
                    <Typography variant="body1" color="textSecondary">
                      Loading variables...
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : filteredAndSortedVariables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body1">
                    {searchTerm || filterType !== 'all'
                      ? 'No variables match the current filters'
                      : 'No variables found. Click "Add Variable" to create one.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedVariables.map((variable) => (
                <TableRow key={variable.id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
                      {variable.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      fontFamily="monospace"
                      sx={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {variable.value}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        backgroundColor: 
                          variable.type === 'string' ? 'primary.light' :
                          variable.type === 'number' ? 'secondary.light' :
                          variable.type === 'boolean' ? 'success.light' : 'warning.light',
                        color: '#fff',
                        borderRadius: '4px',
                        px: 1,
                        py: 0.5,
                        display: 'inline-block',
                      }}
                    >
                      {variable.type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: '250px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {variable.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(variable.updatedAt)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleEditClick(variable)}
                        size="small"
                        sx={{ mr: 1 }}
                        disabled={apiState.updateStatus.loading || apiState.deleteStatus.loading}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteClick(variable)}
                        size="small"
                        disabled={apiState.updateStatus.loading || apiState.deleteStatus.loading}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* If no fetching error but a loading retry button needed */}
      {!apiState.fetchStatus.error && !apiState.fetchStatus.loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRetryFetch}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Refresh Variables
          </Button>
        </Box>
      )}
      
      {/* Create/Edit Variable Dialog */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen ? 'Create New Variable' : 'Edit Variable'}
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Variable Name"
              name="name"
              autoFocus
              value={formData.name}
              onChange={handleFormChange}
              error={!!getFieldError('name')}
              helperText={getFieldError('name') || 'Use uppercase letters, numbers, and underscores (e.g., MAX_APPOINTMENTS)'}
              disabled={editDialogOpen} // Cannot edit name of existing variable
              InputProps={{
                sx: { fontFamily: 'monospace' }
              }}
            />
            <FormControl
              fullWidth
              margin="normal"
              required
            >
              <InputLabel id="variable-type-label">Variable Type</InputLabel>
              <Select
                labelId="variable-type-label"
                id="type"
                name="type"
                value={formData.type}
                label="Variable Type"
                onChange={handleFormChange as any}
              >
                <MenuItem value="string">String</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="boolean">Boolean</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              required
              fullWidth
              id="value"
              label="Value"
              name="value"
              value={formData.value}
              onChange={handleFormChange}
              error={!!getFieldError('value')}
              helperText={getFieldError('value') || getValueHelperText(formData.type)}
              multiline={formData.type === 'json'}
              rows={formData.type === 'json' ? 4 : 1}
              InputProps={{
                sx: { fontFamily: 'monospace' }
              }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="description"
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              multiline
              rows={2}
              helperText="Provide a clear description of what this variable controls"
            />
          </Box>
        </DialogContent>
        {/* Error messages for create/update */}
        {((createDialogOpen && apiState.createStatus.error) || 
          (editDialogOpen && apiState.updateStatus.error)) && (
          <Alert 
            severity="error" 
            sx={{ mx: 3, mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={createDialogOpen ? handleRetryCreate : handleRetryUpdate}
                startIcon={<RefreshIcon />}
              >
                Retry
              </Button>
            }
          >
            {createDialogOpen ? apiState.createStatus.error : apiState.updateStatus.error}
          </Alert>
        )}
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
            }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={createDialogOpen ? handleCreateVariable : handleUpdateVariable}
            variant="contained"
            color="primary"
            disabled={createDialogOpen ? apiState.createStatus.loading : apiState.updateStatus.loading}
            startIcon={
              (createDialogOpen && apiState.createStatus.loading) || 
              (editDialogOpen && apiState.updateStatus.loading) ? 
              <CircularProgress size={18} color="inherit" /> : 
              null
            }
          >
            {createDialogOpen ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the variable <strong>{currentVariable?.name}</strong>?
            This action cannot be undone and may affect system functionality.
          </DialogContentText>
        </DialogContent>
        {/* Error messages for delete */}
        {apiState.deleteStatus.error && (
          <Alert 
            severity="error" 
            sx={{ mx: 3, mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleRetryDelete}
                startIcon={<RefreshIcon />}
              >
                Retry
              </Button>
            }
          >
            {apiState.deleteStatus.error}
          </Alert>
        )}
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteVariable}
            variant="contained"
            color="error"
            disabled={apiState.deleteStatus.loading}
            startIcon={apiState.deleteStatus.loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Alert Snackbar - Enhanced with slide transition and auto-dismiss */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionProps={{
          direction: 'up',
          timeout: {
            enter: 400,
            exit: 300,
          }
        }}
        sx={{
          '& .MuiSnackbarContent-root': {
            minWidth: '250px',
          }
        }}
      >
        <Alert 
          onClose={handleAlertClose} 
          severity={alert.severity}
          variant="filled"
          elevation={6}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};


/**
 * Helper function to get appropriate helper text based on variable type
 * @param type - The variable type (string, number, boolean, json)
 * @returns The helper text appropriate for the variable type
 */
function getValueHelperText(type: string): string {
  switch (type) {
    case 'string':
      return 'Enter any text value';
    case 'number':
      return 'Enter a valid number';
    case 'boolean':
      return 'Enter "true" or "false"';
    case 'json':
      return 'Enter valid JSON data';
    default:
      return '';
  }
}

/**
 * VariableManager component for managing system variables
 * 
 * Provides a complete interface for listing, creating, updating, and deleting
 * system variables with proper validation, sorting, filtering, and error handling.
 * 
 * Features:
 * - CRUD operations for system variables
 * - Sorting by name, type, and update time
 * - Filtering by variable type and search term
 * - Form validation with error messages
 * - Error handling with retry options
 * - Loading states for all operations
 * 
 * @returns A React component for managing system variables
 */
const MemoizedVariableManager = React.memo(VariableManager);

/**
 * VariableManagerWithErrorBoundary component wraps the VariableManager
 * with an error boundary to handle unexpected errors
 */
export function VariableManagerWithErrorBoundary(): JSX.Element {
  return (
    <ErrorBoundary>
      <MemoizedVariableManager />
    </ErrorBoundary>
  );
}

// Default export with ErrorBoundary
export default VariableManagerWithErrorBoundary;
