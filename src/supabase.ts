import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client for Microsoft Entra sign-in.
 *
 * Vercel needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or
 * VITE_SUPABASE_ANON_KEY). Vercel sets VERCEL=1, so the Vite base becomes `/`
 * and assets load from /assets/. GitHub Pages does not set VERCEL, keeps
 * `/teachingapp/`, and still runs with these keys unset: there is no sign-in
 * button, and progress stays in localStorage.
 *
 * Add https://teachingapp-tn-ip.vercel.app/ to Supabase Auth → URL
 * configuration → Redirect URLs. It must match `redirectTo`, including the
 * trailing slash.
 */

function envValue(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY" | "VITE_SUPABASE_ANON_KEY"): string | undefined {
  const raw = import.meta.env?.[name];
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

const url = envValue("VITE_SUPABASE_URL");
const key = envValue("VITE_SUPABASE_PUBLISHABLE_KEY") ?? envValue("VITE_SUPABASE_ANON_KEY");

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/** Exact redirect allow-list entry for this page, including the Vite base path. */
export function appRedirectUrl(): string {
  const base = import.meta.env?.BASE_URL || "/";
  return new URL(base, window.location.origin).href;
}
