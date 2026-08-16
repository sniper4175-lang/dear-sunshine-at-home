import LibraryClient
    from '../../components/LibraryClient';

import {
    createAdminSupabase
} from '../../lib/supabase-server';

import {
    getCurrentMembership
} from '../../lib/membership';


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
                'ds_user_program_access'
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
            {
                message:
                    error?.message,

                code:
                    error?.code,

                details:
                    error?.details,

                hint:
                    error?.hint
            }
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
     * 로그인 사용자 + 유효 멤버십
     * ==========================================
     */

    const {
        user,
        membership
    } =
        await getCurrentMembership();


    const loggedIn =
        Boolean(
            user
        );



    /*
     * ==========================================
     * 관리자 DB
     * ==========================================
     */

    const db =
        createAdminSupabase();



    /*
     * ==========================================
     * 공개된 노래
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
            {
                message:
                    songsError?.message,

                code:
                    songsError?.code,

                details:
                    songsError?.details,

                hint:
                    songsError?.hint
            }
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
     * 현재 수강 프로그램
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
     * Library 화면
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