create table if not exists public.ds_content_songs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  category text,
  emoji text,
  audio_path text,
  printable_path text,
  lyrics jsonb not null default '[]'::jsonb,
  activities jsonb not null default '[]'::jsonb,
  is_popular boolean not null default false,
  premium_only boolean not null default false,
  release_date date not null default current_date,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ds_content_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('basic','premium')),
  status text not null default 'active' check (status in ('active','paused','cancelled','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists ds_content_memberships_one_active on public.ds_content_memberships(user_id) where status='active';
alter table public.ds_content_songs enable row level security;
alter table public.ds_content_memberships enable row level security;
drop policy if exists "published songs are readable" on public.ds_content_songs;
create policy "published songs are readable" on public.ds_content_songs for select using (is_published=true);
drop policy if exists "users read own membership" on public.ds_content_memberships;
create policy "users read own membership" on public.ds_content_memberships for select using (auth.uid()=user_id);
