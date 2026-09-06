-- =========================================================
-- Dear Sunshine
-- 기존 example.png 가사지 연결 해제
-- =========================================================

update public.ds_content_songs
set lyrics_path = null
where lyrics_path ilike '%example.png%';


-- 확인: 0 rows가 나와야 정상
select
    title,
    slug,
    program,
    lyrics_path
from public.ds_content_songs
where lyrics_path ilike '%example.png%'
order by program, title;


-- 참고:
-- 이제 lyrics_path가 NULL이어도 앱이 자동으로 아래 경로를 확인합니다.
--
-- dear-sunshine-lyrics/
--   {program}/
--     {title}/
--       01.png
--       02.png
--       ...
--
-- 예:
-- dear-sunshine-lyrics/Sunshine Toddler/Excavator Song/01.png
--
-- 폴더/파일이 있으면 가사지가 표시되고,
-- 없으면 앱에서 가사지 영역 자체가 표시되지 않습니다.
