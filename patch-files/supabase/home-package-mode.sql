-- ============================================================
-- Dear Sunshine at Home - Home Package mode
-- 한 번만 Supabase SQL Editor에서 실행하세요.
-- 기존 Song Club 테이블은 수정하지 않고 새 테이블만 추가합니다.
-- ============================================================

create table if not exists public.ds_user_products (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    product_type text not null default 'home_package'
        check (product_type in ('home_package')),
    plan_code text not null
        check (plan_code in ('home_8', 'home_12', 'home_20')),
    program text not null
        check (program in ('Sunshine Toddler', 'Melody Book Club')),
    status text not null default 'active'
        check (status in ('active', 'paused', 'cancelled', 'expired')),
    starts_at date not null default current_date,
    ends_at date,
    release_weeks integer generated always as (
        case plan_code
            when 'home_8' then 8
            when 'home_12' then 12
            when 'home_20' then 20
        end
    ) stored,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists ds_user_products_one_active_home_package
    on public.ds_user_products(user_id, product_type)
    where status = 'active';

create index if not exists ds_user_products_user_idx
    on public.ds_user_products(user_id, status);


create table if not exists public.ds_home_package_tracks (
    id uuid primary key default gen_random_uuid(),
    program text not null
        check (program in ('Sunshine Toddler', 'Melody Book Club')),
    song_id uuid not null references public.ds_content_songs(id) on delete cascade,
    unlock_week integer not null
        check (unlock_week between 0 and 20),
    position integer not null default 1
        check (position >= 1),
    created_at timestamptz not null default now(),
    unique (program, song_id),
    unique (program, unlock_week, position)
);

create index if not exists ds_home_package_tracks_program_week_idx
    on public.ds_home_package_tracks(program, unlock_week, position);


create table if not exists public.ds_user_product_bonus_songs (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.ds_user_products(id) on delete cascade,
    song_id uuid not null references public.ds_content_songs(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (product_id, song_id)
);


-- RLS: 사용자 본인 상품은 읽을 수 있지만, 등록/수정은 서버(Service Role) 또는 SQL Editor에서만 합니다.
alter table public.ds_user_products enable row level security;
alter table public.ds_home_package_tracks enable row level security;
alter table public.ds_user_product_bonus_songs enable row level security;

drop policy if exists "users read own products" on public.ds_user_products;
create policy "users read own products"
    on public.ds_user_products
    for select
    using (auth.uid() = user_id);

drop policy if exists "authenticated read home package track map" on public.ds_home_package_tracks;
create policy "authenticated read home package track map"
    on public.ds_home_package_tracks
    for select
    to authenticated
    using (true);

drop policy if exists "users read own product bonus songs" on public.ds_user_product_bonus_songs;
create policy "users read own product bonus songs"
    on public.ds_user_product_bonus_songs
    for select
    using (
        exists (
            select 1
            from public.ds_user_products p
            where p.id = product_id
              and p.user_id = auth.uid()
        )
    );

-- ============================================================
-- 사용 규칙
-- unlock_week = 0 : 가입 즉시 공개되는 기본곡 (position 1, 2)
-- unlock_week = 1 : 시작일 + 7일에 공개
-- unlock_week = 2 : 시작일 + 14일에 공개
-- ...
-- home_8은 8주차까지, home_12는 12주차까지, home_20은 20주차까지 자동 사용
-- ============================================================
