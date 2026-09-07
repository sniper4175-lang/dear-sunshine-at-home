-- =========================================================
-- Step 4-1: TossPayments 자동결제 테스트 연동 점검 SQL
-- 기존 Step 2 DB가 적용된 상태를 전제로 합니다.
-- =========================================================

-- 필요한 컬럼 보강 (이미 있으면 변화 없음)
alter table public.ds_content_memberships
    add column if not exists provider text,
    add column if not exists trial_starts_at timestamptz,
    add column if not exists trial_ends_at timestamptz,
    add column if not exists current_period_start timestamptz,
    add column if not exists current_period_end timestamptz,
    add column if not exists next_billing_at timestamptz,
    add column if not exists cancel_at_period_end boolean not null default false,
    add column if not exists cancelled_at timestamptz,
    add column if not exists last_payment_at timestamptz,
    add column if not exists updated_at timestamptz not null default now();

-- billing profile에 필요한 컬럼 보강
alter table public.ds_billing_profiles
    add column if not exists billing_key_encrypted text,
    add column if not exists payment_method text,
    add column if not exists payment_method_label text,
    add column if not exists is_active boolean not null default true,
    add column if not exists updated_at timestamptz not null default now();

-- 현재 구독 1개만 허용
drop index if exists public.ds_content_memberships_one_active;

create unique index if not exists ds_content_memberships_one_current
on public.ds_content_memberships(user_id)
where status in ('trialing', 'active', 'past_due', 'paused');

-- 결제 예정일 조회용
create index if not exists ds_content_memberships_next_billing_idx
on public.ds_content_memberships(next_billing_at)
where status in ('trialing', 'active', 'past_due');

-- 확인
select
    table_name,
    column_name,
    data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
      'ds_content_memberships',
      'ds_billing_profiles'
  )
  and column_name in (
      'provider',
      'trial_starts_at',
      'trial_ends_at',
      'current_period_start',
      'current_period_end',
      'next_billing_at',
      'cancel_at_period_end',
      'billing_key_encrypted',
      'payment_method',
      'payment_method_label'
  )
order by table_name, column_name;
