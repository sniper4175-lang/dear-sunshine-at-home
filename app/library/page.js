import LibraryClient
    from '../../components/LibraryClient';

import {
    createAdminSupabase
} from '../../lib/supabase-server';

import {
    getCurrentMembership
} from '../../lib/membership';

import {
    getUserPrograms
} from '../../lib/program-access';

import {
    todayKST
} from '../../lib/release-date';


export const dynamic =
    'force-dynamic';


const PROGRAM_OPTIONS = [
    'Sunshine Toddler',
    'Melody Book Club'
];


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
     * 현재 수강 프로그램
     * ==========================================
     */

    let userPrograms =
        [];


    if (user) {

        try {

            const savedPrograms =
                await getUserPrograms(
                    db,
                    user.id
                );


            userPrograms =
                (
                    savedPrograms ||
                    []
                ).filter(
                    program =>
                        PROGRAM_OPTIONS.includes(
                            program
                        )
                );

        } catch (error) {

            console.error(
                'Library program access error:',
                error
            );

        }

    }


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
            .lte(
                'release_date',
                todayKST()
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


    const allSongs =
        (
            songRows ||
            []
        ).map(
            mapSong
        );


    /*
     * ==========================================
     * 활성 멤버십 회원에게는
     * 허용된 프로그램의 곡만 브라우저로 전달
     * ==========================================
     */

    const songs =
        loggedIn &&
        membership
            ? allSongs.filter(
                song =>
                    userPrograms.includes(
                        song.program
                    )
            )
            : allSongs;


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
