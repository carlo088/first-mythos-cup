alter table public.race_legs
  add column if not exists checkpoint_2_latitude double precision,
  add column if not exists checkpoint_2_longitude double precision;

alter table public.race_legs
  add constraint race_legs_checkpoint_2_latitude_check
    check (checkpoint_2_latitude is null or checkpoint_2_latitude between -90 and 90),
  add constraint race_legs_checkpoint_2_longitude_check
    check (checkpoint_2_longitude is null or checkpoint_2_longitude between -180 and 180),
  add constraint race_legs_checkpoint_2_pair_check
    check ((checkpoint_2_latitude is null) = (checkpoint_2_longitude is null));