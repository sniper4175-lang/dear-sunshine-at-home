import Link from 'next/link';

function monthKeyKST() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit'
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;

    return `${year}-${month}`;
}

function dateOnly(value) {
    return value ? String(value).slice(0, 10) : '';
}

function formatDate(value) {
    const raw = dateOnly(value);
    if (!raw) return '';

    const [year, month, day] = raw.split('-').map(Number);
    if (!year || !month || !day) return '';

    return `${year}년 ${month}월 ${day}일까지`;
}

function accessStart(membership) {
    return (
        membership?.current_period_start ||
        membership?.trial_starts_at ||
        membership?.starts_at ||
        ''
    );
}

function accessEnd(membership) {
    if (!membership) return '';

    if (membership.status === 'trialing') {
        return (
            membership.trial_ends_at ||
            membership.current_period_end ||
            membership.ends_at ||
            ''
        );
    }

    return (
        membership.current_period_end ||
        membership.ends_at ||
        membership.trial_ends_at ||
        ''
    );
}

function progressPercent(membership) {
    const start = dateOnly(accessStart(membership));
    const end = dateOnly(accessEnd(membership));

    if (!start || !end) return null;

    const startMs = new Date(`${start}T00:00:00+09:00`).getTime();
    const endMs = new Date(`${end}T23:59:59+09:00`).getTime();
    const nowMs = Date.now();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null;
    }

    return Math.max(
        0,
        Math.min(
            100,
            ((nowMs - startMs) / (endMs - startMs)) * 100
        )
    );
}

function SongClubSongCard({ song }) {
    return (
        <Link
            href={`/song/${encodeURIComponent(song.slug)}`}
            className="content-card home-package-song-card song-club-home-song-card"
            style={{ position: 'relative' }}
        >
            {song.popular ? (
                <span
                    className="song-club-popular-badge"
                    style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        zIndex: 2,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: '#fff3c4',
                        border: '1px solid #f4cd69',
                        color: '#9a6500',
                        fontSize: 10,
                        fontWeight: 800,
                        lineHeight: 1.2
                    }}
                >
                    인기곡
                </span>
            ) : null}

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

function SongSection({ eyebrow, title, description, songs, emptyText }) {
    return (
        <section className="section home-song-section song-club-home-section">
            <div className="section-head home-section-head">
                <div>
                    <p className="eyebrow">{eyebrow}</p>
                    <h2>{title}</h2>
                    {description ? (
                        <p className="muted home-section-description">
                            {description}
                        </p>
                    ) : null}
                </div>
            </div>

            {songs?.length ? (
                <div className="card-grid home-song-grid">
                    {songs.map((song) => (
                        <SongClubSongCard
                            key={song.id || song.slug}
                            song={song}
                        />
                    ))}
                </div>
            ) : (
                <div className="content-card song-club-empty-card">
                    <p className="muted">{emptyText}</p>
                </div>
            )}
        </section>
    );
}

function upcomingDateLabel(value) {
    const raw = dateOnly(value);
    if (!raw) return '공개 예정';

    const [, month, day] = raw.split('-').map(Number);
    if (!month || !day) return '공개 예정';

    return `${month}월 ${day}일 공개 예정`;
}

function UpcomingSection({ songs = [] }) {
    if (!songs.length) {
        return (
            <section className="section home-next-section song-club-home-section">
                <div className="section-head home-section-head">
                    <div>
                        <p className="eyebrow">COMING UP NEXT</p>
                        <h2><span className="home-section-icon">✨</span>다음에 만나요</h2>
                        <p className="muted home-section-description">
                            곧 공개될 노래를 미리 만나보세요.
                        </p>
                    </div>
                </div>

                <div className="content-card song-club-empty-card">
                    <p className="muted">다음 공개곡을 준비하고 있어요.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="section home-next-section song-club-home-section">
            <div className="section-head home-section-head">
                <div>
                    <p className="eyebrow">COMING UP NEXT</p>
                    <h2><span className="home-section-icon">✨</span>다음에 만나요</h2>
                    <p className="muted home-section-description">
                        곧 공개될 노래를 미리 만나보세요.
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

export default function SongClubHome({
    membership,
    songs = [],
    userPrograms = [],
    upcomingSongs = []
}) {
    const currentMonthKey = monthKeyKST();

    /*
     * 관리자 콘텐츠 관리에서 '기본곡'으로 체크한 공개곡만 표시합니다.
     * DB의 is_basic 컬럼을 사용하므로 인기곡(is_popular)과 별개로 관리됩니다.
     */
    const basicSongs = songs
        .filter((song) => Boolean(song?.basic))
        .sort((a, b) => {
            const dateA = a.releaseDate || '9999-12-31';
            const dateB = b.releaseDate || '9999-12-31';

            if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
            }

            return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
        });

    const basicSongKeys = new Set(
        basicSongs.map((song) => song.id || song.slug)
    );

    /*
     * 기본곡으로 지정된 곡은 같은 달에 공개됐더라도
     * 홈에서 중복 노출되지 않도록 '이번 달 곡'에서는 제외합니다.
     */
    const currentMonthSongs = songs
        .filter(
            (song) =>
                song.releaseDate &&
                String(song.releaseDate).startsWith(currentMonthKey) &&
                !basicSongKeys.has(song.id || song.slug)
        );

    const endLabel = formatDate(accessEnd(membership));
    const progress = progressPercent(membership);

    const programs = (userPrograms || []).filter(Boolean);
    const programText = programs.length > 0
        ? programs.join(' · ')
        : '연결된 클래스 확인 중';

    const statusLabel = membership?.status === 'trialing'
        ? 'TRIAL'
        : membership?.cancel_at_period_end
            ? 'ENDING'
            : 'ACTIVE';

    return (
        <div className="ds-home-package-mobile ds-song-club-home">
            <header className="ds-mobile-brand">
                <span className="ds-mobile-brand-sun">☀️</span>
                <span>
                    <strong>Dear Sunshine</strong>
                    <small>Sing · Play · Grow</small>
                </span>
            </header>

            <section className="home-welcome-card song-club-welcome-card">
                <div className="home-welcome-copy">
                    <p className="eyebrow">DEAR SUNSHINE SONG CLUB</p>
                    <h1>Hello<br />SunShine!</h1>
                    <p>
                        오늘도 신나는 노래와 함께<br />
                        즐겁게 놀아요! 🎵
                    </p>
                </div>

                <div className="home-welcome-sun song-club-welcome-sun" aria-hidden="true">
                    <span>☀️</span>
                    <i>♡</i>
                    <b>♫</b>
                </div>
            </section>

            <section className="section home-package-status-wrap">
                <div className="content-card home-package-status-card song-club-status-card">
                    <div>
                        <p className="eyebrow">MY SONG CLUB</p>
                        <h2>Monthly Song Club</h2>
                        <p className="muted">
                            {programText}
                            {programs.length > 1
                                ? ` (${programs.length}개 클래스 이용 중)`
                                : programs.length === 1
                                    ? ' 이용 중'
                                    : ''}
                        </p>
                    </div>

                    <div className="home-package-status-meta song-club-status-meta">
                        <span>{statusLabel}</span>
                        {endLabel ? <small>{endLabel}</small> : null}
                    </div>

                    {progress !== null ? (
                        <div className="home-package-progress" aria-label="Song Club 이용 기간">
                            <span style={{ width: `${progress}%` }} />
                        </div>
                    ) : null}
                </div>
            </section>

            <SongSection
                eyebrow="BASIC SONGS"
                title="🎵 처음부터 함께하는 기본곡"
                description="Song Club 이용을 시작하면 바로 들을 수 있는 기본곡이에요."
                songs={basicSongs}
                emptyText="관리자에서 기본곡을 지정해주세요."
            />

            <SongSection
                eyebrow="THIS MONTH'S SONGS"
                title="🗓️ 이번 달 곡"
                description="이번 달에 새롭게 공개된 노래예요."
                songs={currentMonthSongs}
                emptyText="이번 달에 공개된 노래가 아직 없어요."
            />

            <UpcomingSection songs={upcomingSongs} />
        </div>
    );
}
