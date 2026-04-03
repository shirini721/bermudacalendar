import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import type { ParsedEventRow } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile?.family_group_id) {
      return NextResponse.json({ error: 'No family group found' }, { status: 404 });
    }

    const body = await request.json();
    const { events } = body as { events: ParsedEventRow[] };

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }

    if (events.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 events per import' }, { status: 400 });
    }

    // Map parsed events to DB format
    const eventsToInsert = events.map(ev => ({
      title: ev.title,
      description: ev.description ?? null,
      start_at: ev.start_at,
      end_at: ev.end_at,
      all_day: ev.all_day,
      location: ev.location ?? null,
      category: ev.category,
      color: null,
      created_by: user.id,
      family_group_id: profile.family_group_id,
      recurrence_rule: null,
      rsvp_enabled: false,
      assigned_to: ev.assigned_to ?? [],
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('events')
      .insert(eventsToInsert)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send summary notification email to family members
    try {
      const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_group_id', profile.family_group_id);

      if (members && members.length > 0) {
        const recipientEmails = members
          .filter(m => m.email && m.id !== user.id)
          .map(m => m.email);

        if (recipientEmails.length > 0 && process.env.RESEND_API_KEY) {
          const eventList = eventsToInsert
            .slice(0, 10)
            .map(e => `<li><strong>${e.title}</strong> — ${new Date(e.start_at).toLocaleDateString()}</li>`)
            .join('');

          const moreText = eventsToInsert.length > 10
            ? `<p>... and ${eventsToInsert.length - 10} more events</p>`
            : '';

          await resend.emails.send({
            from: 'Bermuda Calendar <notifications@bermudacalendar.app>',
            to: recipientEmails,
            subject: `${profile.name || 'A family member'} imported ${eventsToInsert.length} new events`,
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #0284c7;">📅 ${eventsToInsert.length} Events Imported</h2>
                <p>${profile.name || profile.email} has imported new events to your family calendar:</p>
                <ul style="line-height: 1.8;">${eventList}</ul>
                ${moreText}
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/calendar"
                   style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #0284c7; color: white; border-radius: 8px; text-decoration: none;">
                  View Calendar
                </a>
              </div>
            `,
          });
        }
      }
    } catch (notifyErr) {
      console.error('Failed to send import notification:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length ?? 0,
      events: inserted,
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/import error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
