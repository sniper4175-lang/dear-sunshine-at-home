import LibraryClient
    from '../../components/LibraryClient';

import {
    createServerSupabase
} from '../../lib/supabase-server';

import {
    adminDb
} from '../../lib/supabase-admin';


export const dynamic =
    'force-dynamic';



function mapSong(
    row
) {

    return {
        id:
            row.id,

        slug:
            row.slug,

        title:
            row.title,

        subtitle:
            row.subtitle,

        program:
            row.program,

        category:
            row.category,

        emoji:
            row.emoji,

        audioPath:
            row.audio_path,

        lyricsPath:
            row.lyrics_path,

        printablePath:
            row.printable_path,

        lyrics:
            row.lyrics ||
            [],

        activities:
            row.activities ||
            [],

        popular:
            Boolean(
                row.is_popular
            ),

        premiumOnly:
            Boolean(
                row.premium_only
            ),

        releaseDate:
            row.release_date,

        isPublished:
            Boolean(
                row.is_published
            )
    };

}



/*
 * ==========================================
 * 현재 로그인 사용자의 수강 프로그램 조회
 *
 * ds_active_user_programs VIEW 사용
 * ==========================================
 */
async function getUserPrograms(
    db,
    userId
) {

    if (!userId) {
        return [];
    }


    const {
        data,
        error
    } =
        await db
            .from(
                'ds_active_user_programs'
            )
            .select(
                'program'
            )
            .eq(
                'user_id',
                userId
            );


    if (error) {

        console.error(
            'getUserPrograms error:',
            error
        );


        return [];

    }


    return [
        ...new Set(
            (
                data ||
                []
            )
                .map(
                    item =>
                        item.program
                )
                .filter(
                    Boolean
                )
        )
    ];

}



export default async function LibraryPage() {

    /*
     * ==========================================
     * 로그인 사용자 확인
     * ==========================================
     */

    const supabase =
        await createServerSupabase();


    const {
        data: {
            user
        },
        error: userError
    } =
        await supabase
            .auth
            .getUser();


    if (
        userError
    ) {

        console.error(
            'Library getUser error:',
            userError
        );

    }


    const loggedIn =
        Boolean(
            user
        );



    /*
     * ==========================================
     * 서버 DB
     *
     * 공개 콘텐츠 / 멤버십 /
     * 수강 프로그램 조회
     * ==========================================
     */

    const db =
        adminDb();



    /*
     * ==========================================
     * 공개 노래 조회
     * ==========================================
     */

    const {
        data: songRows,
        error: songsError
    } =
        await db
            .from(
                'ds_content_songs'
            )
            .select(
                '*'
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
            );


    if (
        songsError
    ) {

        console.error(
            'Library songs error:',
            songsError
        );

    }


    const songs =
        (
            songRows ||
            []
        ).map(
            mapSong
        );



    /*
     * ==========================================
     * At Home 멤버십 조회
     * ==========================================
     */

    let membership =
        null;


    if (
        user
    ) {

        const {
            data,
            error
        } =
            await db
                .from(
                    'ds_memberships'
                )
                .select(
                    '*'
                )
                .eq(
                    'user_id',
                    user.id
                )
                .eq(
                    'status',
                    'active'
                )
                .maybeSingle();


        if (
            error
        ) {

            console.error(
                'Library membership error:',
                error
            );

        } else {

            membership =
                data ||
                null;

        }

    }



    /*
     * ==========================================
     * 현재 수강 중인 프로그램 조회
     *
     * 예:
     *
     * [
     *   'Sunshine Toddler'
     * ]
     *
     * 또는
     *
     * [
     *   'Sunshine Toddler',
     *   'Melody Book Club'
     * ]
     * ==========================================
     */

    const userPrograms =
        user
            ? await getUserPrograms(
                db,
                user.id
            )
            : [];



    /*
     * ==========================================
     * 화면
     * ==========================================
     */

    return (

        <LibraryClient
            songs={
                songs
            }
            loggedIn={
                loggedIn
            }
            membership={
                membership
            }
            userPrograms={
                userPrograms
            }
        />

    );

}