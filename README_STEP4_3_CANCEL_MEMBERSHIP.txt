Dear Sunshine Monthly Song Club
Step 4-3: 구독 해지 + Membership 화면

[적용 파일]
- app/api/billing/cancel/route.js (신규)
- app/membership/page.js
- components/MembershipClient.js
- lib/membership.js
- lib/recurring-billing.js
- supabase/step4_3_cancel_membership.sql (신규)

[해지 동작]
1) trialing 사용자가 해지
   - 무료체험 종료일까지 계속 이용
   - 첫 12,900원 결제는 진행하지 않음

2) active 사용자가 해지
   - 이미 결제한 current_period_end까지 계속 이용
   - 다음 자동결제는 진행하지 않음

3) past_due 사용자가 해지
   - 결제 재시도를 즉시 중단하고 cancelled 처리

4) /api/cron/billing-renew 실행 시
   - 종료일이 지난 해지 예정 멤버십을 cancelled로 마감
   - 해당 billing profile을 is_active=false 처리
   - 이후 자동결제 대상에서는 제외

[Membership 화면]
- 상태: 이용 중 / 무료체험 중 / 해지 예정
- 이용 시작일
- 첫 결제 예정일 또는 다음 결제 예정일
- 등록 결제수단
- 해지 신청 후 이용 가능 종료일
- 구독 해지 버튼

[적용 순서]
1. ZIP을 프로젝트 루트에 덮어쓰기
2. Supabase SQL Editor에서 supabase/step4_3_cancel_membership.sql 실행
3. npm run build
4. npm run dev
5. /membership에서 테스트 계정으로 로그인
6. '구독 해지' 클릭

[DB 확인]
select
  status,
  cancel_at_period_end,
  cancelled_at,
  current_period_end,
  next_billing_at
from public.ds_content_memberships
where user_id = (
  select id from auth.users
  where email = '테스트계정이메일'
)
order by created_at desc;

해지 직후 active 계정 예상:
- status = active
- cancel_at_period_end = true
- cancelled_at = 해지 신청 시각
- current_period_end = 기존 종료일 유지
- next_billing_at = 기존 값 유지 (claim 함수가 cancel_at_period_end=true를 제외하므로 결제되지 않음)

종료일 경과 후 cron 실행 예상:
- status = cancelled
- next_billing_at = null
- billing profile is_active = false

[중요]
- 해지 신청 즉시 콘텐츠를 막지 않습니다.
- 이미 결제한 기간 또는 무료체험 기간이 끝날 때까지 이용 가능합니다.
- 해지 예정 멤버십은 자동결제 claim에서 명시적으로 제외됩니다.
