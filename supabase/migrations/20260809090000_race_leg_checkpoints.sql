alter table public.race_legs
  add column if not exists checkpoint_latitude double precision,
  add column if not exists checkpoint_longitude double precision;

alter table public.race_legs
  add constraint race_legs_checkpoint_latitude_check
    check (checkpoint_latitude is null or checkpoint_latitude between -90 and 90),
  add constraint race_legs_checkpoint_longitude_check
    check (checkpoint_longitude is null or checkpoint_longitude between -180 and 180),
  add constraint race_legs_checkpoint_pair_check
    check ((checkpoint_latitude is null) = (checkpoint_longitude is null));