Dear Sunshine Song Library 최종 교체본
=====================================

이 패치는 '자동 삽입' 방식이 아닙니다.
두 파일을 통째로 교체하는 방식입니다.

교체 파일
---------
1. components/LibraryClient.js
2. app/library/page.js

변경 내용
---------
- Basic / Premium 표시 완전 제거
- Sunshine Toddler 권한만 있는 회원:
  -> Sunshine Toddler 탭만 표시
- Melody Book Club 권한만 있는 회원:
  -> Melody Book Club 탭만 표시
- 두 클래스 권한이 모두 있는 회원:
  -> 전체 / Sunshine Toddler / Melody Book Club 표시
- 활성 멤버십 회원에게는 허용된 클래스의 곡만 서버에서 브라우저로 전달
- PlaylistPlayer에도 허용된 클래스의 곡만 전달
- 기존 SongCard의 프로그램 권한 체크 유지
- 프로그램 연결이 없는 회원은 안내문 표시

적용 방법
---------
1. ZIP 압축을 풉니다.
2. 압축 안의 components/LibraryClient.js를
   프로젝트의 components/LibraryClient.js에 덮어씁니다.
3. 압축 안의 app/library/page.js를
   프로젝트의 app/library/page.js에 덮어씁니다.
4. 프로젝트 루트에서:
   npm run build

성공하면:
git add .
git commit -m "filter library by Song Club program"
git push

중요
----
현재 빌드가 정상인 상태에서 이 두 파일만 교체하세요.
이전 자동 패치 스크립트는 다시 실행하지 마세요.
