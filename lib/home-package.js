import { todayKST } from './release-date';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value) {
    if (!value) {
        return null;
    }

    const [year, month, day] = String(value)
        .slice(0, 10)
        .split('-')
        .map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(startValue, endValue) {
    const start = parseDateOnly(startValue);
    const end = parseDateOnly(endValue);

    if (!start || !end) {
        return 0;
    }

    return Math.max(
        0,
        Math.floor((end.getTime() - start.getTime()) / DAY_MS)
    );
}

function addDays(value, days) {
    const date = parseDateOnly(value);

    if (!date) {
        return null;
    }

    date.setUTCDate(date.getUTCDate() + Number(days || 0));

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
}

export function homePackagePlanLabel(planCode) {
    switch (planCode) {
        case 'home_8':
            return '8회 Home Package';
        case 'home_12':
            return '12회 Home Package';
        case 'home_20':
            return '20회 Home Package';
        default:
            return 'Home Package';
    }
}

export async function getHomePackageMembership(db, userId) {
    if (!db || !userId) {
        return null;
    }

    const today = todayKST();

    const {
        data: productRows,
        error: productError
    } = await db
        .from('ds_user_products')
        .select(`
            id,
            user_id,
            product_type,
            plan_code,
            program,
            status,
            starts_at,
            ends_at,
            release_weeks,
            created_at
        `)
        .eq('user_id', userId)
        .eq('product_type', 'home_package')
        .eq('status', 'active')
        .lte('starts_at', today)
        .order('created_at', { ascending: false });

    if (productError) {
        /*
         * Home Package SQL을 아직 실행하지 않은 배포에서도
         * 기존 Song Club이 깨지지 않도록 null로 처리합니다.
         */
        console.error('home package product lookup error:', productError);
        return null;
    }

    const product = (productRows || []).find((row) => {
        return !row.ends_at || String(row.ends_at).slice(0, 10) >= today;
    });

    if (!product) {
        return null;
    }

    const storedReleaseWeeks = Number(product.release_weeks || 0);
    const releaseWeeks =
        product.plan_code === 'home_20'
            ? Math.max(21, storedReleaseWeeks)
            : storedReleaseWeeks;
    const elapsedDays = daysBetween(product.starts_at, today);

    /*
     * 시작일을 1주차로 계산합니다.
     *
     * 예)
     * 시작일 당일      -> 1주차 즉시 공개
     * 시작일 + 7일    -> 2주차 공개
     * 시작일 + 14일   -> 3주차 공개
     *
     * unlock_week = 0인 기본곡은 기존처럼 즉시 공개됩니다.
     */
    const currentWeek = Math.max(1, Math.floor(elapsedDays / 7) + 1);
    const unlockedWeek = Math.min(currentWeek, releaseWeeks);

    const {
        data: trackRows,
        error: trackError
    } = await db
        .from('ds_home_package_tracks')
        .select('song_id,unlock_week,position')
        .eq('program', product.program)
        .lte('unlock_week', releaseWeeks)
        .order('unlock_week', { ascending: true })
        .order('position', { ascending: true });

    if (trackError) {
        console.error('home package track lookup error:', trackError);
        return null;
    }

    const {
        data: bonusRows,
        error: bonusError
    } = await db
        .from('ds_user_product_bonus_songs')
        .select('song_id')
        .eq('product_id', product.id);

    if (bonusError) {
        console.error('home package bonus lookup error:', bonusError);
    }

    /*
     * Home Package 기본곡 position 규칙
     * 1~3  : 모든 상품 공통 기본곡
     * 4~8  : home_12 전용 기본 보너스곡 (최대 5곡)
     * 9~13 : home_20 전용 기본 보너스곡 (최대 5곡)
     * 주차곡(unlock_week > 0)은 position 1~3만 사용합니다.
     */
    const schedule = (trackRows || [])
        .filter((row) => {
            const unlockWeek = Number(row.unlock_week || 0);
            const position = Number(row.position || 1);

            if (unlockWeek > 0) {
                return position >= 1 && position <= 3;
            }

            if (position >= 1 && position <= 3) {
                return true;
            }

            if (
                product.plan_code === 'home_12' &&
                position >= 4 &&
                position <= 8
            ) {
                return true;
            }

            if (
                product.plan_code === 'home_20' &&
                position >= 9 &&
                position <= 13
            ) {
                return true;
            }

            return false;
        })
        .map((row) => ({
            song_id: row.song_id,
            unlock_week: Number(row.unlock_week || 0),
            position: Number(row.position || 1)
        }));

    const bonusSongIds = unique(
        (bonusRows || []).map((row) => row.song_id)
    );

    const unlockedSongIds = unique([
        ...schedule
            .filter((row) => row.unlock_week <= unlockedWeek)
            .map((row) => row.song_id),
        ...bonusSongIds
    ]);

    const allSongIds = unique([
        ...schedule.map((row) => row.song_id),
        ...bonusSongIds
    ]);

    const nextTrack = schedule.find(
        (row) => row.unlock_week > unlockedWeek
    ) || null;

    const nextUnlockAt = nextTrack
        ? addDays(
            product.starts_at,
            Math.max(0, (nextTrack.unlock_week - 1) * 7)
        )
        : null;

    return {
        ...product,
        plan: product.plan_code,
        release_weeks_effective: releaseWeeks,
        product_type: 'home_package',
        provider: 'home_package',
        current_week: currentWeek,
        unlocked_week: unlockedWeek,
        unlocked_song_ids: unlockedSongIds,
        all_song_ids: allSongIds,
        bonus_song_ids: bonusSongIds,
        schedule,
        next_unlock_at: nextUnlockAt,
        next_unlock_week: nextTrack?.unlock_week ?? null,
        plan_label: homePackagePlanLabel(product.plan_code)
    };
}

export function mergeProductMemberships(songClubMembership, homePackage) {
    if (!songClubMembership && !homePackage) {
        return null;
    }

    const hasSongClub = Boolean(songClubMembership);
    const hasHomePackage = Boolean(homePackage);

    const base = hasSongClub
        ? { ...songClubMembership }
        : {
            id: homePackage.id,
            user_id: homePackage.user_id,
            plan: homePackage.plan_code,
            status: homePackage.status,
            starts_at: homePackage.starts_at,
            ends_at: homePackage.ends_at,
            provider: 'home_package',
            created_at: homePackage.created_at
        };

    return {
        ...base,
        product_type:
            hasSongClub && hasHomePackage
                ? 'combined'
                : hasHomePackage
                    ? 'home_package'
                    : 'song_club',
        song_club_active: hasSongClub,
        song_club_membership: songClubMembership || null,
        home_package_active: hasHomePackage,
        home_package: homePackage || null,
        home_package_program: homePackage?.program || null,
        home_package_plan: homePackage?.plan_code || null,
        home_package_plan_label: homePackage?.plan_label || null,
        home_package_release_weeks: homePackage?.release_weeks_effective || homePackage?.release_weeks || null,
        home_package_current_week: homePackage?.current_week ?? null,
        home_package_unlocked_week: homePackage?.unlocked_week ?? null,
        home_package_unlocked_song_ids:
            homePackage?.unlocked_song_ids || [],
        home_package_all_song_ids:
            homePackage?.all_song_ids || [],
        home_package_bonus_song_ids:
            homePackage?.bonus_song_ids || [],
        home_package_next_unlock_at:
            homePackage?.next_unlock_at || null
    };
}

export async function getHomePackageDashboard(db, homePackage) {
    if (!db || !homePackage) {
        return {
            baseSongs: [],
            weeklySongs: [],
            bonusSongs: [],
            nextSong: null,
            nextSongs: [],
            nextUnlockAt: null
        };
    }

    const songIds = unique(homePackage.all_song_ids || []);

    if (songIds.length === 0) {
        return {
            baseSongs: [],
            weeklySongs: [],
            bonusSongs: [],
            nextSong: null,
            nextSongs: [],
            nextUnlockAt: homePackage.next_unlock_at || null
        };
    }

    const {
        data: songRows,
        error: songError
    } = await db
        .from('ds_content_songs')
        .select(`
            id,
            slug,
            title,
            subtitle,
            program,
            category,
            emoji,
            release_date,
            is_published
        `)
        .in('id', songIds);

    if (songError) {
        console.error('home package dashboard song error:', songError);
        return {
            baseSongs: [],
            weeklySongs: [],
            bonusSongs: [],
            nextSong: null,
            nextSongs: [],
            nextUnlockAt: homePackage.next_unlock_at || null
        };
    }

    const byId = new Map(
        (songRows || []).map((row) => [row.id, row])
    );

    function toSong(track) {
        const row = byId.get(track.song_id);

        if (!row) {
            return null;
        }

        return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            subtitle: row.subtitle || '',
            program: row.program || '',
            category: row.category || '',
            emoji: row.emoji || '🎵',
            releaseDate: row.release_date || '',
            published: Boolean(row.is_published),
            songClubPublished: Boolean(row.is_published),
            unlockWeek: track.unlock_week,
            position: track.position,
            /*
             * Home Package 공개 여부는 ds_content_songs.is_published가 아니라
             * ds_home_package_tracks에 선택되어 있는지 + 주차가 열렸는지로 판단합니다.
             * 따라서 Song Club에서 비공개인 곡도 Home Package에 선택하면
             * Home Package 회원에게만 정상 노출됩니다.
             */
            ready: true
        };
    }

    const scheduleSongs = (homePackage.schedule || [])
        .map(toSong)
        .filter(Boolean);

    const unlockedIds = new Set(
        homePackage.unlocked_song_ids || []
    );

    const baseSongs = scheduleSongs.filter(
        (song) =>
            song.unlockWeek === 0 &&
            unlockedIds.has(song.id) &&
            song.ready
    );

    const weeklySongs = scheduleSongs.filter(
        (song) =>
            song.unlockWeek > 0 &&
            unlockedIds.has(song.id) &&
            song.ready
    );

    const bonusIds = new Set(
        homePackage.bonus_song_ids || []
    );

    const bonusSongs = unique(homePackage.bonus_song_ids || [])
        .map((songId) => byId.get(songId))
        .filter(Boolean)
        .map((row) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            subtitle: row.subtitle || '',
            program: row.program || '',
            category: row.category || '',
            emoji: row.emoji || '🎵',
            releaseDate: row.release_date || '',
            published: Boolean(row.is_published),
            songClubPublished: Boolean(row.is_published),
            bonus: true
        }))
        .filter((song) => bonusIds.has(song.id));

    const nextSong = scheduleSongs.find(
        (song) => song.unlockWeek > homePackage.unlocked_week
    ) || null;

    const nextSongs = nextSong
        ? scheduleSongs.filter(
            (song) =>
                song.unlockWeek === nextSong.unlockWeek
        )
        : [];

    return {
        baseSongs,
        weeklySongs,
        bonusSongs,
        nextSong,
        nextSongs,
        nextUnlockAt: homePackage.next_unlock_at || null
    };
}
