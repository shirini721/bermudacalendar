'use client';

import { useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventInput } from '@fullcalendar/core';
import { Plus } from 'lucide-react';
import type { CalEvent } from '@/types';
import { PERSON_COLORS, CATEGORY_COLORS } from '@/types';
import EventModal from './EventModal';

function eventColor(e: CalEvent): string {
  if (e.person && PERSON_COLORS[e.person]) return PERSON_COLORS[e.person];
  return e.color ?? CATEGORY_COLORS[e.category] ?? '#6b7280';
}

function toFCEvent(e: CalEvent): EventInput {
  const color = eventColor(e);
  return {
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    backgroundColor: color,
    borderColor: color,
    extendedProps: { calEvent: e },
  };
}

export default function CalendarView({ initialEvents }: { initialEvents: CalEvent[] }) {
  const [events, setEvents] = useState<CalEvent[]>(initialEvents);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);
  const calRef = useRef<FullCalendar>(null);

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setEditingEvent(null);
    setDefaultDate(arg.dateStr);
    setModalOpen(true);
  }, []);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    setEditingEvent(arg.event.extendedProps.calEvent as CalEvent);
    setDefaultDate(null);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback((saved: CalEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditingEvent(null);
    setDefaultDate(null);
  }, []);

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Person legend */}
          <div className="flex items-center gap-3">
            {(Object.entries(PERSON_COLORS) as [string, string][]).map(([person, color]) => (
              <span key={person} className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                {person.charAt(0).toUpperCase() + person.slice(1)}
              </span>
            ))}
          </div>
          <span className="text-gray-200">|</span>
          {/* Category legend */}
          <div className="flex flex-wrap items-center gap-3">
            {(Object.entries(CATEGORY_COLORS) as [string, string][]).map(([cat, color]) => (
              <span key={cat} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => { setEditingEvent(null); setDefaultDate(null); setModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      <div className="card p-4">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
          }}
          buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day', list: 'List' }}
          events={events.map(toFCEvent)}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          editable={false}
          selectable
          dayMaxEvents={4}
          height="auto"
          eventDisplay="block"
          nowIndicator
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          allDaySlot
        />
      </div>

      {modalOpen && (
        <EventModal
          event={editingEvent}
          defaultDate={defaultDate}
          onClose={handleClose}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
