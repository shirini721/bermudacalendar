import { Resend } from 'resend';
import { format } from 'date-fns';
import type { Event, Profile } from '@/types';
import { CATEGORY_LABELS } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = 'Bermuda Calendar <notifications@bermudacalendar.app>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function formatEventDate(event: Event): string {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  if (event.all_day) {
    if (event.start_at.substring(0, 10) === event.end_at.substring(0, 10)) {
      return format(start, 'EEEE, MMMM d, yyyy') + ' (All Day)';
    }
    return (
      format(start, 'MMM d') +
      ' – ' +
      format(end, 'MMM d, yyyy') +
      ' (All Day)'
    );
  }

  if (event.start_at.substring(0, 10) === event.end_at.substring(0, 10)) {
    return (
      format(start, 'EEEE, MMMM d, yyyy') +
      ' · ' +
      format(start, 'h:mm a') +
      ' – ' +
      format(end, 'h:mm a')
    );
  }

  return (
    format(start, 'MMM d, yyyy h:mm a') +
    ' – ' +
    format(end, 'MMM d, yyyy h:mm a')
  );
}

function getActionLabel(action: 'created' | 'updated' | 'deleted'): string {
  switch (action) {
    case 'created':
      return 'New Event Added';
    case 'updated':
      return 'Event Updated';
    case 'deleted':
      return 'Event Cancelled';
  }
}

function getActionColor(action: 'created' | 'updated' | 'deleted'): string {
  switch (action) {
    case 'created':
      return '#0284c7';
    case 'updated':
      return '#d97706';
    case 'deleted':
      return '#dc2626';
  }
}

function getActionEmoji(action: 'created' | 'updated' | 'deleted'): string {
  switch (action) {
    case 'created':
      return '📅';
    case 'updated':
      return '✏️';
    case 'deleted':
      return '❌';
  }
}

function buildEmailHtml(
  event: Event,
  action: 'created' | 'updated' | 'deleted'
): string {
  const label = getActionLabel(action);
  const color = getActionColor(action);
  const emoji = getActionEmoji(action);
  const dateStr = formatEventDate(event);
  const category = CATEGORY_LABELS[event.category] ?? 'Other';

  const detailsSection =
    action === 'deleted'
      ? `<p style="color:#6b7280;font-size:14px;">This event has been removed from your family calendar.</p>`
      : `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${
        event.location
          ? `<tr>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;width:100px;">📍 Location</td>
        <td style="padding:6px 0;font-size:14px;color:#111827;">${event.location}</td>
      </tr>`
          : ''
      }
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;">🏷️ Category</td>
        <td style="padding:6px 0;font-size:14px;color:#111827;">${category}</td>
      </tr>
      ${
        event.description
          ? `<tr>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top;">📝 Notes</td>
        <td style="padding:6px 0;font-size:14px;color:#111827;">${event.description}</td>
      </tr>`
          : ''
      }
      ${
        event.rsvp_enabled
          ? `<tr>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;">RSVP</td>
        <td style="padding:6px 0;font-size:14px;color:#111827;">RSVP is enabled for this event</td>
      </tr>`
          : ''
      }
    </table>
    <a href="${APP_URL}/calendar"
       style="display:inline-block;margin-top:8px;padding:10px 20px;background:${color};color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      View Calendar →
    </a>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:${color};border-radius:12px 12px 0 0;padding:24px;text-align:center;">
      <span style="font-size:32px;">${emoji}</span>
      <h1 style="margin:8px 0 0;color:white;font-size:20px;font-weight:700;">${label}</h1>
    </div>

    <!-- Body -->
    <div style="background:white;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none;">

      <!-- Event Title -->
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">${event.title}</h2>

      <!-- Date -->
      <p style="margin:0 0 16px;color:#0284c7;font-size:15px;font-weight:500;">🗓️ ${dateStr}</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">

      ${detailsSection}

    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      Sent by <a href="${APP_URL}" style="color:#0284c7;">Bermuda Family Calendar</a>
      · <a href="${APP_URL}/calendar" style="color:#9ca3af;">Manage notifications</a>
    </p>

  </div>
</body>
</html>
  `.trim();
}

export async function notifyFamilyOfEvent(
  event: Event,
  members: Profile[],
  action: 'created' | 'updated' | 'deleted'
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[notify] RESEND_API_KEY not set — skipping email notification');
    return;
  }

  const recipients = members.filter(m => m.email).map(m => m.email);

  if (recipients.length === 0) {
    console.log('[notify] No recipients found');
    return;
  }

  const label = getActionLabel(action);
  const subject = `${label}: ${event.title}`;
  const html = buildEmailHtml(event, action);

  try {
    // Send individually to avoid exposing emails to each other
    await Promise.allSettled(
      recipients.map(email =>
        resend.emails.send({
          from: FROM_ADDRESS,
          to: email,
          subject,
          html,
        })
      )
    );
  } catch (err) {
    console.error('[notify] Failed to send emails:', err);
    throw err;
  }
}
