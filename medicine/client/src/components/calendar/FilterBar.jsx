import { TextField, Box } from '@mui/material'

export default function FilterBar({ onFilterChange }) {
  const handleDateChange = (e) => {
    const { name, value } = e.target
    onFilterChange(name, value)
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <TextField
        label="Start Date"
        type="date"
        name="startDate"
        onChange={handleDateChange}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="End Date"
        type="date"
        name="endDate"
        onChange={handleDateChange}
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  )
}

