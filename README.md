# DEAR SUNSHINE SONG PLAY — MVP

디어 선샤인 영어노래 멤버십의 첫 번째 웹앱 MVP입니다.

## 포함된 화면
- 홈
- 전체 노래 라이브러리
- 노래 상세: 플레이어 / 반복재생 / 가사 / 활동가이드 / 활동지
- Basic / Premium 멤버십 비교
- 모바일 하단 내비게이션
- 홈 화면 설치용 manifest
- Supabase 콘텐츠/멤버십 SQL 초안

## 실행
```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 요금제 미리보기
`.env.local`에 `NEXT_PUBLIC_DEMO_PLAN=basic` 또는 `premium`을 넣습니다.

## 실제 음원 연결
`lib/catalog.js`의 `audioUrl`에 경로를 넣으면 재생됩니다. 개발 중에는 `/audio/song.mp3`처럼 쓸 수 있습니다. 상용 서비스에서는 public 폴더보다 Supabase private Storage + signed URL 방식을 권장합니다.

## 기존 출석앱과 연결
- 사용자 앱은 별도 유지
- Supabase 프로젝트는 공유 가능
- 기존 관리자에 콘텐츠 관리 탭을 추가하는 방식 권장
- `supabase/schema.sql`은 기존 테이블 충돌 방지를 위해 `ds_content_*` 접두어 사용

## 다음 단계
1. Supabase Auth 로그인
2. 센터 회원 계정 연동
3. Basic 최근 3개월 접근제어
4. Premium 전체 라이브러리 접근제어
5. private Storage signed URL
6. 결제/구독 연동
7. 관리자 콘텐츠 업로드
8. 즐겨찾기/플레이리스트
9. 오프라인 재생
