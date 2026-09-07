Dear Sunshine — Step 4-1 TossPayments 자동결제 테스트 연동

이번 단계에서 구현되는 것
1. /membership → "7일 무료체험 시작하기"
2. 로그인 사용자를 서버에서 확인
3. 서버에서 추측하기 어려운 customerKey 생성/보관
4. TossPayments V2 결제창으로 카드 인증
5. successUrl에서 authKey + customerKey 수신
6. 서버가 customerKey 소유권 재검증
7. TOSS_SECRET_KEY로 billingKey 발급
8. billingKey를 AES-256-GCM으로 암호화하여 ds_billing_profiles에 저장
9. 오늘 결제는 0원
10. ds_content_memberships에 status=trialing, 7일 종료일, next_billing_at 생성
11. trialing 상태도 Song Club 콘텐츠 접근 가능

중요
- 카드번호/CVC/유효기간을 Dear Sunshine 서버나 DB가 직접 받거나 저장하지 않습니다.
- TOSS_SECRET_KEY는 서버 전용입니다.
- BILLING_ENCRYPTION_KEY도 서버 전용입니다.
- NEXT_PUBLIC_TOSS_CLIENT_KEY만 브라우저 노출용입니다.
- 이 단계는 "첫 결제수단 등록 + 7일 무료체험 시작"까지입니다.
- 7일 뒤 12,900원 실제 자동결제를 실행하는 스케줄러는 Step 4-2에서 연결합니다.
- 네이버페이/토스페이 자동결제는 별도 심사가 필요하므로 계약 승인 뒤 추가합니다.
- 카카오페이는 현재 TossPayments 자동결제(빌링) 지원 대상이 아닙니다.

적용 순서
A. Supabase SQL Editor:
supabase/step4_1_toss_billing_test.sql

B. .env.local:
ENV_STEP4_1.txt 참고

C. 패치 파일을 프로젝트 같은 경로에 덮어쓰기

D. 로컬:
npm run build
npm run dev

E. 테스트:
로그인 → /membership → 7일 무료체험 시작하기
테스트 환경 본인인증 번호가 뜨면 Toss 공식 문서 안내대로 000000 사용

F. 성공 확인 SQL:
select
  user_id,
  provider,
  customer_key,
  payment_method,
  payment_method_label,
  is_active,
  billing_key_encrypted is not null as has_encrypted_billing_key
from public.ds_billing_profiles
order by updated_at desc;

select
  user_id,
  status,
  trial_starts_at,
  trial_ends_at,
  next_billing_at,
  cancel_at_period_end
from public.ds_content_memberships
order by created_at desc;

G. 빌드 성공 후:
git add .
git commit -m "Add TossPayments billing registration"
git push

Vercel에도 반드시 환경변수 3개를 추가:
NEXT_PUBLIC_TOSS_CLIENT_KEY
TOSS_SECRET_KEY
BILLING_ENCRYPTION_KEY
