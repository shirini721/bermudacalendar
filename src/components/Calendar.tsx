'use client';

import { useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import type { Event } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import EventModal from './EventModal';
import { Plus } from 'lucide-react';

function eventToFCInput(event: Event): EventInput {
  return {
    id: event.id,
    title: event.title,
    start: event.start_at,
    end: event.end_at,
    allDay: event.all_day,
    backgroundColor: CATEGORY_COLORS[event.category] ?? '#6b7280',
    borderColor: CATEGORY_COLORS[event.category] ?? '#6b7280',
    extendedProps: { ...event },
  };
}

export default function Calendar({ initialEvents }: { initialEvents: Event[] }) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setSelectedEvent(null);
    setDefaultStart(selectInfo.start);
    setModalOpen(true);
    selectInfo.view.calendar.unselect();
  }, []);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo.event.extendedProps as Event);
    setDefaultStart(null);
    setModalOpen(true);
  }, []);

  function handleEventSaved(savedEvent: Event) {
    setEvents(prev => {
      const exists = prev.some(e => e.id === savedEvent.id);
      return exists ? prev.map(e => e.id === savedEvent.id ? savedEvent : e) : [...prev, savedEvent];
    });
    setModalOpen(false);
  }

  function handleEventDeleted(eventId: string) {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-end">
          <button
            onClick={() => { setSelectedEvent(null); setDefaultStart(new Date()); setModalOpen(true); }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 px-4 sm:px-6 py-4 overflow-hidden">
        <div className="mx-auto max-w-7xl h-full">
          <div className="card h-full overflow-hidden">
            <div className="p-4 h-full">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                }}
                buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day', list: 'List' }}
                events={events.map(eventToFCInput)}
                selectable
                selectMirror
                dayMaxEvents={3}
                weekends
                editable={false}
                select={handleDateSelect}
                eventClick={handleEventClick}
                height="100%"
                eventDisplay="block"
                nowIndicator
                eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
              />
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <EventModal
          event={selectedEvent}
          defaultStart={defaultStart ?? undefined}
          onClose={() => setModalOpen(false)}
          onSaved={handleEventSaved}
          onDeleted={handleEventDeleted}
        />
      )}
    </div>
  );
}
