import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const FAMILY_GROUP_ID = process.env.FAMILY_GROUP_ID ?? '';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('family_group_id', FAMILY_GROUP_ID)
      .order('start_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ events: events ?? [] });
  } catch (err) {
    console.error('GET /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { title, description, start_at, end_at, all_day, location, category, color, recurrence_rule, rsvp_enabled, assigned_to } = body;

    if (!title || !start_at || !end_at) {
      return NextResponse.json({ error: 'title, start_at, and end_at are required' }, { status: 400 });
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title,
        description: description ?? null,
        start_at,
        end_at,
        all_day: all_day ?? false,
        location: location ?? null,
        category: category ?? 'other',
        color: color ?? null,
        created_by: null,
        family_group_id: FAMILY_GROUP_ID,
        recurrence_rule: recurrence_rule ?? null,
        rsvp_enabled: rsvp_enabled ?? false,
        assigned_to: assigned_to ?? [],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
