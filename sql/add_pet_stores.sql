-- ── Pet stores table ──────────────────────────────────────────────
-- Run this in the Supabase SQL editor once.
-- Dashboard → SQL Editor → New query → paste & run

create table if not exists pet_stores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  city         text not null,
  address      text,
  phone        text,
  email        text,
  website      text,
  description  text,
  logo         text not null default '🏪',
  cover_color  text not null default 'linear-gradient(135deg,#1A4A9C,#2D7DD2)',
  specialties  text[] not null default '{}',
  hours        text,
  instagram    text,
  facebook     text,
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Row-level security
alter table pet_stores enable row level security;

-- Anyone can read store profiles (needed for public pages + shop discovery)
create policy "pet_stores_public_read"
  on pet_stores for select
  using (true);

-- Store owners can insert, update, and delete their own record
create policy "pet_stores_owner_all"
  on pet_stores for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One store per user (unique constraint)
create unique index if not exists pet_stores_user_id_unique on pet_stores (user_id);
