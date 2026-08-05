create table if not exists public.race_legs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  start_latitude double precision not null check (start_latitude between -90 and 90),
  start_longitude double precision not null check (start_longitude between -180 and 180),
  end_latitude double precision not null check (end_latitude between -90 and 90),
  end_longitude double precision not null check (end_longitude between -180 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  corridor_meters integer not null default 1800 check (corridor_meters > 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'finished')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.vessel_positions
  add column if not exists leg_id uuid references public.race_legs(id) on delete set null;

create or replace function public.detect_position_leg(
  position_latitude double precision,
  position_longitude double precision,
  position_received_at timestamptz
) returns uuid
language sql
stable
set search_path = public
as $$
  select candidate.id
  from public.race_legs candidate
  cross join lateral (
    select
      111320.0 * cos(radians((candidate.start_latitude + candidate.end_latitude) / 2.0)) as lng_scale,
      111320.0 as lat_scale
  ) scale
  cross join lateral (
    select
      (candidate.end_longitude - candidate.start_longitude) * scale.lng_scale as dx,
      (candidate.end_latitude - candidate.start_latitude) * scale.lat_scale as dy,
      (position_longitude - candidate.start_longitude) * scale.lng_scale as px,
      (position_latitude - candidate.start_latitude) * scale.lat_scale as py
  ) vector
  cross join lateral (
    select greatest(0.0, least(1.0,
      (vector.px * vector.dx + vector.py * vector.dy) / nullif(vector.dx * vector.dx + vector.dy * vector.dy, 0)
    )) as progress
  ) projection
  where position_received_at between candidate.starts_at and candidate.ends_at
    and sqrt(
      power(vector.px - projection.progress * vector.dx, 2)
      + power(vector.py - projection.progress * vector.dy, 2)
    ) <= candidate.corridor_meters
  order by candidate.starts_at desc
  limit 1;
$$;

create or replace function public.assign_position_leg() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.leg_id is null then
    new.leg_id := public.detect_position_leg(new.latitude, new.longitude, new.received_at);
  end if;
  return new;
end;
$$;

drop trigger if exists assign_position_leg_trigger on public.vessel_positions;
create trigger assign_position_leg_trigger
before insert or update of latitude, longitude, received_at on public.vessel_positions
for each row execute function public.assign_position_leg();

create table if not exists public.leg_scores (
  leg_id uuid not null references public.race_legs(id) on delete cascade,
  mmsi text not null references public.vessels(mmsi) on delete cascade,
  points integer not null default 0 check (points between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (leg_id, mmsi)
);

create or replace function public.refresh_vessel_score() returns trigger
language plpgsql
set search_path = public
as $$
declare affected_mmsi text;
begin
  if tg_op = 'DELETE' then affected_mmsi := old.mmsi; else affected_mmsi := new.mmsi; end if;
  insert into public.vessel_scores (mmsi, total_points, updated_at)
  values (affected_mmsi, coalesce((select sum(points) from public.leg_scores where mmsi = affected_mmsi), 0), now())
  on conflict (mmsi) do update set total_points = excluded.total_points, updated_at = excluded.updated_at;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists refresh_vessel_score_trigger on public.leg_scores;
create trigger refresh_vessel_score_trigger
after insert or update or delete on public.leg_scores
for each row execute function public.refresh_vessel_score();

create index if not exists vessel_positions_leg_received_idx
  on public.vessel_positions (leg_id, received_at);

alter table public.race_legs enable row level security;
alter table public.leg_scores enable row level security;
drop policy if exists "Public leg read" on public.race_legs;
create policy "Public leg read" on public.race_legs for select using (true);
drop policy if exists "Public leg score read" on public.leg_scores;
create policy "Public leg score read" on public.leg_scores for select using (true);

drop policy if exists "Public position read" on public.vessel_positions;
create policy "Public position read" on public.vessel_positions for select using (true);
