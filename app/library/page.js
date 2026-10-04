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


const LIBRARY_SONG_FIELDS = `
    id,
    slug,
    title,
    program,
    category,
    emoji,
    is_basic,
    release_date,
    is_published
`;


function mapSong(
    row,
    homePackageIdSet = new Set(),
    homePackageBasicIdSet = new Set(),
    homePackageBonusIdSet = new Set(),
    accountBonusIdSet = new Set()
) {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        program: row.program,
        category: row.category,
        emoji: row.emoji,
        /*
         * 같은 곡이 Song Club과 Home Package에 동시에 포함되어도
         * Home Package의 분류/상세화면 로직을 우선합니다.
         */
        homePackagePreferred:
            homePackageIdSet.has(row.id),
        basic:
            Boolean(row.is_basic) ||
            homePackageBasicIdSet.has(row.id),
        bonus:
            homePackageBonusIdSet.has(row.id) ||
            accountBonusIdSet.has(row.id),
        releaseDate: row.release_date,
        isPublished: Boolean(row.is_published)
    };
}


function unique(values) {
    return [
        ...new Set(
            (values || []).filter(Boolean)
        )
    ];
}


function sortSongs(songs) {
    return [...songs].sort((a, b) => {
        const dateA = a.releaseDate || '';
        const dateB = b.releaseDate || '';

        if (dateA !== dateB) {
            return dateB.localeCompare(dateA);
        }

        return String(a.title || '')
            .localeCompare(
                String(b.title || ''),
                'ko'
            );
    });
}


export default async function LibraryPage() {
    const {
        user,
        membership
    } = await getCurrentMembership({
        includeBillingProfile: false
    });

    const loggedIn = Boolean(user);
    const db = createAdminSupabase();
    const today = todayKST();

    const homePackagePrograms = unique([
        ...(
            Array.isArray(
                membership?.home_package_programs
            )
                ? membership.home_package_programs
                : []
        ),
        membership?.home_package_program
    ]).filter(
        (program) =>
            PROGRAM_OPTIONS.includes(program)
    );

    const homePackageUnlockedSongIds = unique(
        Array.isArray(
            membership?.home_package_unlocked_song_ids
        )
            ? membership.home_package_unlocked_song_ids
            : []
    );

    const accountBonusSongIds = unique(
        Array.isArray(
            membership?.account_bonus_song_ids
        )
            ? membership.account_bonus_song_ids
            : []
    );


    const homePackageBonusSongIds = unique(
        Array.isArray(
            membership?.home_package_bonus_song_ids
        )
            ? membership.home_package_bonus_song_ids
            : []
    );

    /*
     * Home Package 곡 구성에서 unlock_week = 0으로 지정된 곡은
     * 공통 기본곡뿐 아니라 12회/20회 옵션 기본곡까지 모두
     * 노래 탭에서 "기본곡"으로 우선 표시합니다.
     *
     * 같은 곡이 보너스곡 또는 월별 음원 조건에도 해당하더라도
     * 기본곡 분류가 최우선입니다.
     */
    const homePackageBasicSongIds = unique(
        Array.isArray(
            membership?.home_package?.schedule
        )
            ? membership.home_package.schedule
                .filter(
                    row =>
                        Number(
                            row?.unlock_week ?? 0
                        ) === 0
                )
                .map(
                    row =>
                        row?.song_id
                )
            : []
    );

    const hasSongClub = Boolean(
        membership?.song_club_active ||
        (
            membership &&
            membership.product_type !== 'home_package' &&
            membership.product_type !== 'bonus_only' &&
            membership.provider !== 'home_package' &&
            membership.provider !== 'account_bonus'
        )
    );

    /*
     * 회원 프로그램 / Song Club 곡 / Home Package 곡 / 추가곡은
     * 현재 회원권 정보만 있으면 서로 독립적으로 조회할 수 있습니다.
     * 순차 조회 대신 동시에 시작해 모바일 화면 전환 대기를 줄입니다.
     */
    const programPromise = user
        ? getUserPrograms(db, user.id)
            .catch((error) => {
                console.error(
                    'Library program access error:',
                    error
                );
                return [];
            })
        : Promise.resolve([]);

    const songClubPromise =
        !loggedIn || hasSongClub
            ? db
                .from('ds_content_songs')
                .select(LIBRARY_SONG_FIELDS)
                .eq('is_published', true)
                .lte('release_date', today)
                .order(
                    'release_date',
                    { ascending: false }
                )
            : Promise.resolve({
                data: [],
                error: null
            });

    const homePackagePromise =
        loggedIn &&
        homePackageUnlockedSongIds.length > 0
            ? db
                .from('ds_content_songs')
                .select(LIBRARY_SONG_FIELDS)
                .in(
                    'id',
                    homePackageUnlockedSongIds
                )
            : Promise.resolve({
                data: [],
                error: null
            });

    const accountBonusPromise =
        loggedIn &&
        accountBonusSongIds.length > 0
            ? db
                .from('ds_content_songs')
                .select(LIBRARY_SONG_FIELDS)
                .in(
                    'id',
                    accountBonusSongIds
                )
            : Promise.resolve({
                data: [],
                error: null
            });

    const [
        savedPrograms,
        songClubResult,
        homePackageResult,
        accountBonusResult
    ] = await Promise.all([
        programPromise,
        songClubPromise,
        homePackagePromise,
        accountBonusPromise
    ]);

    const songClubPrograms = (savedPrograms || [])
        .filter(
            (program) =>
                PROGRAM_OPTIONS.includes(program)
        );

    const userPrograms = unique([
        ...songClubPrograms,
        ...homePackagePrograms
    ]);

    if (songClubResult?.error) {
        console.error(
            'Library Song Club songs error:',
            songClubResult.error
        );
    }

    if (homePackageResult?.error) {
        console.error(
            'Library Home Package songs error:',
            homePackageResult.error
        );
    }

    if (accountBonusResult?.error) {
        console.error(
            'Library account bonus songs error:',
            accountBonusResult.error
        );
    }

    const songClubRows =
        songClubResult?.data || [];

    const homePackageRows =
        homePackageResult?.data || [];

    const accountBonusRows =
        accountBonusResult?.data || [];

    const mergedById = new Map();

    for (
        const row of [
            ...songClubRows,
            ...homePackageRows,
            ...accountBonusRows
        ]
    ) {
        if (row?.id) {
            mergedById.set(row.id, row);
        }
    }

    const homePackageIdSet = new Set(
        homePackageUnlockedSongIds
    );

    const accountBonusIdSet = new Set(
        accountBonusSongIds
    );

    const homePackageBasicIdSet = new Set(
        homePackageBasicSongIds
    );

    const homePackageBonusIdSet = new Set(
        homePackageBonusSongIds
    );

    const mergedSongs = Array.from(
        mergedById.values()
    ).map(
        row =>
            mapSong(
                row,
                homePackageIdSet,
                homePackageBasicIdSet,
                homePackageBonusIdSet,
                accountBonusIdSet
            )
    );

    let songs;

    if (loggedIn && membership) {
        songs = mergedSongs.filter((song) => {
            if (accountBonusIdSet.has(song.id)) {
                return true;
            }

            if (homePackageIdSet.has(song.id)) {
                return true;
            }

            return (
                hasSongClub &&
                canAccessSong(
                    song,
                    membership,
                    songClubPrograms
                )
            );
        });
    } else {
        songs = mergedSongs.filter(
            (song) => song.isPublished
        );
    }

    songs = sortSongs(songs);

    /*
     * Client Component에는 실제로 필요한 회원권 필드만 전달합니다.
     * Home Package schedule 같은 큰 서버 객체가 RSC payload에 섞이지 않게 합니다.
     */
    const clientMembership = membership
        ? {
            product_type:
                membership.product_type || null,
            song_club_active:
                Boolean(membership.song_club_active),
            home_package_program:
                membership.home_package_program || null,
            home_package_unlocked_song_ids:
                homePackageUnlockedSongIds,
            home_package_bonus_song_ids:
                homePackageBonusSongIds,
            account_bonus_song_ids:
                accountBonusSongIds
        }
        : null;

    return (
        <LibraryClient
            songs={songs}
            loggedIn={loggedIn}
            membership={clientMembership}
            userPrograms={userPrograms}
        />
    );
}
