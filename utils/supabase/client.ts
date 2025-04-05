/**
 * Utilitar pentru crearea clientului Supabase pe partea de client
 * Configurează și inițializează conexiunea cu baza de date pentru componente client-side
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
