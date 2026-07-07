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
