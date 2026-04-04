import { createServiceClient } from '@/lib/supabase/service';
import Calendar from '@/components/Calendar';
import type { Event, Profile } from '@/types';

export const dynamic = 'force-dynamic';

const FAMILY_GROUP_ID = process.env.FAMILY_GROUP_ID ?? '';

export default async function CalendarPage() {
  const supabase = createServiceClient();

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('family_group_id', FAMILY_GROUP_ID)
    .order('start_at', { ascending: true });

  const currentUser: Profile = {
    id: 'family',
    name: 'Family',
    email: '',
    color: '#0284c7',
    avatar_url: null,
    family_group_id: FAMILY_GROUP_ID,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Calendar
        initialEvents={(events as Event[]) ?? []}
        currentUser={currentUser}
        familyMembers={[]}
        familyGroupId={FAMILY_GROUP_ID}
        inviteCode=""
      />
    </div>
  );
}
