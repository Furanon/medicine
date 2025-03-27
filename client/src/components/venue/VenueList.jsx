import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  TextField,
  TablePagination,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

/**
 * VenueList component displays a list of venues with pagination and search functionality
 */
const VenueList = ({
  venues = [],
  loading = false,
  error = null,
  onEdit = () => {},
  onDelete = () => {},
  onSearch = () => {},
  totalCount = 0,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle search input changes
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Handle search submission
  const handleSearch = () => {
    setPage(0);
    onSearch(searchTerm);
  };
  
  // Handle keypress event for search field (submit on Enter)
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  // Get venue status chip based on status value
  const getStatusChip = (status) => {
    let color;
    switch (status.toLowerCase()) {
      case 'active':
        color = 'success';
        break;
      case 'inactive':
        color = 'error';
        break;
      case 'maintenance':
        color = 'warning';
        break;
      default:
        color = 'default';
    }
    
    return <Chip label={status} color={color} size="small" />;
  };
  
  // If loading, show loading indicator
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If there's an error, show error message
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="div">
          Venues
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search venues..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
          >
            Search
          </Button>
        </Box>
      </Box>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="venues table">
          <TableHead>
            <TableRow>
              <TableCell>Venue Name</TableCell>
              <TableCell align="right">Capacity</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {venues.length > 0 ? (
              venues.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((venue) => (
                <TableRow key={venue.id} hover>
                  <TableCell component="th" scope="row">
                    {venue.name}
                  </TableCell>
                  <TableCell align="right">{venue.capacity}</TableCell>
                  <TableCell align="center">
                    {getStatusChip(venue.status)}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      aria-label="edit venue"
                      onClick={() => onEdit(venue)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      aria-label="delete venue"
                      onClick={() => onDelete(venue)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No venues found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

VenueList.propTypes = {
  venues: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      capacity: PropTypes.number.isRequired,
      status: PropTypes.string.isRequired,
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSearch: PropTypes.func,
  totalCount: PropTypes.number,
};

export default VenueList;

