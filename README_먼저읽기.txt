Dear Sunshine Song Library 권한별 탭 패치
==============================================

변경 내용
--------
1. Song Library 화면의 Basic / Premium 표시를 제거합니다.
2. 로그인 회원에게 관리자가 허용한 클래스만 보여줍니다.
3. Sunshine Toddler 권한만 있으면:
   → Sunshine Toddler 탭만 표시
4. Melody Book Club 권한만 있으면:
   → Melody Book Club 탭만 표시
5. 두 클래스 권한이 모두 있으면:
   → 전체 / Sunshine Toddler / Melody Book Club 표시
6. 권한이 없는 클래스의 곡은 회원 화면과 플레이리스트 대상에서 제외합니다.

적용 방법
--------
1. ZIP 압축을 풉니다.
2. APPLY_PATCH.bat 을 더블클릭합니다.
3. package.json이 들어 있는 Dear Sunshine 프로젝트 최상위 폴더를
   검은 창으로 끌어다 놓고 Enter를 누릅니다.
4. 자동으로 아래 파일을 백업한 뒤 패치합니다.
   - components/LibraryClient.js
   - app/library/page.js
5. 패치가 끝나면 VS Code 터미널에서:
   npm run build

성공 후 배포
-----------
git add .
git commit -m "filter song library by program access"
git push

백업
----
기존 파일은 같은 폴더에
LibraryClient_backup_날짜.js
page_backup_날짜.js
형태로 자동 백업됩니다.

주의
----
이 패치는 DB의 legacy plan 컬럼을 삭제하지 않습니다.
DB 내부 호환용 basic 값이 남아 있어도 사용자 화면에서는 Basic/Premium을
노출하지 않습니다.
