Dear Sunshine Home - Home Package private song 404 final fix

덮어쓰기 파일:
- app/song/[slug]/page.js
- components/SongCard.js

핵심 수정:
1) Home Package에서 현재 열린 곡은 Song Club 비공개여도 이용 가능
2) 잘못 /song/[slug] 주소로 들어와도 /home-package/song/[slug]로 서버에서 자동 이동
3) SongCard도 homePackageUnlocked 곡은 처음부터 Home Package 전용 주소 사용
4) Song Club 일반 비공개 정책은 그대로 유지

SQL 필요 없음.

적용 후:
npm run build

git add .
git commit -m "Fix Home Package private song routing fallback"
git push
