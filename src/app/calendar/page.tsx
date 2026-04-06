import { readEvents } from '@/lib/db';
import Calendar from '@/components/Calendar';

export const dynamic = 'force-dynamic';

export default function CalendarPage() {
  const events = readEvents();
  return (
    <div className="min-h-screen bg-gray-50">
      <Calendar initialEvents={events} />
    </div>
  );
}
