-- =========================================================
-- Step 4-3: Song Club 구독 해지
-- Step 4-1 / Step 4-2가 적용된 상태를 전제로 합니다.
-- =========================================================

-- 기존 컬럼 보장
alter table public.ds_content_memberships
    add column if not exists cancel_at_period_end boolean not null default false,
    add column if not exists cancelled_at timestamptz;

-- 해지 예정 멤버십 종료 처리 조회 보조 인덱스
create index if not exists ds_content_memberships_cancel_due_idx
on public.ds_content_memberships(cancel_at_period_end, status, current_period_end, trial_ends_at)
where cancel_at_period_end = true;

-- Step 4-2 claim 함수가 해지 예정 멤버십을 절대 결제 대상으로 잡지 않도록 재보장
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

select
    column_name,
    data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ds_content_memberships'
  and column_name in (
      'cancel_at_period_end',
      'cancelled_at'
  )
order by column_name;
