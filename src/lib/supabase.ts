// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
)

export type ZendoState = Record<string, unknown>

export async function getState(): Promise<ZendoState> {
  const { data, error } = await supabase
    .from('zendo_state')
    .select('state_json')
    .eq('id', 'global')
    .single()
  if (error) throw error
  return data?.state_json ? JSON.parse(data.state_json) : {}
}

export async function setState(state: ZendoState): Promise<void> {
  const state_json = JSON.stringify(state)
  await supabase
    .from('zendo_state')
    .update({ state_json, updated_at: new Date().toISOString() })
    .eq('id', 'global')
}