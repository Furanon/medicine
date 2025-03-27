import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, isValid, addMinutes } from 'date-fns'
import { useState, useRef, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './CalendarView.css'
import { Tooltip } from '../common/Tooltip'
import { parseRRule } from '../../utils/dateHelpers'
const locales = {
  'en-US': require('date-fns/locale/en-US')
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})
// Custom Event Component for displaying events with status and capacity
const EventComponent = ({ event }) => {
  const capacity = event.max_participants ? 
    `${event.current_participants || 0}/${event.max_participants}` : 
    'Unlimited';
  
  const capacityPercentage = event.max_participants ? 
    Math.min(100, Math.floor((event.curren}

CalendarView.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      start: PropTypes.instanceOf(Date).isRequired,
      end: PropTypes.instanceOf(Date).isRequired,
      description: PropTypes.string,
      status: PropTypes.string,
      max_participants: PropTypes.number,
      current_participants: PropTypes.number,
      recurrence_rule: PropTypes.string,
      venue: PropTypes.shape({
        name: PropTypes.string.isRequired,
        location: PropTypes.string,
        capacity: PropTypes.number,
        configuration: PropTypes.object
      })
    })
  ),
  onEventSelect: PropTypes.func,
  onRangeChange: PropTypes.func,
  onSelectSlot: PropTypes.func,
  views: PropTypes.arrayOf(PropTypes.string),
  defaultView: PropTypes.string
};
participants || 0) / event.max_participants * 100)) : 
    0;

  const isRecurring = event.recurrence_rule && event.recurrence_rule.length > 0;

  return (
    <div className={`custom-event ${event.status || 'scheduled'}`}>
      <div className="event-title">
        {event.title} {isRecurring && <span className="recurring-indicator">↻</span>}
      </div>
      {event.venue && (
        <div className="event-venue">@ {event.venue.name}</div>
      )}
      {event.max_participants > 0 && (
        <div className="capacity-container">
          <div className="capacity-text">{capacity}</div>
          <div className="capacity-bar">
            <div 
              className="capacity-fill" 
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
        </div>
      )}
      <div className="event-status">{event.status || 'scheduled'}</div>
    </div>
  );
};

// Tooltip content component for detailed event information
const EventTooltip = ({ event }) => {
  return (
    <div className="event-tooltip">
      <h3>{event.title}</h3>
      <p className="event-time">
        {format(new Date(event.start), 'MMM dd, yyyy h:mm a')} - {format(new Date(event.end), 'h:mm a')}
      </p>
      
      {event.recurrence_rule && (
        <p className="recurrence-info">
          <strong>Recurring:</strong> {event.recurrence_rule}
        </p>
      )}
      
      {event.description && (
        <p className="event-description">{event.description}</p>
      )}
      
      {event.venue && (
        <div className="venue-info">
          <h4>Venue: {event.venue.name}</h4>
          <p>{event.venue.location}</p>
          <p>Capacity: {event.venue.capacity}</p>
        </div>
      )}
      
      <div className="registration-info">
        <p>
          <strong>Status:</strong> <span className={`status-${event.status || 'scheduled'}`}>{event.status || 'Scheduled'}</span>
        </p>
        <p>
          <strong>Registration:</strong> {event.current_participants || 0} of {event.max_participants || 'Unlimited'}
        </p>
      </div>
    </div>
  );
};

export default function CalendarView({ 
  events = [], 
  onEventSelect, 
  onRangeChange,
  onSelectSlot,
  views = ['month', 'week', 'day', 'agenda'],
  defaultView = 'month',
}) {
  const [tooltipEvent, setTooltipEvent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const calendarRef = useRef(null);

  // Process recurring events for display
  const processedEvents = useMemo(() => {
    let allEvents = [];
    
    events.forEach(event => {
      allEvents.push(event);
      
      // Handle recurring events
      if (event.recurrence_rule && event.start && event.end) {
        try {
          const recurringDates = parseRRule(
            event.recurrence_rule, 
            new Date(event.start), 
            addMinutes(new Date(), 60 * 24 * 90) // 90 days ahead
          );
          
          // Get duration of original event
          const duration = new Date(event.end) - new Date(event.start);
          
          // Create new event instances for each recurrence date
          recurringDates.forEach((date, index) => {
            // Skip the first date which is the original event
            if (index === 0) return;
            
            // Calculate end time based on original duration
            const recurEnd = new Date(date.getTime() + duration);
            
            // Create a new event instance
            allEvents.push({
              ...event,
              id: `${event.id}_recur_${index}`,
              start: date,
              end: recurEnd,
              title: event.title,
              isRecurrence: true,
              originalEventId: event.id
            });
          });
        } catch (error) {
          console.error("Error processing recurring event:", error);
        }
      }
    });
    
    return allEvents;
  }, [events]);

  // Handle event styles based on status
  const eventPropGetter = (event) => {
    let className = `event-status-${event.status || 'scheduled'}`;
    
    if (event.isRecurrence) {
      className += ' recurring-instance';
    }
    
    if (event.current_participants >= event.max_participants) {
      className += ' event-full';
    }
    
    return { className };
  };

  // Show tooltip on hover
  const handleEventMouseEnter = (event, e) => {
    const { clientX, clientY } = e;
    setTooltipEvent(event);
    setTooltipPosition({ 
      left: clientX + 10, 
      top: clientY + 10 
    });
  };

  // Hide tooltip when mouse leaves
  const handleEventMouseLeave = () => {
    setTooltipEvent(null);
  };

  return (
    <div className="calendar-container" ref={calendarRef}>
      <Calendar
        localizer={localizer}
        events={processedEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 'calc(100vh - 200px)' }}
        onSelectEvent={onEventSelect}
        onRangeChange={onRangeChange}
        onSelectSlot={onSelectSlot}
        selectable={true}
        views={views}
        defaultView={defaultView}
        components={{
          event: EventComponent
        }}
        eventPropGetter={eventPropGetter}
        onMouseEnterEvent={handleEventMouseEnter}
        onMouseLeaveEvent={handleEventMouseLeave}
        popup={true}
      />
      
      {tooltipEvent && (
        <Tooltip
          content={<EventTooltip event={tooltipEvent} />}
          position={tooltipPosition}
          onClose={() => setTooltipEvent(null)}
        />
      )}
    </div>
  );
}

