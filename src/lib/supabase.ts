// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (!_supabase) {
    const url = import.meta.env.VITE_SUPABASE_URL || ""
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ""
    if (url && key) {
      _supabase = createClient(url, key)
    }
  }
  return _supabase
}

export function supabase(): SupabaseClient | null {
  return getSupabase()
}

export type ZendoState = Record<string, unknown>

export async function getState(): Promise<ZendoState> {
  const client = getSupabase()
  if (!client) return {}
  const { data, error } = await client
    .from('zendo_state')
    .select('state_json')
    .eq('id', 'global')
    .single()
  if (error) throw error
  return data?.state_json ? JSON.parse(data.state_json) : {}
}

export async function setState(state: ZendoState): Promise<void> {
  const client = getSupabase()
  if (!client) return
  const state_json = JSON.stringify(state)
  await client
    .from('zendo_state')
    .update({ state_json, updated_at: new Date().toISOString() })
    .eq('id', 'global')
}