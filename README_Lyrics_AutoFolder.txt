Dear Sunshine — example.png 가사지 제거 + 자동 폴더 인식

최종 동작

1. DB에 lyrics_path가 정상 실제 경로로 들어 있으면 그 경로를 사용합니다.

2. lyrics_path가 NULL이거나 과거 example.png이면
   자동으로 아래 Storage 폴더를 찾습니다.

   dear-sunshine-lyrics/{program}/{title}

예:
dear-sunshine-lyrics
└─ Sunshine Toddler
   └─ Excavator Song
      ├─ 01.png
      └─ 02.png

3. 해당 폴더에 이미지가 있으면 앱에서 표시합니다.

4. 해당 폴더가 없거나 파일이 없으면
   "등록된 가사지가 없습니다" 같은 박스도 띄우지 않고
   가사지 영역 자체를 숨깁니다.

5. 한 폴더에 01.png, 02.png, 03.png처럼 여러 장이 있으면
   모두 순서대로 표시합니다.

적용 순서

A. Supabase SQL Editor에서 실행:
supabase/remove_example_lyrics_and_auto_folder.sql

B. 코드 파일 교체:
app/api/lyrics-url/route.js
components/LyricsSheet.js
app/song/[slug]/page.js
lib/storage-resource.js

C. 빌드:
npm run build

D. 성공 후:
git add .
git commit -m "Auto-detect lyric sheets and remove example fallback"
git push
