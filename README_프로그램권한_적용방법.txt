Dear Sunshine — 프로그램별 콘텐츠 접근권한 최종 통일

정책
- 로그인 O
- 유효한 Song Club membership O
- ds_user_program_access에 song.program 권한 O
→ 해당 콘텐츠 접근 허용

프로그램
- Sunshine Toddler 권한 → Sunshine Toddler만
- Melody Book Club 권한 → Melody Book Club만
- 둘 다 있으면 둘 다

서버 보호
/api/audio-url
/api/lyrics-url
/api/printable-url
세 API 모두 signed URL 발급 직전에 ds_user_program_access를 서버에서 다시 조회합니다.
브라우저 화면의 accessible 값은 신뢰하지 않습니다.

제거된 접근 제한
- Basic/Premium 구분
- premium_only
- 최근 3개월 제한

추가/교체 파일
lib/content-access.js
lib/program-access.js (신규)
lib/content.js
app/page.js
app/library/page.js
app/song/[slug]/page.js
components/LibraryClient.js
app/api/audio-url/route.js
app/api/lyrics-url/route.js
app/api/printable-url/route.js

적용 후
npm run build

성공 후
git add .
git commit -m "Enforce program access on Song Club content"
git push
