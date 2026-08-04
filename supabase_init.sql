create table if not exists zendo_state (
  id text primary key,
  state_json jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table zendo_state enable row level security;

create policy "Allow authenticated CRUD"
  on zendo_state
  for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Allow anon read/write"
  on zendo_state
  for all
  to anon
  using (true)
  with check (true);

insert into zendo_state (id, state_json)
values ('global', '{}'::jsonb)
on conflict (id) do nothing;

-- Mayar payment purchases. Webhook records a row per paid pack; the client
-- reads these to unlock premium packs across devices.
create table if not exists zendo_purchases (
  id text primary key,
  pack_id text not null,
  amount int not null,
  paid_at timestamptz default now()
);

alter table zendo_purchases enable row level security;

create policy "Allow anon read purchases"
  on zendo_purchases
  for select
  to anon
  using (true);
