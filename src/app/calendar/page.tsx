import { getEvents } from '@/lib/db';
import CalendarView from '@/components/CalendarView';

export default function CalendarPage() {
  const events = getEvents();
  return <CalendarView initialEvents={events} />;
}
