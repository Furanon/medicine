import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Select, FormControl, FormHelperText, InputLabel, MenuItem, Box } from '@mui/material';

/**
 * VenueSelector component for selecting venues from a dropdown
 * 
 * @component
 */
const VenueSelector = ({ 
  selectedVenue, 
  onVenueSelect, 
  isDisabled = false,
  venues = [],
  error = null,
  label = "Venue"
}) => {
  const [localError, setLocalError] = useState(null);
  
  // Reset local error when external error prop changes
  useEffect(() => {
    setLocalError(error);
  }, [error]);

  const handleVenueChange = (event) => {
    try {
      const venueId = event.target.value;
      onVenueSelect(venueId);
      setLocalError(null);
    } catch (err) {
      setLocalError('Failed to select venue. Please try again.');
      console.error('Venue selection error:', err);
    }
  };

  return (
    <Box sx={{ minWidth: 200, marginY: 2 }}>
      <FormControl 
        fullWidth 
        error={!!localError} 
        disabled={isDisabled}
        variant="outlined"
      >
        <InputLabel id="venue-select-label">{label}</InputLabel>
        <Select
          labelId="venue-select-label"
          id="venue-select"
          value={selectedVenue || ''}
          onChange={handleVenueChange}
          label={label}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 300
              }
            }
          }}
        >
          <MenuItem value="" disabled>
            <em>Select a venue</em>
          </MenuItem>
          {venues.length > 0 ? (
            venues.map((venue) => (
              <MenuItem key={venue.id} value={venue.id}>
                {venue.name}
              </MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>
              <em>No venues available</em>
            </MenuItem>
          )}
        </Select>
        {localError && <FormHelperText>{localError}</FormHelperText>}
      </FormControl>
    </Box>
  );
};

VenueSelector.propTypes = {
  /**
   * Currently selected venue ID
   */
  selectedVenue: PropTypes.string,
  
  /**
   * Callback function when a venue is selected
   */
  onVenueSelect: PropTypes.func.isRequired,
  
  /**
   * Whether the selector is disabled
   */
  isDisabled: PropTypes.bool,
  
  /**
   * Array of venue objects with id and name properties
   */
  venues: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ),
  
  /**
   * Error message to display
   */
  error: PropTypes.string,
  
  /**
   * Label for the venue selector
   */
  label: PropTypes.string
};

export default VenueSelector;

