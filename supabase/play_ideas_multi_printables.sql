-- =========================================================
-- Dear Sunshine Song Club
-- Play Ideas + multi-page printables
-- =========================================================

begin;

-- 1) 곡별 Play Ideas 경로
alter table public.ds_content_songs
    add column if not exists play_ideas_path text;

-- 2) private Play Ideas bucket 생성
--    이미 존재하면 아무 변화 없음.
insert into storage.buckets (
    id,
    name,
    public
)
values (
    'dear-sunshine-play-ideas',
    'dear-sunshine-play-ideas',
    false
)
on conflict (id)
do update
set public = false;

commit;


-- 확인
select
    column_name,
    data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ds_content_songs'
  and column_name in (
      'printable_path',
      'play_ideas_path'
  )
order by column_name;


select
    id,
    name,
    public
from storage.buckets
where id in (
    'dear-sunshine-printables',
    'dear-sunshine-play-ideas'
)
order by id;
