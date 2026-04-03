import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/calendar';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has a family group
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('family_group_id')
          .eq('id', user.id)
          .single();

        if (!profile?.family_group_id) {
          // Redirect to login page for family setup
          return NextResponse.redirect(new URL('/auth/login?setup=family', requestUrl.origin));
        }
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(new URL('/auth/login?error=auth_failed', requestUrl.origin));
}
