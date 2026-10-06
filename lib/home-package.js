import { todayKST } from './release-date';
import { getSongRowsByIds } from './content';

const DAY_MS = 24 * 60 * 60 * 1000;

const HOME_PACKAGE_DURATION_WEEKS = {
    home_8: 10,
    home_12: 15,
    home_20: 25
};

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

function mondayOf(value) {
    const date = parseDateOnly(value);

    if (!date) {
        return null;
    }

    const weekday = date.getUTCDay();
    date.setUTCDate(
        date.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday)
    );

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function weeksBetweenMondays(startValue, endValue) {
    const startMonday = parseDateOnly(mondayOf(startValue));
    const endMonday = parseDateOnly(mondayOf(endValue));

    if (!startMonday || !endMonday) {
        return 0;
    }

    return Math.max(
        0,
        Math.floor((endMonday.getTime() - startMonday.getTime()) / (DAY_MS * 7))
    );
}

function planDurationWeeks(planCode) {
    return Number(HOME_PACKAGE_DURATION_WEEKS[planCode] || 0);
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

    const {
        data: programRows,
        error: programError
    } = await db
        .from('ds_home_package_user_programs')
        .select('program')
        .eq('product_id', product.id);

    if (programError) {
        console.error('home package program lookup error:', programError);
        return null;
    }

    const programs = unique([
        ...(programRows || []).map((row) => row.program),
        product.program
    ]);

    const storedReleaseWeeks = Number(product.release_weeks || 0);
    const legacyReleaseWeeks =
        product.plan_code === 'home_20'
            ? Math.max(21, storedReleaseWeeks)
            : storedReleaseWeeks;

    const durationWeeks =
        planDurationWeeks(product.plan_code) ||
        legacyReleaseWeeks ||
        1;

    const startMonday = mondayOf(product.starts_at);

    /*
     * 주차 기준은 활성화일 자체가 아니라 "활성화일이 포함된 월요일"입니다.
     * 예: 수요일 활성화 -> 그 주 월요일이 1주차 시작.
     * 다음 월요일이 되면 자동으로 2주차가 됩니다.
     */
    const currentWeek = Math.max(
        1,
        weeksBetweenMondays(product.starts_at, today) + 1
    );

    /*
     * 기본곡(기존 공용 테이블), 회원별 달력 주차곡, 계정 보너스곡을
     * 동시에 조회합니다.
     */
    const [
        trackResult,
        productTrackResult,
        scheduleSettingsResult,
        bonusResult
    ] = await Promise.all([
        db
            .from('ds_home_package_tracks')
            .select('program,song_id,unlock_week,position')
            .in('program', programs)
            .lte('unlock_week', Math.max(21, legacyReleaseWeeks || 0))
            .order('unlock_week', { ascending: true })
            .order('position', { ascending: true }),

        db
            .from('ds_home_package_product_tracks')
            .select('product_id,program,song_id,week_start,position')
            .eq('product_id', product.id)
            .in('program', programs)
            .order('week_start', { ascending: true })
            .order('position', { ascending: true }),

        db
            .from('ds_home_package_product_schedule_settings')
            .select('enabled')
            .eq('product_id', product.id)
            .maybeSingle(),

        db
            .from('ds_user_product_bonus_songs')
            .select('song_id')
            .eq('product_id', product.id)
    ]);

    const {
        data: trackRows,
        error: trackError
    } = trackResult;

    const {
        data: productTrackRows,
        error: productTrackError
    } = productTrackResult;

    const {
        data: scheduleSettings,
        error: scheduleSettingsError
    } = scheduleSettingsResult;

    const {
        data: bonusRows,
        error: bonusError
    } = bonusResult;

    if (trackError) {
        console.error('home package track lookup error:', trackError);
        return null;
    }

    const productTrackTableReady =
        !productTrackError;

    const scheduleSettingsReady =
        !scheduleSettingsError;

    const calendarScheduleEnabled =
        scheduleSettingsReady &&
        Boolean(scheduleSettings?.enabled);

    if (
        scheduleSettingsError &&
        !['42P01', 'PGRST205'].includes(
            String(scheduleSettingsError.code || '')
        )
    ) {
        console.error(
            'home package schedule settings lookup error:',
            scheduleSettingsError
        );
    }

    if (
        productTrackError &&
        !['42P01', 'PGRST205'].includes(
            String(productTrackError.code || '')
        )
    ) {
        console.error(
            'home package product track lookup error:',
            productTrackError
        );
    }

    if (bonusError) {
        console.error('home package bonus lookup error:', bonusError);
    }

    /*
     * 공통 기본곡은 기존 ds_home_package_tracks의 unlock_week=0을 유지합니다.
     * 주차별 곡은 새 회원별 달력 테이블에 데이터가 있으면 그 일정을 우선합니다.
     * 새 일정이 아직 없는 기존 회원은 과거 unlock_week 방식으로 fallback 합니다.
     */
    const baseSchedule = (trackRows || [])
        .filter((row) => {
            const unlockWeek = Number(row.unlock_week || 0);
            const position = Number(row.position || 1);

            if (unlockWeek !== 0) {
                return false;
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
            program: row.program,
            song_id: row.song_id,
            unlock_week: 0,
            position: Number(row.position || 1),
            week_start: null
        }));

    const validCalendarRows = (productTrackRows || [])
        .map((row) => {
            const weekStart = String(row.week_start || '').slice(0, 10);
            const unlockWeek = startMonday && weekStart
                ? weeksBetweenMondays(startMonday, weekStart) + 1
                : 0;

            return {
                program: row.program,
                song_id: row.song_id,
                unlock_week: unlockWeek,
                position: Number(row.position || 1),
                week_start: weekStart
            };
        })
        .filter((row) =>
            row.unlock_week >= 1 &&
            row.unlock_week <= durationWeeks &&
            row.position >= 1 &&
            row.position <= 3
        );

    const hasCalendarSchedule =
        productTrackTableReady &&
        calendarScheduleEnabled;

    const legacyWeeklySchedule = (trackRows || [])
        .filter((row) => {
            const unlockWeek = Number(row.unlock_week || 0);
            const position = Number(row.position || 1);
            return (
                unlockWeek > 0 &&
                unlockWeek <= legacyReleaseWeeks &&
                position >= 1 &&
                position <= 3
            );
        })
        .map((row) => ({
            program: row.program,
            song_id: row.song_id,
            unlock_week: Number(row.unlock_week || 0),
            position: Number(row.position || 1),
            week_start: null
        }));

    const weeklySchedule = hasCalendarSchedule
        ? validCalendarRows
        : legacyWeeklySchedule;

    const schedule = [
        ...baseSchedule,
        ...weeklySchedule
    ].sort((a, b) =>
        a.unlock_week - b.unlock_week ||
        a.position - b.position
    );

    const releaseWeeks = hasCalendarSchedule
        ? durationWeeks
        : Math.max(1, legacyReleaseWeeks || durationWeeks);

    const unlockedWeek = Math.min(currentWeek, releaseWeeks);

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
        ? (
            nextTrack.week_start ||
            addDays(
                startMonday || product.starts_at,
                Math.max(0, (nextTrack.unlock_week - 1) * 7)
            )
        )
        : null;

    return {
        ...product,
        plan: product.plan_code,
        programs,
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
        schedule_mode: hasCalendarSchedule ? 'calendar' : 'legacy',
        schedule_start_monday: startMonday,
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
        home_package_programs: homePackage?.programs || (homePackage?.program ? [homePackage.program] : []),
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

    /*
     * 같은 Home Package 홈을 다시 열 때 곡 메타데이터를 매번 DB에서
     * 재조회하지 않고 공용 콘텐츠 캐시를 재사용합니다.
     */
    const songRows =
        await getSongRowsByIds(songIds);

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
