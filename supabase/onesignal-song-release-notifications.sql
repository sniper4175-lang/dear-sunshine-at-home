-- Dear Sunshine Home
-- OneSignal weekly new-song push notification marker
-- Run once in the Seoul Supabase SQL Editor.

alter table public.ds_content_songs
add column if not exists push_notified_at timestamptz;

create index if not exists ds_content_songs_push_notification_idx
on public.ds_content_songs (release_date, push_notified_at);
