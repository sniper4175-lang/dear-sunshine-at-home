-- Dear Sunshine Attendance
-- Song Club 회원 활성화 오류 보정
-- Supabase SQL Editor에서 한 번만 실행하세요.

begin;

-- 1) Song Club 회원당 Sunshine Toddler + Melody Book Club 2개 저장 허용
create table if not exists public.ds_user_program_access (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    program text not null,
    created_at timestamptz not null default now()
);

alter table public.ds_user_program_access
    add column if not exists program text,
    add column if not exists created_at timestamptz not null default now();

-- 예전 스키마에 user_id 하나만 UNIQUE인 제약이 있으면 제거
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'ds_user_program_access'
          AND c.contype = 'u'
          AND array_length(c.conkey, 1) = 1
          AND EXISTS (
              SELECT 1
              FROM pg_attribute a
              WHERE a.attrelid = t.oid
                AND a.attnum = c.conkey[1]
                AND a.attname = 'user_id'
          )
    LOOP
        EXECUTE format(
            'alter table public.ds_user_program_access drop constraint %I',
            r.conname
        );
    END LOOP;
END $$;

-- 중복 데이터 정리 후 회원+클래스 조합만 UNIQUE
DELETE FROM public.ds_user_program_access a
USING public.ds_user_program_access b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.program = b.program;

CREATE UNIQUE INDEX IF NOT EXISTS ds_user_program_access_user_program_unique
ON public.ds_user_program_access(user_id, program);

CREATE INDEX IF NOT EXISTS ds_user_program_access_user_idx
ON public.ds_user_program_access(user_id);

-- 2) Song Club / Home Package 센터 결제 수익 테이블 필수 컬럼 보정
create table if not exists public.ds_extra_revenue (
    id uuid primary key default gen_random_uuid(),
    revenue_date date not null default current_date,
    category text not null,
    user_id uuid references auth.users(id) on delete set null,
    description text,
    amount numeric(12,2) not null default 0,
    payment_method text not null default 'center',
    source_type text,
    source_id uuid,
    created_at timestamptz not null default now()
);

alter table public.ds_extra_revenue
    add column if not exists revenue_date date default current_date,
    add column if not exists category text,
    add column if not exists user_id uuid,
    add column if not exists description text,
    add column if not exists amount numeric(12,2) default 0,
    add column if not exists payment_method text default 'center',
    add column if not exists source_type text,
    add column if not exists source_id uuid,
    add column if not exists created_at timestamptz default now();

CREATE INDEX IF NOT EXISTS ds_extra_revenue_user_idx
ON public.ds_extra_revenue(user_id);

CREATE INDEX IF NOT EXISTS ds_extra_revenue_date_idx
ON public.ds_extra_revenue(revenue_date desc);

CREATE INDEX IF NOT EXISTS ds_extra_revenue_source_idx
ON public.ds_extra_revenue(source_type, source_id);

commit;
