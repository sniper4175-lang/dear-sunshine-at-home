-- =========================================================
-- Step 4-2: TossPayments 월 12,900원 자동결제
-- Step 4-1 + Step 2 DB가 적용된 상태를 전제로 합니다.
-- =========================================================

-- 1) 자동결제 처리/재시도 상태 컬럼
alter table public.ds_content_memberships
    add column if not exists billing_processing_at timestamptz,
    add column if not exists billing_retry_count integer not null default 0,
    add column if not exists billing_retry_at timestamptz,
    add column if not exists last_billing_error text,
    add column if not exists last_billing_attempt_at timestamptz;

-- 잘못된 음수 retry 방지
alter table public.ds_content_memberships
    drop constraint if exists ds_content_memberships_billing_retry_count_check;

alter table public.ds_content_memberships
    add constraint ds_content_memberships_billing_retry_count_check
    check (billing_retry_count >= 0);

-- 2) 결제 예정 대상 조회 인덱스
create index if not exists ds_content_memberships_due_billing_idx
on public.ds_content_memberships(status, next_billing_at)
where next_billing_at is not null;

-- 3) 결제 주문 중복 방지 확인용 인덱스
-- Step 2에서 unique(provider, order_id)가 이미 존재하지만,
-- 기존 DB에 없을 가능성에 대비해 별도 unique index도 보장합니다.
create unique index if not exists ds_payment_transactions_provider_order_unique
on public.ds_payment_transactions(provider, order_id);

-- 4) 결제 대상 원자적 claim 함수
-- 같은 시각에 cron이 겹쳐도 한 작업만 membership을 잡도록 함.
-- 10분 이상 처리중인 건은 장애 복구를 위해 다시 잡을 수 있음.
create or replace function public.ds_claim_due_memberships(
    p_limit integer default 20
)
returns setof public.ds_content_memberships
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    with candidates as (
        select m.id
        from public.ds_content_memberships m
        where m.status in ('trialing', 'active', 'past_due')
          and m.next_billing_at is not null
          and m.next_billing_at <= now()
          and coalesce(m.cancel_at_period_end, false) = false
          and (m.billing_retry_at is null or m.billing_retry_at <= now())
          and (
              m.billing_processing_at is null
              or m.billing_processing_at < now() - interval '10 minutes'
          )
        order by m.next_billing_at asc
        for update skip locked
        limit greatest(1, least(coalesce(p_limit, 20), 100))
    )
    update public.ds_content_memberships m
    set billing_processing_at = now(),
        last_billing_attempt_at = now(),
        updated_at = now()
    from candidates c
    where m.id = c.id
    returning m.*;
end;
$$;

revoke all on function public.ds_claim_due_memberships(integer)
from public, anon, authenticated;

grant execute on function public.ds_claim_due_memberships(integer)
to service_role;

-- 5) 확인
select
    column_name,
    data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ds_content_memberships'
  and column_name in (
      'billing_processing_at',
      'billing_retry_count',
      'billing_retry_at',
      'last_billing_error',
      'last_billing_attempt_at'
  )
order by column_name;
