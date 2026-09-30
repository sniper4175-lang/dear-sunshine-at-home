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

function pickWelcomeSongs(songs) {
    const source = (songs || []).filter((song) => song?.slug);
    const selected = [];
    const used = new Set();

    const priorities = [
        /hello/i,
        /weather/i,
        /goodbye/i
    ];

    priorities.forEach((matcher) => {
        const found = source.find(
            (song) =>
                !used.has(song.id || song.slug) &&
                matcher.test(String(song.title || ''))
        );

        if (found) {
            selected.push(found);
            used.add(found.id || found.slug);
        }
    });

    const oldest = [...source].sort((a, b) => {
        const dateA = a.releaseDate || '9999-12-31';
        const dateB = b.releaseDate || '9999-12-31';

        if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
        }

        return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
    });

    for (const song of oldest) {
        if (selected.length >= 3) break;

        const key = song.id || song.slug;
        if (used.has(key)) continue;

        selected.push(song);
        used.add(key);
    }

    return selected.slice(0, 3);
}

function SongClubSongCard({ song }) {
    return (
        <Link
            href={`/song/${encodeURIComponent(song.slug)}`}
            className="content-card home-package-song-card song-club-home-song-card"
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

const CATEGORY_TILES = [
    {
        icon: '🍎',
        title: 'Fruits',
        subtitle: '과일',
        category: '과일',
        tone: 'pink'
    },
    {
        icon: '☀️',
        title: 'Weather',
        subtitle: '날씨',
        category: '날씨',
        tone: 'yellow'
    },
    {
        icon: '🐿️',
        title: 'Animals',
        subtitle: '동물',
        category: '동물',
        tone: 'peach'
    },
    {
        icon: '🍂',
        title: 'Seasons',
        subtitle: '계절',
        category: '계절',
        tone: 'green'
    },
    {
        icon: '⭐',
        title: 'Daily Life',
        subtitle: '생활영어',
        category: '생활영어',
        tone: 'purple'
    }
];

export default function SongClubHome({
    membership,
    songs = [],
    userPrograms = []
}) {
    const currentMonthKey = monthKeyKST();

    const currentMonthSongs = songs
        .filter(
            (song) =>
                song.releaseDate &&
                String(song.releaseDate).startsWith(currentMonthKey)
        )
        .slice(0, 3);

    const welcomeSongs = pickWelcomeSongs(songs);
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
                eyebrow="WELCOME SONGS"
                title="🎵 처음부터 함께하는 기본곡"
                description="Song Club에서 오래 사랑받은 노래들을 만나보세요."
                songs={welcomeSongs}
                emptyText="기본곡을 준비하고 있어요."
            />

            <SongSection
                eyebrow="THIS MONTH'S SONGS"
                title="🗓️ 이번 달 신규곡"
                description="이번 달에 새롭게 추가된 노래예요."
                songs={currentMonthSongs}
                emptyText="이번 달 신규곡을 준비하고 있어요."
            />

            <section className="section song-club-all-songs-section">
                <div className="section-head home-section-head">
                    <div>
                        <p className="eyebrow">ALL SONGS</p>
                        <h2>📁 전체 노래</h2>
                        <p className="muted home-section-description">
                            주제별로 다양한 노래를 들어보세요.
                        </p>
                    </div>
                </div>

                <div className="song-club-category-grid">
                    {CATEGORY_TILES.map((item) => (
                        <Link
                            key={item.title}
                            href={`/library?category=${encodeURIComponent(item.category)}`}
                            className={`song-club-category-card tone-${item.tone}`}
                        >
                            <span className="song-club-category-icon" aria-hidden="true">
                                {item.icon}
                            </span>
                            <strong>{item.title}</strong>
                            <small>{item.subtitle}</small>
                            <em aria-hidden="true">›</em>
                        </Link>
                    ))}

                    <Link
                        href="/library"
                        className="song-club-category-card tone-blue"
                    >
                        <span className="song-club-category-icon" aria-hidden="true">
                            🎵
                        </span>
                        <strong>All Songs</strong>
                        <small>전체 보기</small>
                        <em aria-hidden="true">›</em>
                    </Link>
                </div>
            </section>
        </div>
    );
}
