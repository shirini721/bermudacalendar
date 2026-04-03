import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyFamilyOfEvent } from '@/lib/notify';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (err) {
    console.error('GET /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_group_id')
      .eq('id', user.id)
      .single();

    if (!profile?.family_group_id) {
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

    const { data: event, error: updateError } = await supabase
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
      .eq('family_group_id', profile.family_group_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found or unauthorized' }, { status: 404 });
    }

    // Send update notification
    try {
      const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_group_id', profile.family_group_id);

      if (members && members.length > 0) {
        await notifyFamilyOfEvent(event, members, 'updated');
      }
    } catch (notifyErr) {
      console.error('Failed to send update notifications:', notifyErr);
    }

    return NextResponse.json({ event });
  } catch (err) {
    console.error('PUT /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_group_id')
      .eq('id', user.id)
      .single();

    if (!profile?.family_group_id) {
      return NextResponse.json({ error: 'No family group found' }, { status: 404 });
    }

    // Get event before deletion for notification
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single();

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', params.id)
      .eq('family_group_id', profile.family_group_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Send deletion notification
    if (event) {
      try {
        const { data: members } = await supabase
          .from('profiles')
          .select('*')
          .eq('family_group_id', profile.family_group_id);

        if (members && members.length > 0) {
          await notifyFamilyOfEvent(event, members, 'deleted');
        }
      } catch (notifyErr) {
        console.error('Failed to send deletion notifications:', notifyErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
