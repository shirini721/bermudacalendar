'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { createClient } from '@/lib/supabase/client';
import type { Event, Profile } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import EventModal from './EventModal';
import MemberBadge from './MemberBadge';
import { Plus, Users, Copy, Check } from 'lucide-react';
import clsx from 'clsx';

interface CalendarProps {
  initialEvents: Event[];
  currentUser: Profile;
  familyMembers: Profile[];
  familyGroupId: string;
  inviteCode: string;
}

function eventToFCInput(event: Event, members: Profile[]): EventInput {
  // Determine color: assigned member color or category color
  let color = CATEGORY_COLORS[event.category] ?? '#6b7280';

  if (event.assigned_to && event.assigned_to.length === 1) {
    const member = members.find(m => m.id === event.assigned_to[0]);
    if (member) color = member.color;
  }

  return {
    id: event.id,
    title: event.title,
    start: event.start_at,
    end: event.end_at,
    allDay: event.all_day,
    backgroundColor: color,
    borderColor: color,
    extendedProps: { ...event },
  };
}

export default function Calendar({
  initialEvents,
  currentUser,
  familyMembers,
  familyGroupId,
  inviteCode,
}: CalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const supabase = createClient();

  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Convert events to FullCalendar format, applying member filter
  const fcEvents = events
    .filter(ev => {
      if (!filterMemberId) return true;
      return ev.assigned_to?.includes(filterMemberId);
    })
    .map(ev => eventToFCInput(ev, familyMembers));

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`family-events-${familyGroupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `family_group_id=eq.${familyGroupId}`,
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            setEvents(prev => {
              const exists = prev.some(e => e.id === (payload.new as Event).id);
              return exists ? prev : [...prev, payload.new as Event];
            });
          } else if (payload.eventType === 'UPDATE') {
            setEvents(prev =>
              prev.map(e => (e.id === (payload.new as Event).id ? (payload.new as Event) : e))
            );
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(e => e.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyGroupId, supabase]);

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setSelectedEvent(null);
    setDefaultStart(selectInfo.start);
    setModalOpen(true);
    selectInfo.view.calendar.unselect();
  }, []);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event.extendedProps as Event;
    setSelectedEvent(event);
    setDefaultStart(null);
    setModalOpen(true);
  }, []);

  function handleEventSaved(savedEvent: Event) {
    setEvents(prev => {
      const exists = prev.some(e => e.id === savedEvent.id);
      return exists
        ? prev.map(e => (e.id === savedEvent.id ? savedEvent : e))
        : [...prev, savedEvent];
    });
    setModalOpen(false);
  }

  function handleEventDeleted(eventId: string) {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setModalOpen(false);
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-3">
          {/* Member filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterMemberId(null)}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                !filterMemberId
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              All
            </button>
            {familyMembers.map(member => (
              <button
                key={member.id}
                onClick={() => setFilterMemberId(
                  filterMemberId === member.id ? null : member.id
                )}
                className={clsx(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                  filterMemberId === member.id
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                )}
                style={
                  filterMemberId === member.id
                    ? { backgroundColor: member.color, borderColor: member.color }
                    : {}
                }
              >
                <MemberBadge
                  name={member.name || member.email}
                  color={member.color}
                  size="xs"
                  avatarUrl={member.avatar_url ?? undefined}
                />
                {member.name || member.email.split('@')[0]}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Invite code */}
          {inviteCode && (
            <button
              onClick={copyInviteCode}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-mono text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {inviteCode}
                </>
              )}
            </button>
          )}

          {/* Add Event Button */}
          <button
            onClick={() => {
              setSelectedEvent(null);
              setDefaultStart(new Date());
              setModalOpen(true);
            }}
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
                buttonText={{
                  today: 'Today',
                  month: 'Month',
                  week: 'Week',
                  day: 'Day',
                  list: 'List',
                }}
                events={fcEvents}
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
                eventTimeFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {modalOpen && (
        <EventModal
          event={selectedEvent}
          defaultStart={defaultStart ?? undefined}
          familyMembers={familyMembers}
          currentUserId={currentUser.id}
          familyGroupId={familyGroupId}
          onClose={() => setModalOpen(false)}
          onSaved={handleEventSaved}
          onDeleted={handleEventDeleted}
        />
      )}
    </div>
  );
}
