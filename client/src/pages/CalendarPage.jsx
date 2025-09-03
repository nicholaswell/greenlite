// src/pages/CalendarPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api/events';


// small hook to track a media query
function useMediaQuery(q) {
  const [matches, set] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const onChange = () => set(m.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [q]);
  return matches;
}

// helper: get 'YYYY-MM-DD' from a Date in local time
function clickSafeDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarPage() {
  const calendarRef = useRef(null);
  const isNarrow = useMediaQuery('(max-width: 700px)');

  const [events, setEvents] = useState([]);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formDesc, setFormDesc] = useState('');

  useEffect(() => {
    (async () => {
      const raw = await getEvents();
      setEvents(
        raw.map(e => ({
          id: e._id,
          title: e.title,
          start: e.start,
          end: e.end || null,
          allDay: !!e.allDay,
          extendedProps: { description: e.description || '' }
        }))
      );
    })();
  }, []);

  // live swap view when screen size changes
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const target = isNarrow ? 'listMonth' : 'dayGridMonth';
    if (api.view?.type !== target) api.changeView(target);
  }, [isNarrow]);

  const handleDateSelect = (selectInfo) => {
    setSelectedInfo(selectInfo);
    setEditingId(null);
    setFormTitle('');
    setFormTime('');
    setFormAllDay(false);
    setFormDesc('');
    setModalOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setEditingId(null);
    setModalOpen(false);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    let start, end = null;
    const baseDateStr = editingId
      ? clickSafeDateStr(selectedEvent?.start)
      : selectedInfo.startStr;

    if (formAllDay || !formTime) {
      start = baseDateStr;
    } else {
      const local = new Date(`${baseDateStr}T${formTime}`);
      start = local.toISOString();
      end = new Date(local.getTime() + 60 * 60 * 1000).toISOString();
    }

    if (!editingId) {
      const created = await createEvent({
        title: formTitle.trim(),
        start, end,
        allDay: formAllDay,
        description: formDesc.trim(),
      });

      setEvents(evts => evts.concat({
        id: created._id,
        title: created.title,
        start: created.start,
        end: created.end || null,
        allDay: !!created.allDay,
        extendedProps: { description: created.description || '' }
      }));
    } else {
      const updated = await updateEvent(editingId, {
        title: formTitle.trim(),
        start, end,
        allDay: formAllDay,
        description: formDesc.trim(),
      });

      setEvents(evts => evts.map(e =>
        e.id === editingId
          ? {
              id: updated._id,
              title: updated.title,
              start: updated.start,
              end: updated.end || null,
              allDay: !!updated.allDay,
              extendedProps: { description: updated.description || '' }
            }
          : e
      ));

      const api = calendarRef.current?.getApi();
      const live = api?.getEventById(editingId);
      if (live) {
        live.setProp('title', formTitle.trim());
        live.setAllDay(formAllDay);
        live.setStart(updated.start);
        live.setEnd(updated.end || null);
        live.setExtendedProp('description', formDesc.trim());
      }
    }

    setModalOpen(false);
    setSelectedInfo(null);
    setEditingId(null);
    setFormTitle('');
    setFormTime('');
    setFormAllDay(false);
    setFormDesc('');
  };

  const handleEventChange = async (changeInfo) => {
    const ev = changeInfo.event;
    const updated = await updateEvent(ev.id, {
      start: ev.start ? ev.start.toISOString() : null,
      end: ev.end ? ev.end.toISOString() : null,
      allDay: ev.allDay
    });

    setEvents(list =>
      list.map(e =>
        e.id === ev.id
          ? { ...e, start: updated.start, end: updated.end || null, allDay: !!updated.allDay }
          : e
      )
    );
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    await deleteEvent(selectedEvent.id);
    setEvents(list => list.filter(e => e.id !== selectedEvent.id));
    setSelectedEvent(null);
  };

  const handleEdit = () => {
    if (!selectedEvent) return;
    setEditingId(selectedEvent.id);
    setSelectedInfo(null);
    setFormTitle(selectedEvent.title || '');
    setFormAllDay(selectedEvent.allDay);
    if (selectedEvent.allDay) setFormTime('');
    else {
      const dt = selectedEvent.start;
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      setFormTime(`${hh}:${mm}`);
    }
    setFormDesc(selectedEvent.extendedProps?.description || '');
    setModalOpen(true);
  };

  return (
    <div className="content-wrapper">
      <h3>Calendar</h3>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={isNarrow ? 'listMonth' : 'dayGridMonth'}
        headerToolbar={
          isNarrow
            ? { left: 'prev,next today', center: 'title', right: '' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' }
        }
        timeZone="local"
        selectable
        selectMirror
        editable
        select={handleDateSelect}
        events={events}
        eventChange={handleEventChange}
        eventClick={handleEventClick}
        height="auto"
        expandRows
        dayMaxEventRows={!isNarrow}
        moreLinkClick="popover"
        moreLinkText={n => `+${n} more`}
        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        nowIndicator={!isNarrow}
        stickyHeaderDates
      />

      {selectedEvent && (
        <div className="event-details">
          <h3>Event Details</h3>
          <div><strong>Title:</strong> {selectedEvent.title}</div>
          <div>
            <strong>When:</strong>{' '}
            {selectedEvent.allDay
              ? selectedEvent.start.toLocaleDateString()
              : `${selectedEvent.start.toLocaleString()}${selectedEvent.end ? ` – ${selectedEvent.end.toLocaleString()}` : ''}`}
          </div>
          <div><strong>All day:</strong> {selectedEvent.allDay ? 'Yes' : 'No'}</div>
          {selectedEvent.extendedProps?.description && (
            <div><strong>Description:</strong> {selectedEvent.extendedProps.description}</div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={handleEdit}>Edit</button>
            <button onClick={handleDelete}>Delete</button>
            <button onClick={() => setSelectedEvent(null)}>Close</button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <form onSubmit={handleModalSubmit}>
              <h3>{editingId ? 'Edit Event' : 'Create Event'}</h3>

              <label>
                Title
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={formAllDay}
                  onChange={e => setFormAllDay(e.target.checked)}
                />
                All-day
              </label>

              {!formAllDay && (
                <label style={{ marginTop: 10 }}>
                  Optional time
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                  />
                </label>
              )}

              <label style={{ marginTop: 10 }}>
                Description
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Notes, location, etc."
                />
              </label>

              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button type="submit">{editingId ? 'Save' : 'Add'}</button>
                <button type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
