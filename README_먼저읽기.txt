Dear Sunshine Song Club 정책/사업자정보 패치
==============================================

가장 쉬운 적용 방법 (Windows)
-----------------------------

1. 이 ZIP 파일의 압축을 풉니다.

2. 압축을 푼 폴더 안에서
   APPLY_PATCH.bat
   파일을 더블클릭합니다.

3. 프로그램이 Dear Sunshine 프로젝트 폴더를 물어보면,
   package.json이 들어 있는 프로젝트 최상위 폴더를
   창으로 끌어다 놓고 Enter를 누릅니다.

   예:
   C:\Users\사용자이름\Downloads\dear-sunshine-at-home

4. 패치 프로그램이 자동으로:
   - 기존 파일을 백업하고
   - 개인정보처리방침을 교체하고
   - 이용약관을 교체하고
   - 정기결제·해지 안내를 이용권·환불 안내로 교체하고
   - SiteFooter.js를 추가하고
   - app/layout.js에 Footer를 연결합니다.

5. 패치가 끝나면 프로젝트 폴더에서:

   npm run build

   를 실행합니다.

6. 빌드가 성공하면 확인:
   /privacy
   /terms
   /subscription-policy

7. GitHub/Vercel 배포 중이라면:

   git add .
   git commit -m "update legal pages and business info"
   git push


중요
----

- 패치 전에 기존 파일은 프로젝트 안의
  _patch_backup_날짜_시간
  폴더에 자동 백업됩니다.

- 무료체험 관련 정책은 포함하지 않았습니다.

- 자동결제/자동갱신 방식이 아니라
  센터 직접 결제 후 관리자에서 이용권을 활성화하는
  현재 운영 방식으로 작성했습니다.

- 실제 사업자 정보:
  상호: 디어 선샤인 영어 발달놀이 & 북클럽
  대표자: 경서연
  사업자등록번호: 219-14-14366
  주소: 서울특별시 마포구 신촌로 230, 3층 302호
        디어 선샤인 영어 발달놀이 & 북클럽(아현동, 리즈건물)
  고객문의: 010-8247-6447
  이메일: syeonjamie@gmail.com

- app/layout.js의 구조가 아주 특이해서 자동으로 {children}을
  찾지 못할 경우에는 정책 파일 적용은 완료되고,
  Footer 연결만 직접 확인하라는 안내가 나옵니다.
