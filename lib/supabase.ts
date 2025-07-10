import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * During `next build` Vercel may not have the env vars yet.
 * We fall back to a dummy client so the bundle is created, but we
 * log a warning so you know the real keys are still required.
 */
function buildTimeClient(): SupabaseClient {
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are missing at build-time. " +
      "Using a dummy client.  " +
      "Add the env vars in your Vercel project settings.",
  )
  // The URL/key just need to be syntactically valid – they won’t be used.
  return createClient("https://placeholder.supabase.co", "public-anon-key")
}

export const supabase: SupabaseClient = url && anon ? createClient(url, anon) : buildTimeClient()
