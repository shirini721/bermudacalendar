import { NextRequest, NextResponse } from 'next/server';
import { readEvents, writeEvents } from '@/lib/db';

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const body = await request.json();
  const events = readEvents();
  const idx = events.findIndex(e => e.id === params.id);

  if (idx === -1) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  events[idx] = { ...events[idx], ...body, id: params.id, updated_at: new Date().toISOString() };
  writeEvents(events);

  return NextResponse.json({ event: events[idx] });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const events = readEvents();
  const filtered = events.filter(e => e.id !== params.id);

  if (filtered.length === events.length) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  writeEvents(filtered);
  return NextResponse.json({ success: true });
}
