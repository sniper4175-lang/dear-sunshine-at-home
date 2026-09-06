Dear Sunshine — Play Ideas + 여러 장 Printable 지원

1. Supabase SQL Editor
supabase/play_ideas_multi_printables.sql 실행

2. Storage 구조 (권장)

dear-sunshine-play-ideas
├─ Sunshine Toddler
│  └─ excavator-song
│     ├─ 01.png
│     ├─ 02.png
│     └─ 03.png
└─ Melody Book Club
   └─ treasure-hunt
      ├─ 01.png
      └─ 02.png

dear-sunshine-printables
├─ Sunshine Toddler
│  └─ excavator-song
│     ├─ 01.png
│     ├─ 02.png
│     └─ 03.png
└─ Melody Book Club
   └─ ...

3. ds_content_songs 경로 입력

여러 장:
printable_path = Sunshine Toddler/excavator-song
play_ideas_path = Sunshine Toddler/excavator-song

한 장(기존 방식도 계속 지원):
printable_path = Sunshine Toddler/weather-song.png
play_ideas_path = Sunshine Toddler/weather-idea.png

4. 앱 동작
- 한 장 경로면 그 파일 하나 표시
- 폴더 경로면 폴더 안 PNG/JPG/JPEG/WEBP/PDF를 이름순으로 모두 반환
- 01.png, 02.png, 03.png처럼 번호를 붙이면 원하는 순서대로 보임
- 각 페이지는 앱 안에서 함께 표시되고, 개별 크게 보기 가능
- server API에서 로그인 + 멤버십 + ds_user_program_access를 다시 검사

5. 새 API
/api/play-ideas-url
/api/printable-url (다중파일 지원으로 업데이트)

6. 적용 후
npm run build

git add .
git commit -m "Add play ideas and multi-page printables"
git push
