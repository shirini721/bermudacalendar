import { NextRequest, NextResponse } from 'next/server';
import { readEvents, writeEvents } from '@/lib/db';
import type { Event, ParsedEventRow } from '@/types';

export async function POST(request: NextRequest) {
  const { events: parsed } = await request.json() as { events: ParsedEventRow[] };

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return NextResponse.json({ error: 'No events provided' }, { status: 400 });
  }

  if (parsed.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 events per import' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newEvents: Event[] = parsed.map(ev => ({
    id: crypto.randomUUID(),
    title: ev.title,
    description: ev.description ?? null,
    start_at: ev.start_at,
    end_at: ev.end_at,
    all_day: ev.all_day,
    location: ev.location ?? null,
    category: ev.category,
    color: null,
    created_at: now,
    updated_at: now,
  }));

  const existing = readEvents();
  writeEvents([...existing, ...newEvents]);

  return NextResponse.json({ success: true, count: newEvents.length }, { status: 201 });
}
