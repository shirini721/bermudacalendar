import { NextRequest, NextResponse } from 'next/server';
import { getEvents, saveEvents } from '@/lib/db';
import type { CalEvent } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  const events = getEvents();
  const idx = events.findIndex(e => e.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const updated: CalEvent = {
    ...events[idx],
    title: String(body.title || '').trim() || events[idx].title,
    description: body.description !== undefined
      ? (String(body.description).trim() || null)
      : events[idx].description,
    start: body.start !== undefined ? String(body.start) : events[idx].start,
    end: body.end !== undefined ? String(body.end) : events[idx].end,
    allDay: body.allDay !== undefined ? Boolean(body.allDay) : events[idx].allDay,
    location: body.location !== undefined
      ? (String(body.location).trim() || null)
      : events[idx].location,
    category: body.category || events[idx].category,
    color: body.color !== undefined ? body.color : events[idx].color,
  };

  events[idx] = updated;
  saveEvents(events);

  return NextResponse.json({ event: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const events = getEvents();
  const filtered = events.filter(e => e.id !== id);

  if (filtered.length === events.length) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  saveEvents(filtered);
  return NextResponse.json({ ok: true });
}
