import { createClient } from '@supabase/supabase-js';

// Uses service role key — bypasses RLS. Only use server-side.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}
