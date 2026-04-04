import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const FAMILY_GROUP_ID = process.env.FAMILY_GROUP_ID ?? '';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient();
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .eq('family_group_id', FAMILY_GROUP_ID)
      .single();

    if (error || !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    console.error('GET /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { title, description, start_at, end_at, all_day, location, category, color, recurrence_rule, rsvp_enabled, assigned_to } = body;

    const { data: event, error } = await supabase
      .from('events')
      .update({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(start_at !== undefined && { start_at }),
        ...(end_at !== undefined && { end_at }),
        ...(all_day !== undefined && { all_day }),
        ...(location !== undefined && { location }),
        ...(category !== undefined && { category }),
        ...(color !== undefined && { color }),
        ...(recurrence_rule !== undefined && { recurrence_rule }),
        ...(rsvp_enabled !== undefined && { rsvp_enabled }),
        ...(assigned_to !== undefined && { assigned_to }),
      })
      .eq('id', params.id)
      .eq('family_group_id', FAMILY_GROUP_ID)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    console.error('PUT /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', params.id)
      .eq('family_group_id', FAMILY_GROUP_ID);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
