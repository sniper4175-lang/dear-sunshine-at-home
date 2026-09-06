Dear Sunshine Step ③ — 법적 고지 페이지 + 동의 UI

교체/추가 파일:
1. components/SiteFooter.js                (신규)
2. app/layout.js                           (교체)
3. app/privacy/page.js                     (신규)
4. app/terms/page.js                       (신규)
5. app/subscription-policy/page.js         (신규)
6. app/signup/page.js                      (교체)
7. components/MembershipClient.js          (교체)

중요:
- 정식 결제 오픈 전 다음 실제 정보를 반드시 입력하세요.
  * 사업자 상호/대표자
  * 사업자등록번호
  * 통신판매업 신고번호
  * 사업장 주소
  * 고객문의 이메일/전화
  * 개인정보 보호책임자
- 현재 회원가입 동의 버전은 Supabase Auth user_metadata에도 기록하도록 했습니다.
- 완전한 증빙용 동의 이력 테이블/서버 기록은 PG 연동 단계에서 추가하는 것을 권장합니다.
- MembershipClient의 결제 버튼은 아직 PG를 호출하지 않습니다. 동의 UX까지만 추가했습니다.

빌드:
npm run build

성공 후:
git add .
git commit -m "Add legal pages and subscription consent"
git push
