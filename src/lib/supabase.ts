// src/lib/supabase.ts
// Optional cloud sync backed by Supabase. Every API is auth-scoped:
//   * zendo_state  — one row per user (id = auth.uid()); RLS enforces that a
//     user can only read/write their own row, so journal/goals/sessions are
//     never shared or world-readable.
//   * zendo_purchases — premium unlock is global by design; rows are readable
//     by any signed-in user (never anonymous). Mayar's webhook has no buyer
//     identity, so per-user ownership would require checkout-session plumbing.
//
// When Supabase env vars are unset (or the user is signed out) the client
// degrades to local-only mode and every call returns a no-op/empty result.

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

/** True when Supabase env vars are set, so cloud sync is possible. */
export function isSyncConfigured(): boolean {
  return getSupabase() !== null
}

/** True when sync can run right now: configured AND a session is active. */
export async function isSyncActive(): Promise<boolean> {
  const client = getSupabase()
  if (!client) return false
  const { data } = await client.auth.getSession()
  return Boolean(data.session?.user?.id)
}

/**
 * Row id for the current user's state row: the user's Supabase auth uid.
 * Returns null when not signed in (so we never write to a shared/global row).
 */
async function myRowId(): Promise<string | null> {
  const client = getSupabase()
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data.session?.user?.id ?? null
}

export type ZendoState = Record<string, unknown>

export async function getState(): Promise<ZendoState> {
  const client = getSupabase()
  if (!client) return {}
  const uid = await myRowId()
  if (!uid) return {}
  const { data, error } = await client
    .from('zendo_state')
    .select('state_json')
    .eq('id', uid)
    .single()
  if (error) throw error
  return data?.state_json ? JSON.parse(data.state_json) : {}
}

export async function setState(state: ZendoState): Promise<void> {
  const client = getSupabase()
  if (!client) return
  const uid = await myRowId()
  if (!uid) return
  const state_json = JSON.stringify(state)
  await client
    .from('zendo_state')
    .upsert({ id: uid, state_json, updated_at: new Date().toISOString() })
}

/**
 * Pack ids confirmed paid via the Mayar webhook. Readable by any signed-in
 * user (premium unlock is global by design); anonymous users get an empty set.
 */
export async function getPurchases(): Promise<string[]> {
  const client = getSupabase()
  if (!client) return []
  const uid = await myRowId()
  if (!uid) return []
  const { data, error } = await client
    .from('zendo_purchases')
    .select('pack_id')
  if (error) return []
  return (data ?? []).map((row) => row.pack_id).filter(Boolean)
}
