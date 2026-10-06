import Link from 'next/link';

import {
    getHomePackageDashboard,
    homePackagePlanLabel
} from '../lib/home-package';
import { createAdminSupabase } from '../lib/supabase-server';
import { todayKST } from '../lib/release-date';

function formatDate(value) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(`${String(value).slice(0, 10)}T00:00:00+09:00`));
}

function daysUntil(value) {
    if (!value) return null;

    const toUtc = (dateValue) => {
        const [year, month, day] = String(dateValue)
            .slice(0, 10)
            .split('-')
            .map(Number);

        return Date.UTC(year, month - 1, day);
    };

    return Math.max(
        0,
        Math.ceil(
            (toUtc(value) - toUtc(todayKST())) /
            (24 * 60 * 60 * 1000)
        )
    );
}

function sectionIcon(eyebrow) {
    if (eyebrow === 'WELCOME SONGS') return '🎵';
    if (eyebrow === 'YOUR NEW SONGS') return '🌱';
    if (eyebrow === 'BONUS SONGS') return '🎁';
    return '🎶';
}

function HomePackageSongCard({ song }) {
    return (
        <Link
            href={`/home-package/song/${encodeURIComponent(song.slug)}`}
            className="content-card home-package-song-card"
        >
            <div className="home-song-art">
                {song.emoji || '🎵'}
            </div>

            <div className="home-song-copy">
                <p className="eyebrow">
                    {song.program || 'HOME PACKAGE'}
                </p>
                <strong>{song.title}</strong>
                <span className="muted">
                    {song.category || song.subtitle || 'Dear Sunshine Song'}
                </span>
            </div>

            <span className="home-song-play" aria-hidden="true">
                ▶
            </span>
        </Link>
    );
}

function SongSection({ eyebrow, title, description, songs }) {
    if (!songs?.length) return null;

    return (
        <section className="section home-song-section">
            <div className="section-head home-section-head">
                <div>
                    <p className="eyebrow">{eyebrow}</p>
                    <h2>
                        <span className="home-section-icon" aria-hidden="true">
                            {sectionIcon(eyebrow)}
                        </span>
                        {title}
                    </h2>
                    {description && (
                        <p className="muted home-section-description">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="card-grid home-song-grid">
                {songs.map((song) => (
                    <HomePackageSongCard
                        key={song.id || song.slug}
                        song={song}
                    />
                ))}
            </div>
        </section>
    );
}

function SongClubOnlySongCard({ song }) {
    return (
        <Link
            href={`/song/${encodeURIComponent(song.slug)}`}
            className="content-card home-package-song-card"
        >
            <div className="home-song-art">
                {song.emoji || '🎵'}
            </div>

            <div className="home-song-copy">
                <p className="eyebrow">
                    {song.program || 'SONG CLUB'}
                </p>
                <strong>{song.title}</strong>
                <span className="muted">
                    {song.category || song.subtitle || 'Dear Sunshine Song'}
                </span>
            </div>

            <span className="home-song-play" aria-hidden="true">
                ▶
            </span>
        </Link>
    );
}

function SongClubOnlySection({ songs = [] }) {
    if (!songs.length) return null;

    return (
        <section className="section home-song-section">
            <div className="section-head home-section-head">
                <div>
                    <p className="eyebrow">SONG CLUB · THIS MONTH</p>
                    <h2>
                        <span className="home-section-icon" aria-hidden="true">
                            ☀️
                        </span>
                        Song Club 이번 달 곡
                    </h2>
                    <p className="muted home-section-description">
                        Home Package에 포함되지 않은 Song Club 전용 곡이에요.
                    </p>
                </div>
            </div>

            <div className="card-grid home-song-grid">
                {songs.map((song) => (
                    <SongClubOnlySongCard
                        key={song.id || song.slug}
                        song={song}
                    />
                ))}
            </div>
        </section>
    );
}

function upcomingDateLabel(value) {
    if (!value) return '공개 예정';

    const raw = String(value).slice(0, 10);
    const [, month, day] = raw.split('-').map(Number);

    if (!month || !day) return '공개 예정';

    return `${month}월 ${day}일 공개 예정`;
}

function SongClubUpcomingSection({ songs = [] }) {
    if (!songs.length) return null;

    return (
        <section className="section home-next-section">
            <div className="section-head home-section-head">
                <div>
                    <p className="eyebrow">SONG CLUB · COMING UP NEXT</p>
                    <h2>
                        <span className="home-section-icon">✨</span>
                        Song Club 다음에 만나요
                    </h2>
                    <p className="muted home-section-description">
                        Home Package와 겹치지 않는 Song Club 공개 예정곡이에요.
                    </p>
                </div>
            </div>

            <div className="home-next-list">
                {songs.map((song) => (
                    <article
                        key={song.id || song.slug}
                        className="content-card home-next-card"
                    >
                        <div className="home-song-art muted-art">
                            {song.emoji || '🎵'}
                            <span className="home-lock">✨</span>
                        </div>

                        <div className="home-song-copy">
                            <p className="eyebrow">
                                {song.program || 'SONG CLUB'}
                            </p>
                            <strong>{song.title}</strong>
                            <span className="muted">
                                {upcomingDateLabel(song.releaseDate)}
                                {song.category ? ` · ${song.category}` : ''}
                            </span>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default async function HomePackageHome({
    homePackage,
    songClubCurrentMonthSongs = [],
    songClubUpcomingSongs = []
}) {
    const db = createAdminSupabase();
    const dashboard = await getHomePackageDashboard(db, homePackage);

    /*
     * ==============================================
     * Home Package + Song Club 동시 이용 시 노출 우선순위
     * ==============================================
     *
     * 1. 현재 Home Package 홈에 실제로 표시되는 곡을 먼저 보여줍니다.
     *    - 기본곡
     *    - 현재까지 열린 주차곡
     *    - 보너스곡
     *    - 바로 다음에 열릴 곡
     *
     * 2. 위 Home Package 영역과 같은 곡이 Song Club에도 있으면
     *    Song Club 섹션에서는 중복 표시하지 않습니다.
     *
     * 3. 단, Home Package의 '미래 주차'에 예약만 되어 있고
     *    현재 Home Package 홈에는 아직 표시되지 않는 곡이라면,
     *    Song Club에서 현재 이용 가능한 곡은 숨기지 않습니다.
     *
     * 이렇게 해야 Home Package 우선 원칙을 지키면서도
     * Song Club 전용/현재 이용 가능 곡이 홈에서 사라지지 않습니다.
     */
    const homePackageVisibleSongIds = new Set(
        [
            ...(dashboard.baseSongs || []),
            ...(dashboard.weeklySongs || []),
            ...(dashboard.bonusSongs || []),
            ...(dashboard.nextSongs || [])
        ]
            .map((song) => song?.id)
            .filter(Boolean)
    );

    const visibleSongClubCurrentMonthSongs =
        (songClubCurrentMonthSongs || [])
            .filter(
                (song) =>
                    !song?.id ||
                    !homePackageVisibleSongIds.has(song.id)
            )
            .slice(0, 4);

    const visibleSongClubUpcomingSongs =
        (songClubUpcomingSongs || [])
            .filter(
                (song) =>
                    !song?.id ||
                    !homePackageVisibleSongIds.has(song.id)
            )
            .slice(0, 4);

    const storedReleaseWeeks = Number(
        homePackage.release_weeks_effective ||
        homePackage.release_weeks ||
        0
    );

    const releaseWeeks =
        homePackage.plan_code === 'home_20'
            ? Math.max(21, storedReleaseWeeks)
            : storedReleaseWeeks;

    const currentWeek = Math.min(
        Number(homePackage.current_week || 0),
        releaseWeeks
    );

    const unlockedCount =
        dashboard.baseSongs.length +
        dashboard.weeklySongs.length +
        dashboard.bonusSongs.length;

    const nextDays = daysUntil(dashboard.nextUnlockAt);
    const programs = (homePackage.programs || [homePackage.program])
        .filter(Boolean)
        .join(' + ');

    return (
        <div className="ds-home-package-mobile">
            <header className="ds-mobile-brand">
                <span className="ds-mobile-brand-sun">☀️</span>
                <span>
                    <strong>Dear Sunshine</strong>
                    <small>Sing · Play · Grow</small>
                </span>
            </header>

            <section className="home-welcome-card">
                <div className="home-welcome-copy">
                    <p className="eyebrow">DEAR SUNSHINE HOME</p>
                    <h1>Hello<br />SunShine!</h1>
                    <p>
                        오늘도 신나게 노래하며<br />
                        함께 자라요! 🌈
                    </p>
                </div>

                <div className="home-welcome-sun" aria-hidden="true">
                    <span>☀️</span>
                    <i>♡</i>
                </div>
            </section>

            <section className="section home-package-status-wrap">
                <div className="content-card home-package-status-card">
                    <div>
                        <p className="eyebrow">MY HOME PACKAGE</p>
                        <h2>
                            {homePackagePlanLabel(homePackage.plan_code)}
                        </h2>
                        <p className="muted">
                            {programs} · 현재 {unlockedCount}곡 이용 가능
                        </p>
                    </div>

                    <div className="home-package-status-meta">
                        <span>
                            {currentWeek === 0
                                ? 'START'
                                : `WEEK ${currentWeek}`}
                        </span>
                        <small>
                            {formatDate(homePackage.starts_at)} 시작
                        </small>
                    </div>

                    <div className="home-package-progress" aria-label="Home Package progress">
                        <span
                            style={{
                                width: `${releaseWeeks > 0
                                    ? Math.min(100, (currentWeek / releaseWeeks) * 100)
                                    : 0}%`
                            }}
                        />
                    </div>
                </div>
            </section>

            <SongSection
                eyebrow="WELCOME SONGS"
                title="처음부터 함께하는 기본곡"
                description="Home Package를 시작하면 바로 열리는 노래예요."
                songs={dashboard.baseSongs}
            />

            <SongSection
                eyebrow="YOUR NEW SONGS"
                title="지금까지 열린 신곡"
                description="시작일을 기준으로 주차별로 지정된 노래가 차례로 열려요."
                songs={dashboard.weeklySongs}
            />

            <SongSection
                eyebrow="BONUS SONGS"
                title="보너스곡"
                description="회원에게 추가로 선물된 곡이에요."
                songs={dashboard.bonusSongs}
            />

            {dashboard.nextSongs?.length ? (
                <section className="section home-next-section">
                    <div className="section-head home-section-head">
                        <div>
                            <p className="eyebrow">COMING NEXT</p>
                            <h2><span className="home-section-icon">✨</span>다음에 열릴 노래</h2>
                            <p className="muted home-section-description">
                                {dashboard.nextUnlockAt
                                    ? `${formatDate(dashboard.nextUnlockAt)}에 자동으로 열려요.`
                                    : '다음 공개를 준비하고 있어요.'}
                            </p>
                        </div>
                    </div>

                    <div className="home-next-list">
                        {dashboard.nextSongs.map((song) => (
                            <article
                                key={song.id || `${song.unlockWeek}-${song.position}`}
                                className="content-card home-next-card"
                            >
                                <div className="home-song-art muted-art">
                                    {song.emoji || '🎵'}
                                    <span className="home-lock">🔒</span>
                                </div>
                                <div className="home-song-copy">
                                    <strong>{song.title}</strong>
                                    <span className="muted">
                                        Week {song.unlockWeek}
                                        {nextDays !== null ? ` · ${nextDays}일 후 오픈` : ''}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}

            <SongClubOnlySection
                songs={visibleSongClubCurrentMonthSongs}
            />

            <SongClubUpcomingSection
                songs={visibleSongClubUpcomingSongs}
            />

            <section className="home-cheer-banner" aria-label="Dear Sunshine message">
                <div>
                    <strong>노래는 놀이가 되고,</strong>
                    <strong>놀이는 영어가 돼요!</strong>
                </div>
                <span className="home-cheer-heart">♡</span>
                <span className="home-cheer-bear">🧸</span>
            </section>

            <div className="home-my-link-wrap">
                <Link href="/my" className="secondary-button wide">
                    MY로 돌아가기
                </Link>
            </div>
        </div>
    );
}
