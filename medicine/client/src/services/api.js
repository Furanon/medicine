import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

export const fetchEvents = async (params) => {
  const response = await api.get('/events', { params })
  return response.data
}

export const createEvent = async (eventData) => {
  const response = await api.post('/events', eventData)
  return response.data
}

export const updateEvent = async (eventId, eventData) => {
  const response = await api.put(`/events/${eventId}`, eventData)
  return response.data
}

export const deleteEvent = async (eventId) => {
  const response = await api.delete(`/events/${eventId}`)
  return response.data
}

