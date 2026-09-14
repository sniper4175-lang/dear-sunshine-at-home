Dear Sunshine Song Club - 노래/플레이리스트 + Coming Up Next 수정 패치

수정 내용
1. 하단 메뉴는 기존처럼 홈 / 노래 / MY 3개를 유지합니다.
2. 노래 화면 안에 [전체 노래] / [내 플레이리스트] 서브탭을 추가했습니다.
3. 전체 노래는 월별 리스트 + 프로그램 필터 구조를 유지합니다.
4. 내 플레이리스트에서는 기존 PlaylistPlayer 기능을 다시 사용할 수 있습니다.
   - 곡 추가
   - 순서 변경
   - 연속 재생
   - 셔플/반복
   - 저장한 플레이리스트 등 기존 기능 유지
5. COMING UP NEXT는 관리자에서 is_upcoming=true로 지정한 곡을 다시 표시합니다.
   공개일이 다음 달로 정확히 입력되지 않아도 예고에는 표시됩니다.
   화면 제목의 다음 달(예: 10월)은 한국시간 기준으로 자동 계산됩니다.
6. 실제 음원/자료가 공개되는 날짜 제한은 변경하지 않습니다.

적용 방법
- 이 ZIP의 app 폴더와 components 폴더를 dear-sunshine-at-home 프로젝트 최상위 폴더에 붙여넣고 덮어쓰기합니다.

그 다음:
  npm run build

성공하면:
  git add app/page.js components/LibraryClient.js
  git commit -m "restore playlist and upcoming songs"
  git push
