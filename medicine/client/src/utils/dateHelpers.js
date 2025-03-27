import { format, parseISO } from 'date-fns'

export const formatDateTime = (date) => {
  return format(parseISO(date), 'PPpp')
}

export const formatDate = (date) => {
  return format(parseISO(date), 'PP')
}

export const formatTime = (date) => {
  return format(parseISO(date), 'pp')
}

export const toISOString = (date) => {
  return date.toISOString().slice(0, 16)
}

