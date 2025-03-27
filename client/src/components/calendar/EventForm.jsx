import { useState } from 'react'
import { TextField, Button, Box, MenuItem } from '@mui/material'

export default function EventForm({ onSubmit, initialData = {} }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue_id: '',
    start_time: '',
    end_time: '',
    ...initialData
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <TextField
        fullWidth
        margin="normal"
        label="Title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        required
      />
      <TextField
        fullWidth
        margin="normal"
        label="Description"
        name="description"
        multiline
        rows={4}
        value={formData.description}
        onChange={handleChange}
      />
      <TextField
        fullWidth
        margin="normal"
        label="Start Time"
        name="start_time"
        type="datetime-local"
        value={formData.start_time}
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        required
      />
      <TextField
        fullWidth
        margin="normal"
        label="End Time"
        name="end_time"
        type="datetime-local"
        value={formData.end_time}
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        required
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
      >
        Save Event
      </Button>
    </Box>
  )
}

