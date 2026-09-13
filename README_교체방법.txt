Dear Sunshine 홈 최종 교체본
================================

이번 수정은 두 기능을 동시에 유지합니다.

1. 클래스 권한 필터
- Sunshine Toddler 회원 -> Toddler 음원만
- Melody Book Club 회원 -> Book Club 음원만
- 두 클래스 회원 -> 두 클래스 모두
- 권한 없는 클래스의 자물쇠 음원은 홈에서 숨김

2. COMING UP NEXT 수동 지정
- 관리자에서 '다음 달 예고 지정'을 누르면 공개일과 상관없이 표시
- release_date가 이번 달/지난 달이어도 is_upcoming=true면 표시
- 단, 회원에게 허용된 클래스의 예고곡만 표시
- '다음 달 예고 해제'를 누르면 사라짐

교체 파일
---------
app/page.js

적용 방법
---------
1. 이 ZIP의 app/page.js를 프로젝트의 app/page.js에 통째로 덮어씁니다.
2. 프로젝트 루트에서:
   npm run build

성공하면:
git add app/page.js
git commit -m "fix manual upcoming songs and home program filter"
git push

이전 자동 패치 파일은 실행하지 마세요.
