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
import EventModal from './EventModal';

const CATEGORY_COLORS: Record<CalEvent['category'], string> = {
  school: '#6366f1',
  sports: '#10b981',
  medical: '#ef4444',
  vacation: '#f59e0b',
  birthday: '#ec4899',
  other: '#6b7280',
};

function toFCEvent(e: CalEvent): EventInput {
  return {
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    backgroundColor: e.color ?? CATEGORY_COLORS[e.category] ?? '#6b7280',
    borderColor: e.color ?? CATEGORY_COLORS[e.category] ?? '#6b7280',
    extendedProps: { calEvent: e },
  };
}

interface CalendarViewProps {
  initialEvents: CalEvent[];
}

export default function CalendarView({ initialEvents }: CalendarViewProps) {
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
    const ev: CalEvent = arg.event.extendedProps.calEvent;
    setEditingEvent(ev);
    setDefaultDate(null);
    setModalOpen(true);
  }, []);

  const handleAddClick = useCallback(() => {
    setEditingEvent(null);
    setDefaultDate(null);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback((saved: CalEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
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
      {/* Toolbar supplement */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Family Calendar</h1>
        <button onClick={handleAddClick} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(Object.entries(CATEGORY_COLORS) as [CalEvent['category'], string][]).map(([cat, color]) => (
          <span key={cat} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </span>
        ))}
      </div>

      {/* Calendar */}
      <div className="card p-4">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
          }}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            list: 'List',
          }}
          events={events.map(toFCEvent)}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          editable={false}
          selectable={true}
          dayMaxEvents={4}
          height="auto"
          eventDisplay="block"
        />
      </div>

      {/* Modal */}
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
