import { NextRequest, NextResponse } from 'next/server';
import { getEvents, saveEvents } from '@/lib/db';
import type { CalEvent } from '@/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const incoming: CalEvent[] = Array.isArray(body.events) ? body.events : [];

  if (incoming.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const existing = getEvents();
  const merged = [...existing, ...incoming];
  saveEvents(merged);

  return NextResponse.json({ count: incoming.length });
}
