import { NextRequest, NextResponse } from 'next/server';
import { getEvents, saveEvents } from '@/lib/db';
import type { CalEvent } from '@/types';

export async function GET() {
  const events = getEvents();
  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const events = getEvents();

  const newEvent: CalEvent = {
    id: crypto.randomUUID(),
    title: String(body.title || '').trim(),
    description: body.description ? String(body.description).trim() || null : null,
    start: String(body.start),
    end: String(body.end),
    allDay: Boolean(body.allDay),
    location: body.location ? String(body.location).trim() || null : null,
    category: body.category || 'other',
    color: body.color || null,
    createdAt: new Date().toISOString(),
  };

  events.push(newEvent);
  saveEvents(events);

  return NextResponse.json({ event: newEvent }, { status: 201 });
}
