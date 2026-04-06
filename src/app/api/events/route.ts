import { NextRequest, NextResponse } from 'next/server';
import { readEvents, writeEvents } from '@/lib/db';
import type { Event } from '@/types';

export async function GET() {
  return NextResponse.json({ events: readEvents() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, start_at, end_at, all_day, location, category, color } = body;

  if (!title || !start_at || !end_at) {
    return NextResponse.json({ error: 'title, start_at, and end_at are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const event: Event = {
    id: crypto.randomUUID(),
    title,
    description: description ?? null,
    start_at,
    end_at,
    all_day: all_day ?? false,
    location: location ?? null,
    category: category ?? 'other',
    color: color ?? null,
    created_at: now,
    updated_at: now,
  };

  const events = readEvents();
  events.push(event);
  writeEvents(events);

  return NextResponse.json({ event }, { status: 201 });
}
