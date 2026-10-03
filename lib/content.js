import { unstable_cache } from 'next/cache';

import {
    createAdminSupabase
} from './supabase-server';

import {
    todayKST
} from './release-date';


function mapSong(row) {

    return {
        id:
            row.id,

        slug:
            row.slug,

        title:
            row.title,

        subtitle:
            row.subtitle || '',

        program:
            row.program || '',

        category:
            row.category || '',

        emoji:
            row.emoji || '🎵',

        audioPath:
            row.audio_path || '',

        lyricsPath:
            row.lyrics_path || '',

        printablePath:
            row.printable_path || '',

        playIdeasPath:
            row.play_ideas_path || '',

        lyrics:
            Array.isArray(
                row.lyrics
            )
                ? row.lyrics
                : [],

        activities:
            Array.isArray(
                row.activities
            )
                ? row.activities
                : [],

        basic:
            Boolean(
                row.is_basic
            ),

        popular:
            Boolean(
                row.is_popular
            ),

        premiumOnly:
            Boolean(
                row.premium_only
            ),

        published:
            Boolean(
                row.is_published
            ),

        releaseDate:
            row.release_date || ''
    };

}


/*
 * 목록 화면(Home/Library) 전용 가벼운 데이터 형태입니다.
 * 가사/놀이자료/스토리지 경로는 상세 화면에서만 가져옵니다.
 */
function mapSongSummary(row) {

    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle || '',
        program: row.program || '',
        category: row.category || '',
        emoji: row.emoji || '🎵',
        basic: Boolean(row.is_basic),
        popular: Boolean(row.is_popular),
        premiumOnly: Boolean(row.premium_only),
        published: Boolean(row.is_published),
        releaseDate: row.release_date || ''
    };

}


/*
 * 콘텐츠 메타데이터는 사용자별 데이터가 아니고 자주 바뀌지 않습니다.
 * force-dynamic 페이지 사이를 이동할 때마다 같은 곡 목록/곡 상세를
 * Supabase에서 다시 읽지 않도록 Vercel Data Cache에 짧게 보관합니다.
 */
const loadPublishedSongsCached = unstable_cache(
    async () => {
        const supabase = createAdminSupabase();

        const {
            data,
            error
        } = await supabase
            .from('ds_content_songs')
            .select(`
                id,
                slug,
                title,
                subtitle,
                program,
                category,
                emoji,
                is_basic,
                is_popular,
                premium_only,
                release_date,
                is_published
            `)
            .eq('is_published', true)
            .lte('release_date', todayKST())
            .order('release_date', { ascending: false })
            .order('title', { ascending: true });

        if (error) {
            console.error('getSongs error:', error);
            return [];
        }

        return (data || []).map(mapSongSummary);
    },
    ['ds-published-song-summaries-v3'],
    {
        revalidate: 120
    }
);


const loadRawSongBySlugCached = unstable_cache(
    async (slug) => {
        if (!slug) {
            return null;
        }

        const supabase = createAdminSupabase();

        const {
            data,
            error
        } = await supabase
            .from('ds_content_songs')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error) {
            console.error('getRawSongBySlug error:', error);
            return null;
        }

        return data || null;
    },
    ['ds-raw-song-by-slug-v3'],
    {
        revalidate: 120
    }
);


const loadSongRowsByIdsCached = unstable_cache(
    async (idsKey) => {
        const ids = String(idsKey || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        if (ids.length === 0) {
            return [];
        }

        const supabase = createAdminSupabase();

        const {
            data,
            error
        } = await supabase
            .from('ds_content_songs')
            .select(`
                id,
                slug,
                title,
                subtitle,
                program,
                category,
                emoji,
                audio_path,
                lyrics_path,
                printable_path,
                play_ideas_path,
                lyrics,
                activities,
                is_basic,
                is_popular,
                premium_only,
                release_date,
                is_published
            `)
            .in('id', ids);

        if (error) {
            console.error('getSongRowsByIds error:', error);
            return [];
        }

        return data || [];
    },
    ['ds-song-rows-by-ids-v3'],
    {
        revalidate: 120
    }
);


const loadUpcomingSongsCached = unstable_cache(
    async () => {
        const supabase = createAdminSupabase();

        const {
            data,
            error
        } = await supabase
            .from('ds_content_songs')
            .select(
                'id,slug,title,subtitle,program,category,emoji,release_date,is_upcoming'
            )
            .eq('is_upcoming', true)
            .order('release_date', { ascending: true })
            .order('title', { ascending: true });

        if (error) {
            console.error('Upcoming songs load error:', error);
            return [];
        }

        return data || [];
    },
    ['ds-upcoming-song-summaries-v3'],
    {
        revalidate: 120
    }
);


/*
 * 공개된 전체 콘텐츠
 */
export async function getSongs() {
    return loadPublishedSongsCached();
}


/*
 * 공개 여부와 관계없는 원본 곡 1개.
 * Home Package/계정 추가곡처럼 비공개 곡 접근 판정에도 사용합니다.
 */
export async function getRawSongBySlug(slug) {
    return loadRawSongBySlugCached(String(slug || ''));
}


/*
 * 여러 song id를 한 번에 조회합니다.
 * id 순서를 정규화해서 페이지가 달라도 같은 캐시를 재사용합니다.
 */
export async function getSongRowsByIds(songIds = []) {
    const idsKey = [
        ...new Set((songIds || []).filter(Boolean))
    ]
        .map(String)
        .sort()
        .join(',');

    return loadSongRowsByIdsCached(idsKey);
}


export async function getUpcomingSongs() {
    return loadUpcomingSongsCached();
}


/*
 * slug로 한 곡 조회
 */
export async function getSongBySlug(slug) {

    const row = await getRawSongBySlug(slug);

    if (!row) {
        return null;
    }

    const released =
        !row.release_date ||
        String(row.release_date).slice(0, 10) <= todayKST();

    if (!row.is_published || !released) {
        return null;
    }

    return mapSong(row);
}


/*
 * 인기곡
 */
export async function getPopularSongs() {

    const songs =
        await getSongs();


    return songs.filter(
        song =>
            song.popular
    );

}


/*
 * 최신곡
 */
export async function getNewSongs(
    limit = 4
) {

    const songs =
        await getSongs();


    return songs.slice(
        0,
        limit
    );

}
