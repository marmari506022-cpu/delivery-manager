import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// client بـ service role للـ API routes (server-side فقط)
export const supabase = createClient(supabaseUrl, serviceKey);

export function generateId(): string {
  return Math.random().toString(36).substring(2, 14) +
         Math.random().toString(36).substring(2, 6);
}

export function nowIso(): string {
  return new Date().toISOString();
}
