Dear Sunshine Step 4-2
TossPayments 7일 무료체험 종료 후 월 12,900원 자동결제

============================================================
1. 무엇이 추가됐나요?
============================================================

- /api/cron/billing-renew
  서버 전용 자동결제 실행 엔드포인트

- lib/recurring-billing.js
  결제 예정 멤버십 조회 / 중복 방지 / 결제 승인 / 성공·실패 처리

- lib/toss-billing.js
  자동결제 승인 POST /v1/billing/{billingKey}
  orderId 결제 조회 GET /v1/payments/orders/{orderId}

- supabase/step4_2_recurring_billing.sql
  자동결제 claim / retry 상태 컬럼 및 RPC 추가

- ENV_STEP4_2.txt
  CRON_SECRET, SONG_CLUB_MONTHLY_PRICE 안내

- vercel.step4_2.example.json
  Vercel Cron 예시. 자동 적용 파일은 아님.

============================================================
2. 결제 흐름
============================================================

trialing/active/past_due
+ next_billing_at <= now()
+ cancel_at_period_end = false
        ↓
DB에서 원자적으로 claim
        ↓
동일 청구주기에서 항상 같은 orderId 생성
        ↓
orderId로 이미 결제됐는지 먼저 조회
        ↓
미결제면 암호화된 billingKey 복호화
        ↓
토스 자동결제 승인 12,900원
        ↓
성공:
- ds_payment_transactions.status = paid
- membership.status = active
- current_period_start = 기존 next_billing_at
- current_period_end = 한 달 뒤
- next_billing_at = 한 달 뒤
- last_payment_at 저장
- retry_count = 0

실패:
- ds_payment_transactions.status = failed
- membership.status = past_due
- billing_retry_at을 하루 뒤로 잡아 재시도
- 같은 청구주기에서는 next_billing_at을 바꾸지 않아 같은 orderId를 유지
- 최대 3회 시도 후 자동 재시도 중단

============================================================
3. 중복결제 방지
============================================================

- DB claim: FOR UPDATE SKIP LOCKED
- billing_processing_at으로 10분 처리 lock
- provider + order_id unique
- membership id + 청구예정시각으로 deterministic orderId 생성
- 결제 요청 전/오류 후 orderId 조회로 이미 승인된 결제 복구

따라서 cron 중복 호출이나 API 응답 유실 상황에서
같은 청구주기의 이중결제 위험을 낮추도록 구성했습니다.

============================================================
4. 적용 순서
============================================================

A. ZIP 파일 내용을 프로젝트 루트에 덮어쓰기

B. Supabase SQL Editor에서 실행

supabase/step4_2_recurring_billing.sql

C. .env.local에 추가

SONG_CLUB_MONTHLY_PRICE=12900
CRON_SECRET=강한_랜덤값

D. 빌드

npm run build

============================================================
5. 로컬 테스트
============================================================

중요: 테스트 키를 쓰면 실제 돈은 청구되지 않습니다.

1) 테스트 계정의 next_billing_at을 현재 시각 이전으로 변경

예시:

update public.ds_content_memberships
set next_billing_at = now() - interval '1 minute',
    billing_processing_at = null,
    billing_retry_count = 0,
    billing_retry_at = null,
    last_billing_error = null
where user_id = (
    select id
    from auth.users
    where email = '테스트계정@example.com'
);

2) 로컬 서버 실행

npm run dev

3) 새 PowerShell 창에서 CRON_SECRET을 Authorization 헤더로 호출

$secret = "내_CRON_SECRET"
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/cron/billing-renew" `
  -Headers @{ Authorization = "Bearer $secret" }

4) 결과 확인

select
  status,
  current_period_start,
  current_period_end,
  next_billing_at,
  last_payment_at,
  billing_retry_count,
  billing_retry_at,
  last_billing_error
from public.ds_content_memberships
order by updated_at desc;

select
  order_id,
  payment_key,
  amount,
  status,
  method,
  approved_at,
  failed_at,
  failure_code,
  failure_message
from public.ds_payment_transactions
order by created_at desc;

정상 기대값:
- transaction amount = 12900
- transaction status = paid
- membership status = active
- current_period_end / next_billing_at = 기존 결제예정일 기준 약 한 달 뒤
- billing_retry_count = 0

============================================================
6. Vercel Cron 운영 적용
============================================================

이 ZIP은 실수로 Vercel 배포가 막히는 것을 피하려고
vercel.json을 자동으로 만들지 않습니다.

Vercel 플랜에 따라 허용되는 cron 빈도가 다를 수 있으므로,
먼저 배포 후 프로젝트의 Cron 제한을 확인하세요.

vercel.step4_2.example.json은 하루 1회 예시입니다.
한국시간 00:10 = UTC 15:10 기준입니다.

사용하려면 해당 내용을 프로젝트 루트의 vercel.json으로 적용합니다.
이미 vercel.json이 있다면 crons 항목만 병합하세요.

더 자주 청구 예정시각을 맞추려면 플랜이 허용하는 범위에서
예: 0 * * * * (매시간) 등을 사용할 수 있습니다.

Vercel Environment Variables에도 반드시 추가:
- CRON_SECRET
- SONG_CLUB_MONTHLY_PRICE
- TOSS_SECRET_KEY
- BILLING_ENCRYPTION_KEY
- 기존 Supabase 환경변수

============================================================
7. 주의
============================================================

- 자동결제 실서비스는 TossPayments 자동결제 추가 계약/심사 후 사용해야 합니다.
- 현재는 Step 4-2 결제 엔진까지입니다.
- 사용자 해지 UI/해지 후 빌링키 정리 정책은 다음 Step 4-3에서 구현합니다.
- 테스트가 끝날 때까지 live_sk/live_ck로 바꾸지 마세요.
