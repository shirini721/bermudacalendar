import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyFamilyOfEvent } from '@/lib/notify';

export async function GET() {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('family_group_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.family_group_id) {
      return NextResponse.json({ error: 'No family group found' }, { status: 404 });
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('family_group_id', profile.family_group_id)
      .order('start_at', { ascending: true });

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    return NextResponse.json({ events: events ?? [] });
  } catch (err) {
    console.error('GET /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.family_group_id) {
      return NextResponse.json({ error: 'No family group found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      start_at,
      end_at,
      all_day,
      location,
      category,
      color,
      recurrence_rule,
      rsvp_enabled,
      assigned_to,
    } = body;

    if (!title || !start_at || !end_at) {
      return NextResponse.json(
        { error: 'title, start_at, and end_at are required' },
        { status: 400 }
      );
    }

    const { data: event, error: insertError } = await supabase
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
        created_by: user.id,
        family_group_id: profile.family_group_id,
        recurrence_rule: recurrence_rule ?? null,
        rsvp_enabled: rsvp_enabled ?? false,
        assigned_to: assigned_to ?? [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send email notifications in the background
    try {
      const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_group_id', profile.family_group_id);

      if (members && members.length > 0) {
        await notifyFamilyOfEvent(event, members, 'created');
      }
    } catch (notifyErr) {
      console.error('Failed to send notifications:', notifyErr);
      // Non-fatal — event was still created
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
