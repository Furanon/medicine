import { useState, useEffect } from 'react'
import { Box } from '@mui/material'
import CalendarView from '../components/calendar/CalendarView'
import EventForm from '../components/calendar/EventForm'
import FilterBar from '../components/calendar/FilterBar'
import Loading from '../components/common/Loading'
import { fetchEvents, createEvent } from '../services/api'

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const data = await fetchEvents()
      setEvents(data)
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEventCreate = async (eventData) => {
    try {
      await createEvent(eventData)
      await loadEvents()
    } catch (error) {
      console.error('Failed to create event:', error)
    }
  }

  if (loading) return <Loading />

  return (
    <Box>
      <FilterBar onFilterChange={(name, value) => console.log(name, value)} />
      <CalendarView
        events={events}
        onEventSelect={(event) => console.log('Selected event:', event)}
        onRangeChange={(range) => console.log('Range changed:', range)}
      />
      <EventForm onSubmit={handleEventCreate} />
    </Box>
  )
}

