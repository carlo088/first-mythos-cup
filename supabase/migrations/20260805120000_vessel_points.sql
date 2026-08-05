create table if not exists public.vessel_scores (
  mmsi text primary key references public.vessels(mmsi) on delete cascade,
  total_points integer not null default 0 check (total_points >= 0),
  updated_at timestamptz not null default now()
);

alter table public.vessel_scores enable row level security;

drop policy if exists "Public leaderboard read" on public.vessel_scores;
create policy "Public leaderboard read" on public.vessel_scores for select using (true);

insert into public.vessel_scores (mmsi, total_points)
select mmsi, 0
from public.vessels
on conflict (mmsi) do nothing;
