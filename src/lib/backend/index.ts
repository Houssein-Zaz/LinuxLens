import { createClient } from '@supabase/supabase-js';
import type { Backend } from '../../types/backend';
import { createDemoBackend } from './demo';
import { createSupabaseBackend } from './supabase';

/**
 * Supabase si les variables d'environnement sont définies (.env.local ou réglages Vercel),
 * sinon le mode démo, qui garde tout dans le navigateur.
 */
export function createBackend(env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string } = import.meta.env): Backend {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (url && key) return createSupabaseBackend(createClient(url, key));
  return createDemoBackend();
}
