import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyFamilyOfEvent } from '@/lib/notify';
import type { Event, Profile } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event, action } = body as {
      event: Event;
      action: 'created' | 'updated' | 'deleted';
    };

    if (!event || !action) {
      return NextResponse.json({ error: 'event and action are required' }, { status: 400 });
    }

    if (!['created', 'updated', 'deleted'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_group_id')
      .eq('id', user.id)
      .single();

    if (!profile?.family_group_id) {
      return NextResponse.json({ error: 'No family group found' }, { status: 404 });
    }

    const { data: members } = await supabase
      .from('profiles')
      .select('*')
      .eq('family_group_id', profile.family_group_id);

    if (!members || members.length === 0) {
      return NextResponse.json({ message: 'No members to notify' });
    }

    await notifyFamilyOfEvent(event, members as Profile[], action);

    return NextResponse.json({ success: true, notified: members.length });
  } catch (err) {
    console.error('POST /api/notify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
