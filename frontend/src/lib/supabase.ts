import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Don't crash if Supabase is not configured
  if (!url || !key || !url.startsWith('http')) {
    return null;
  }

  try {
    return createBrowserClient(url, key);
  } catch {
    return null;
  }
}
