create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  reader_name text not null check (char_length(trim(reader_name)) between 1 and 80),
  title text not null check (char_length(trim(title)) between 1 and 160),
  author text not null check (char_length(trim(author)) between 1 and 120),
  summary text not null check (
    char_length(trim(summary)) between 1 and 700
    and (char_length(summary) - char_length(replace(summary, E'\n', ''))) <= 3
  ),
  created_at timestamptz not null default now()
);

create index if not exists library_books_created_at_idx
  on public.library_books (created_at desc);

alter table public.library_books enable row level security;

drop policy if exists "Public library read" on public.library_books;
create policy "Public library read" on public.library_books for select using (true);

drop policy if exists "Public library insert" on public.library_books;
create policy "Public library insert" on public.library_books for insert with check (true);
