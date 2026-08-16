import {
    createAdminSupabase
} from './supabase-server';


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
 * 공개된 전체 콘텐츠
 */
export async function getSongs() {

    const supabase =
        createAdminSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'ds_content_songs'
            )
            .select(
                `
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
                lyrics,
                activities,
                is_popular,
                premium_only,
                release_date,
                is_published
                `
            )
            .eq(
                'is_published',
                true
            )
            .order(
                'release_date',
                {
                    ascending:
                        false
                }
            )
            .order(
                'title',
                {
                    ascending:
                        true
                }
            );


    if (error) {

        console.error(
            'getSongs error:',
            error
        );

        return [];

    }


    return (
        data || []
    ).map(
        mapSong
    );

}


/*
 * slug로 한 곡 조회
 */
export async function getSongBySlug(
    slug
) {

    if (!slug) {
        return null;
    }


    const supabase =
        createAdminSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'ds_content_songs'
            )
            .select(
                `
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
                lyrics,
                activities,
                is_popular,
                premium_only,
                release_date,
                is_published
                `
            )
            .eq(
                'slug',
                slug
            )
            .eq(
                'is_published',
                true
            )
            .maybeSingle();


    if (error) {

        console.error(
            'getSongBySlug error:',
            error
        );

        return null;

    }


    if (!data) {
        return null;
    }


    return mapSong(
        data
    );

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