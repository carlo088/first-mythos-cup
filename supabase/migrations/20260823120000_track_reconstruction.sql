create table if not exists public.track_reconstructions (
  id uuid primary key default gen_random_uuid(),
  mmsi text not null references public.vessels(mmsi) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  control_points jsonb not null,
  note text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.vessel_positions
  add column if not exists reconstruction_id uuid references public.track_reconstructions(id) on delete cascade;

create index if not exists vessel_positions_reconstruction_idx
  on public.vessel_positions (reconstruction_id, received_at);

alter table public.track_reconstructions enable row level security;
drop policy if exists "Public reconstruction read" on public.track_reconstructions;
create policy "Public reconstruction read" on public.track_reconstructions for select using (true);
