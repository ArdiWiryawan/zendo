-- ── zendo_state: per-user sync rows ─────────────────────────────────────────
-- One row per authenticated user (id = auth.uid()). RLS restricts every row to
-- its owner, so a user's journal/goals/sessions are only ever readable or
-- writable by that user. The old single "global" row (shared across all users,
-- anon-writable) is removed for new installs; migrations clean up existing
-- instances below.
create table if not exists zendo_state (
  id text primary key,
  state_json jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table zendo_state enable row level security;

-- Owner-only access. id = auth.uid() means users can only touch their own row;
-- RLS `to authenticated` (not anon) additionally rejects unauthenticated calls.
create policy "Allow owner CRUD"
  on zendo_state
  for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Remove the old world-readable/writable anon policy from existing installs.
drop policy if exists "Allow anon read/write" on zendo_state;
drop policy if exists "Allow authenticated CRUD" on zendo_state;

-- Delete the legacy shared 'global' row so it can never again be written by
-- clients and read back into users' state.
delete from zendo_state where id = 'global';

-- ── Bayar GG payment purchases ───────────────────────────────────────────────
-- One row per paid pack (Bayar GG webhook, server-side). The client treats the
-- union of all confirmed packs as a GLOBAL premium unlock — matching the
-- current product model where one purchase unlocks premium everywhere. Rows
-- are readable only by SIGNED-IN users (never anonymous), so payment history
-- is not world-readable.
create table if not exists zendo_purchases (
  id text primary key,
  pack_id text not null,
  amount int not null,
  paid_at timestamptz default now()
);

alter table zendo_purchases enable row level security;

-- Signed-in users may read confirmed purchases (used for premium unlock).
-- Anonymous visitors are denied. NOTE: unlock is intentionally global — Bayar
-- GG's webhook does not carry a buyer identity, so per-user ownership would
-- require plumbing the checkout session through Bayar GG (future work).
create policy "Allow authenticated read purchases"
  on zendo_purchases
  for select
  to authenticated
  using (true);

-- Remove the old anon-read-everything policy from existing installs.
drop policy if exists "Allow anon read purchases" on zendo_purchases;
