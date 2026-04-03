import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Calendar from '@/components/Calendar';
import type { Event, Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.family_group_id) {
    redirect('/auth/login?setup=family');
  }

  // Fetch all events for this family group
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('family_group_id', profile.family_group_id)
    .order('start_at', { ascending: true });

  // Fetch all family members
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_group_id', profile.family_group_id);

  // Fetch family group info
  const { data: familyGroup } = await supabase
    .from('family_groups')
    .select('*')
    .eq('id', profile.family_group_id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <Calendar
        initialEvents={(events as Event[]) ?? []}
        currentUser={profile as Profile}
        familyMembers={(members as Profile[]) ?? []}
        familyGroupId={profile.family_group_id}
        inviteCode={familyGroup?.invite_code ?? ''}
      />
    </div>
  );
}
