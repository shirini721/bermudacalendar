import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { ParsedEventRow } from '@/types';

const FAMILY_GROUP_ID = process.env.FAMILY_GROUP_ID ?? '';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { events } = body as { events: ParsedEventRow[] };

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }

    if (events.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 events per import' }, { status: 400 });
    }

    const eventsToInsert = events.map(ev => ({
      title: ev.title,
      description: ev.description ?? null,
      start_at: ev.start_at,
      end_at: ev.end_at,
      all_day: ev.all_day,
      location: ev.location ?? null,
      category: ev.category,
      color: null,
      created_by: null,
      family_group_id: FAMILY_GROUP_ID,
      recurrence_rule: null,
      rsvp_enabled: false,
      assigned_to: ev.assigned_to ?? [],
    }));

    const { data: inserted, error } = await supabase
      .from('events')
      .insert(eventsToInsert)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: inserted?.length ?? 0, events: inserted }, { status: 201 });
  } catch (err) {
    console.error('POST /api/import error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
