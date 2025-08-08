import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin  from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api/events';

export default function CalendarPage() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);

  // Fetch from your API once
  useEffect(() => {
    getEvents().then(raw => {
      // map your events to FullCalendar’s { id, title, start, end } shape
      setEvents(raw.map(e => ({
        id:    e._id,
        title: e.title,
        start: e.start,
        end:   e.end || null
      })));
    });
  }, []);

  // Handler: date click to create a new event
  const handleDateSelect = async (selectInfo) => {
    const title = prompt('Event title:');
    if (!title) return;

    // create in the backend
    const created = await createEvent({
      title,
      start: selectInfo.start,
      end:   selectInfo.end
    });

    // push into state
    setEvents(events.concat({
      id:    created._id,
      title: created.title,
      start: created.start,
      end:   created.end || null
    }));
  };

  // Handler: event resize or drop
  const handleEventChange = async (changeInfo) => {
    const ev = changeInfo.event;
    const updated = await updateEvent(ev.id, {
      start: ev.start,
      end:   ev.end
    });
    // sync in state
    setEvents(events.map(e => e.id === updated._id
      ? { id: updated._id, title: updated.title, start: updated.start, end: updated.end }
      : e
    ));
  };

  // Handler: event click to delete
  const handleEventClick = async (clickInfo) => {
    if (window.confirm(`Delete “${clickInfo.event.title}”?`)) {
      await deleteEvent(clickInfo.event.id);
      setEvents(events.filter(e => e.id !== clickInfo.event.id));
    }
  };

  return (
    <div className="content-wrapper">
      <FullCalendar
        ref={calendarRef}
        plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
        initialView="dayGridMonth"
        headerToolbar={{
          left:   'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        selectable={true}
        editable={true}
        select={handleDateSelect}
        events={events}
        eventChange={handleEventChange}   // for drag & drop / resize
        eventClick={handleEventClick}
        height="auto"
      />
    </div>
  );
}
