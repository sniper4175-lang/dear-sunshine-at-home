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
    release_date,
    is_published
`;


function mapSong(row) {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        program: row.program,
        category: row.category,
        emoji: row.emoji,
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


export default async function LibraryPage({ searchParams }) {
    const params = searchParams ? await searchParams : {};
    const initialCategory =
        typeof params?.category === 'string'
            ? params.category
            : 'all';
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

    const mergedSongs = Array.from(
        mergedById.values()
    ).map(mapSong);

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
                homePackageUnlockedSongIds
        }
        : null;

    return (
        <LibraryClient
            songs={songs}
            loggedIn={loggedIn}
            membership={clientMembership}
            userPrograms={userPrograms}
            initialCategory={initialCategory}
        />
    );
}
