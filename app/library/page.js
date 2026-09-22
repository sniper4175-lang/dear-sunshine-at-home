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


function mapSong(row) {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        program: row.program,
        category: row.category,
        emoji: row.emoji,
        audioPath: row.audio_path,
        lyricsPath: row.lyrics_path,
        printablePath: row.printable_path,
        playIdeasPath: row.play_ideas_path,
        lyrics: row.lyrics || [],
        activities: row.activities || [],
        popular: Boolean(row.is_popular),
        premiumOnly: Boolean(row.premium_only),
        releaseDate: row.release_date,
        isPublished: Boolean(row.is_published),
        published: Boolean(row.is_published)
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

    let songClubPrograms = [];

    if (user) {
        try {
            const savedPrograms = await getUserPrograms(
                db,
                user.id
            );

            songClubPrograms = (savedPrograms || [])
                .filter(
                    (program) =>
                        PROGRAM_OPTIONS.includes(program)
                );
        } catch (error) {
            console.error(
                'Library program access error:',
                error
            );
        }
    }

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

    const userPrograms = unique([
        ...songClubPrograms,
        ...homePackagePrograms
    ]);

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

    let songClubRows = [];

    if (!loggedIn || hasSongClub) {
        const {
            data,
            error
        } = await db
            .from('ds_content_songs')
            .select('*')
            .eq('is_published', true)
            .lte('release_date', todayKST())
            .order(
                'release_date',
                { ascending: false }
            );

        if (error) {
            console.error(
                'Library Song Club songs error:',
                error
            );
        } else {
            songClubRows = data || [];
        }
    }

    let homePackageRows = [];

    if (
        loggedIn &&
        homePackageUnlockedSongIds.length > 0
    ) {
        const {
            data,
            error
        } = await db
            .from('ds_content_songs')
            .select('*')
            .in(
                'id',
                homePackageUnlockedSongIds
            );

        if (error) {
            console.error(
                'Library Home Package songs error:',
                error
            );
        } else {
            homePackageRows = data || [];
        }
    }

    let accountBonusRows = [];

    if (
        loggedIn &&
        accountBonusSongIds.length > 0
    ) {
        const {
            data,
            error
        } = await db
            .from('ds_content_songs')
            .select('*')
            .in(
                'id',
                accountBonusSongIds
            );

        if (error) {
            console.error(
                'Library account bonus songs error:',
                error
            );
        } else {
            accountBonusRows = data || [];
        }
    }

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
    ).map((row) => {
        const song = mapSong(row);

        return {
            ...song,
            homePackageUnlocked:
                homePackageIdSet.has(row.id),
            accountBonus:
                accountBonusIdSet.has(row.id),
            songClubPublished:
                Boolean(row.is_published)
        };
    });

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

    return (
        <LibraryClient
            songs={songs}
            loggedIn={loggedIn}
            membership={membership}
            userPrograms={userPrograms}
        />
    );
}
