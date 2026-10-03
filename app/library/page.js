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
    canAccessSong
} from '../../lib/content-access';

import {
    getSongs,
    getSongRowsByIds
} from '../../lib/content';


export const dynamic =
    'force-dynamic';


const PROGRAM_OPTIONS = [
    'Sunshine Toddler',
    'Melody Book Club'
];



function mapSong(
    row,
    accountBonusIdSet = new Set()
) {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        program: row.program,
        category: row.category,
        emoji: row.emoji,
        basic: Boolean(row.is_basic),
        bonus: accountBonusIdSet.has(row.id),
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
     * 공개곡은 공용 Data Cache를 재사용하고, Home Package/추가곡은
     * song id를 합쳐 단 한 번만 조회합니다. 페이지를 오갈 때 같은 곡을
     * 여러 쿼리로 반복해서 읽지 않도록 한 단계 더 강하게 줄였습니다.
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

    const publicSongsPromise =
        !loggedIn || hasSongClub
            ? getSongs()
            : Promise.resolve([]);

    const privateSongIds = unique([
        ...homePackageUnlockedSongIds,
        ...accountBonusSongIds
    ]);

    const privateSongsPromise =
        loggedIn && privateSongIds.length > 0
            ? getSongRowsByIds(privateSongIds)
            : Promise.resolve([]);

    const [
        savedPrograms,
        publicSongs,
        privateRows
    ] = await Promise.all([
        programPromise,
        publicSongsPromise,
        privateSongsPromise
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

    const songClubRows =
        (publicSongs || []).map((song) => ({
            id: song.id,
            slug: song.slug,
            title: song.title,
            program: song.program,
            category: song.category,
            emoji: song.emoji,
            is_basic: song.basic,
            release_date: song.releaseDate,
            is_published: song.published
        }));

    const mergedById = new Map();

    for (
        const row of [
            ...songClubRows,
            ...(privateRows || [])
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
    ).map(
        row =>
            mapSong(
                row,
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
