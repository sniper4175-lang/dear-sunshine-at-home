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

import {
    canAccessSong
} from '../../lib/content-access';


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

        playIdeasPath:
            row.play_ideas_path,

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
            ),

        published:
            Boolean(
                row.is_published
            )
    };

}


function unique(
    values
) {

    return [
        ...new Set(
            (
                values ||
                []
            ).filter(
                Boolean
            )
        )
    ];

}


function sortSongs(
    songs
) {

    return [
        ...songs
    ].sort(
        (
            a,
            b
        ) => {

            const dateA =
                a.releaseDate ||
                '';

            const dateB =
                b.releaseDate ||
                '';


            if (
                dateA !==
                dateB
            ) {

                return dateB.localeCompare(
                    dateA
                );

            }


            return String(
                a.title ||
                ''
            ).localeCompare(
                String(
                    b.title ||
                    ''
                ),
                'ko'
            );

        }
    );

}


export default async function LibraryPage() {

    /*
     * ==========================================
     * 로그인 사용자 + 현재 이용 상품
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


    const db =
        createAdminSupabase();


    /*
     * ==========================================
     * Song Club 프로그램 권한 +
     * Home Package 이용 클래스
     *
     * LibraryClient / PlaylistPlayer가 기존
     * userPrograms 기준으로 재생 가능곡을 계산하는
     * 경우에도 Home Package 클래스가 빠지지 않도록
     * 합쳐서 전달합니다.
     * ==========================================
     */

    let songClubPrograms =
        [];


    if (user) {

        try {

            const savedPrograms =
                await getUserPrograms(
                    db,
                    user.id
                );


            songClubPrograms =
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


    const homePackagePrograms =
        unique([
            ...(
                Array.isArray(
                    membership?.home_package_programs
                )
                    ? membership.home_package_programs
                    : []
            ),
            membership?.home_package_program
        ]).filter(
            program =>
                PROGRAM_OPTIONS.includes(
                    program
                )
        );


    const userPrograms =
        unique([
            ...songClubPrograms,
            ...homePackagePrograms
        ]);


    /*
     * ==========================================
     * Home Package에서 현재까지 열린 곡
     *
     * 중요:
     * 이 ID 목록은 Home Package의 기본곡 / 옵션 기본곡 /
     * 현재 주차 신곡 / 현재 주차 추가곡까지 포함합니다.
     * Song Club의 is_published 여부와는 독립적입니다.
     * ==========================================
     */

    const homePackageUnlockedSongIds =
        unique(
            Array.isArray(
                membership?.home_package_unlocked_song_ids
            )
                ? membership.home_package_unlocked_song_ids
                : []
        );


    const hasSongClub =
        Boolean(
            membership?.song_club_active ||
            (
                membership &&
                membership.product_type !==
                    'home_package' &&
                membership.provider !==
                    'home_package'
            )
        );


    /*
     * ==========================================
     * 1) Song Club에서 공개된 곡
     * ==========================================
     */

    let songClubRows =
        [];


    if (
        !loggedIn ||
        hasSongClub
    ) {

        const {
            data,
            error
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


        if (error) {

            console.error(
                'Library Song Club songs error:',
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

        } else {

            songClubRows =
                data ||
                [];

        }

    }


    /*
     * ==========================================
     * 2) Home Package에서 현재 열린 곡
     *
     * Song Club 비공개 곡도 ID가 Home Package에서
     * 열려 있으면 반드시 가져옵니다.
     * ==========================================
     */

    let homePackageRows =
        [];


    if (
        loggedIn &&
        homePackageUnlockedSongIds.length >
            0
    ) {

        const {
            data,
            error
        } =
            await db
                .from(
                    'ds_content_songs'
                )
                .select(
                    '*'
                )
                .in(
                    'id',
                    homePackageUnlockedSongIds
                );


        if (error) {

            console.error(
                'Library Home Package songs error:',
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

        } else {

            homePackageRows =
                data ||
                [];

        }

    }


    /*
     * ==========================================
     * 중복 제거 후 상품별 접근권한 적용
     * ==========================================
     */

    const mergedById =
        new Map();


    for (
        const row of [
            ...songClubRows,
            ...homePackageRows
        ]
    ) {

        if (
            row?.id
        ) {

            mergedById.set(
                row.id,
                row
            );

        }

    }


    const homePackageIdSet =
        new Set(
            homePackageUnlockedSongIds
        );


    const mergedSongs =
        Array.from(
            mergedById.values()
        ).map(
            row => {

                const song =
                    mapSong(
                        row
                    );


                return {
                    ...song,

                    /*
                     * 클라이언트가 필요하면 이 값을 이용해
                     * Home Package 전용곡을 구분할 수 있습니다.
                     */
                    homePackageUnlocked:
                        homePackageIdSet.has(
                            row.id
                        ),

                    songClubPublished:
                        Boolean(
                            row.is_published
                        )
                };

            }
        );


    let songs;


    if (
        loggedIn &&
        membership
    ) {

        songs =
            mergedSongs.filter(
                song => {

                    /*
                     * Home Package에서 현재 열린 곡은
                     * Song Club 공개 여부와 상관없이 허용합니다.
                     */
                    if (
                        homePackageIdSet.has(
                            song.id
                        )
                    ) {
                        return true;
                    }


                    /*
                     * 나머지는 기존 Song Club 권한을 적용합니다.
                     */
                    return (
                        hasSongClub &&
                        canAccessSong(
                            song,
                            membership,
                            songClubPrograms
                        )
                    );

                }
            );

    } else {

        /*
         * 로그인 전에는 기존과 동일하게 Song Club 공개곡만 표시합니다.
         */
        songs =
            mergedSongs.filter(
                song =>
                    song.isPublished
            );

    }


    songs =
        sortSongs(
            songs
        );


    /*
     * ==========================================
     * Library 화면
     * ==========================================
     */

    return (

        <div className="ds-library-mobile-skin">
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
        </div>

    );

}
