import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentMembership } from '../../lib/membership';
import {
    getHomePackageDashboard,
    homePackagePlanLabel
} from '../../lib/home-package';
import { createAdminSupabase } from '../../lib/supabase-server';
import { todayKST } from '../../lib/release-date';

export const dynamic = 'force-dynamic';

function formatDate(value) {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(`${String(value).slice(0, 10)}T00:00:00+09:00`));
}

function daysUntil(value) {
    if (!value) {
        return null;
    }

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

function HomePackageSongCard({ song }) {
    return (
        <Link
            href={`/home-package/song/${encodeURIComponent(song.slug)}`}
            className="content-card"
            style={{
                display: 'grid',
                gridTemplateColumns: '76px minmax(0, 1fr)',
                gap: 14,
                alignItems: 'center',
                padding: 14,
                textDecoration: 'none',
                color: 'inherit'
            }}
        >
            <div
                style={{
                    width: 76,
                    height: 76,
                    borderRadius: 20,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(145deg,#fff6db,#fff0ee)',
                    fontSize: 36
                }}
            >
                {song.emoji || '🎵'}
            </div>

            <div style={{ minWidth: 0 }}>
                <p className="eyebrow" style={{ marginBottom: 5 }}>
                    {song.program || 'HOME PACKAGE'}
                </p>
                <strong
                    style={{
                        display: 'block',
                        fontSize: 17,
                        lineHeight: 1.4
                    }}
                >
                    {song.title}
                </strong>
                {song.subtitle && (
                    <span
                        className="muted"
                        style={{
                            display: 'block',
                            marginTop: 5,
                            fontSize: 12,
                            lineHeight: 1.5
                        }}
                    >
                        {song.subtitle}
                    </span>
                )}
            </div>
        </Link>
    );
}

function SongSection({ eyebrow, title, description, songs }) {
    if (!songs?.length) {
        return null;
    }

    return (
        <section className="section">
            <div className="section-head">
                <div>
                    <p className="eyebrow">{eyebrow}</p>
                    <h2>{title}</h2>
                    {description && (
                        <p className="muted" style={{ margin: '6px 0 0' }}>
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="card-grid">
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

export default async function HomePackagePage() {
    const {
        user,
        homePackage
    } = await getCurrentMembership();

    if (!user) {
        redirect('/login?next=/home-package');
    }

    if (!homePackage) {
        return (
            <section className="section top-section">
                <p className="eyebrow">DEAR SUNSHINE HOME PACKAGE</p>
                <h1>Home Package</h1>
                <div className="content-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 42, marginBottom: 10 }}>🏠</div>
                    <h2>등록된 Home Package가 없어요</h2>
                    <p className="page-copy">
                        Home Package를 구매한 계정이라면 센터에서 이용권 연결 후 바로 사용할 수 있어요.
                    </p>
                    <Link href="/my" className="primary-button">
                        MY 확인하기
                    </Link>
                </div>
            </section>
        );
    }

    const db = createAdminSupabase();
    const dashboard = await getHomePackageDashboard(db, homePackage);

    const storedReleaseWeeks = Number(homePackage.release_weeks_effective || homePackage.release_weeks || 0);
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

    return (
        <>
            <section className="hero">
                <div className="sun">🏠</div>
                <p className="eyebrow">DEAR SUNSHINE HOME PACKAGE</p>
                <h1>
                    수업에서 만난 영어를,
                    <br />
                    집에서도 자연스럽게 이어가요.
                </h1>
                <p className="hero-copy">
                    기본곡은 바로 듣고, 이후 각 주차에 지정된 노래가 열려요.
                </p>

                <div className="plan-pill">
                    🏠 {homePackagePlanLabel(homePackage.plan_code)} · {(homePackage.programs || [homePackage.program]).filter(Boolean).join(' + ')}
                </div>
            </section>

            <section className="section">
                <div className="content-card">
                    <p className="eyebrow">MY HOME PACKAGE</p>
                    <h2 style={{ marginBottom: 8 }}>
                        {currentWeek === 0
                            ? 'Home Package 시작'
                            : `Week ${currentWeek} of ${releaseWeeks}`}
                    </h2>
                    <p className="page-copy" style={{ marginTop: 0 }}>
                        시작일 {formatDate(homePackage.starts_at)} · 현재 {unlockedCount}곡 이용 가능
                    </p>

                    <div
                        style={{
                            height: 10,
                            borderRadius: 999,
                            background: '#f1e8dd',
                            overflow: 'hidden',
                            marginTop: 16
                        }}
                    >
                        <div
                            style={{
                                width: `${releaseWeeks > 0 ? Math.min(100, (currentWeek / releaseWeeks) * 100) : 0}%`,
                                height: '100%',
                                borderRadius: 999,
                                background: 'linear-gradient(90deg,#f7bd4d,#f29a73)'
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
                <section className="section">
                    <div className="section-head">
                        <div>
                            <p className="eyebrow">COMING NEXT</p>
                            <h2>다음에 열릴 노래</h2>
                            <p className="muted" style={{ margin: '6px 0 0' }}>
                                {dashboard.nextUnlockAt
                                    ? `${formatDate(dashboard.nextUnlockAt)}에 자동으로 열려요.`
                                    : '다음 공개를 준비하고 있어요.'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: 10 }}>
                        {dashboard.nextSongs.map((song) => (
                            <article
                                key={song.id || `${song.unlockWeek}-${song.position}`}
                                className="content-card"
                                style={{ padding: 16 }}
                            >
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '64px minmax(0,1fr)',
                                        gap: 14,
                                        alignItems: 'center'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 18,
                                            display: 'grid',
                                            placeItems: 'center',
                                            background: 'linear-gradient(145deg,#fff6db,#fff0ee)',
                                            fontSize: 32,
                                            position: 'relative'
                                        }}
                                    >
                                        {song.emoji || '🎵'}
                                        <span
                                            style={{
                                                position: 'absolute',
                                                right: -4,
                                                bottom: -4,
                                                fontSize: 18
                                            }}
                                        >
                                            🔒
                                        </span>
                                    </div>
                                    <div>
                                        <strong style={{ display: 'block', fontSize: 16 }}>
                                            {song.title}
                                        </strong>
                                        <span className="muted" style={{ fontSize: 12 }}>
                                            Week {song.unlockWeek}
                                            {nextDays !== null ? ` · ${nextDays}일 후 오픈` : ''}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            ) : (
                <section className="section">
                    <div className="content-card" style={{ textAlign: 'center' }}>
                        <p className="eyebrow">HOME PACKAGE</p>
                        <h2>현재 예정된 곡을 모두 받았어요 🎉</h2>
                        <p className="page-copy">
                            지금까지 열린 노래는 계속 다시 들을 수 있어요.
                        </p>
                    </div>
                </section>
            )}

            <div style={{ padding: '0 18px 36px' }}>
                <Link href="/my" className="secondary-button wide">
                    MY로 돌아가기
                </Link>
            </div>
        </>
    );
}
