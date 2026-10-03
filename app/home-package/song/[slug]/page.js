import { Suspense } from 'react';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentMembership } from '../../../../lib/membership';
import { getRawSongBySlug } from '../../../../lib/content';

import AudioPlayer from '../../../../components/AudioPlayer';
import SongResourceBundleServer, {
    SongResourceFallback
} from '../../../../components/SongResourceBundleServer';

export const dynamic = 'force-dynamic';

export default async function HomePackageSongPage({ params }) {
    const { slug } = await params;

    /*
     * 회원권 확인과 곡 정보 조회를 동시에 시작합니다.
     * 곡 row는 공용 Data Cache를 사용해 상세 페이지 재방문 시 DB 재조회를 줄입니다.
     */
    const [
        membershipState,
        row
    ] = await Promise.all([
        getCurrentMembership({
            includeBillingProfile: false
        }),
        getRawSongBySlug(slug)
    ]);

    const {
        user,
        homePackage
    } = membershipState;

    if (!user) {
        redirect(
            `/login?next=/home-package/song/${encodeURIComponent(slug)}`
        );
    }

    if (!homePackage) {
        redirect('/home-package');
    }

    if (!row) {
        console.error('Home Package song not found:', slug);
        notFound();
    }

    const unlockedIds = Array.isArray(
        homePackage.unlocked_song_ids
    )
        ? homePackage.unlocked_song_ids
        : [];

    /*
     * Home Package는 Song Club 공개 여부와 무관하게
     * 해당 회원에게 실제로 열린 song_id인지로 접근을 허용합니다.
     */
    if (!unlockedIds.includes(row.id)) {
        return (
            <section className="section top-section">
                <Link
                    className="back-link"
                    href="/home-package"
                >
                    ← Home Package
                </Link>

                <div
                    className="content-card"
                    style={{
                        textAlign: 'center',
                        marginTop: 18
                    }}
                >
                    <div
                        style={{
                            fontSize: 42,
                            marginBottom: 10
                        }}
                    >
                        🔒
                    </div>

                    <h2>
                        아직 열리지 않은 노래예요
                    </h2>

                    <p className="page-copy">
                        Home Package 시작일과 주차에 맞춰 자동으로 공개됩니다.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="song-page">
            <Link
                className="back-link"
                href="/home-package"
            >
                ← Home Package
            </Link>

            <div className="song-cover large">
                <span>
                    {row.emoji || '🎵'}
                </span>
            </div>

            {row.program && (
                <p className="eyebrow">
                    {row.program}
                </p>
            )}

            {row.category && (
                <p
                    className="eyebrow"
                    style={{
                        marginTop: 4
                    }}
                >
                    {row.category}
                </p>
            )}

            <h1>
                {row.title}
            </h1>

            {row.subtitle && (
                <p className="page-copy">
                    {row.subtitle}
                </p>
            )}

            {/*
             * 기존 Home Package 상세화면은 페이지 진입 시 음원 signed URL까지
             * 기다렸습니다. 이제 재생 버튼을 누를 때만 음원 URL을 요청합니다.
             */}
            <AudioPlayer
                title={row.title}
                slug={row.slug}
            />

            {/*
             * 가사지/활동자료/놀이아이디어는 하나의 서버 Suspense 작업으로
             * 병렬 조회·일괄 서명하고 준비되는 즉시 스트리밍합니다.
             */}
            <Suspense
                fallback={
                    <SongResourceFallback scope="home-package" />
                }
            >
                <SongResourceBundleServer
                    song={row}
                    scope="home-package"
                />
            </Suspense>

            {Array.isArray(row.lyrics) &&
                row.lyrics.length > 0 && (
                    <section
                        className="content-card"
                        style={{
                            marginTop: 20
                        }}
                    >
                        <p className="eyebrow">
                            LYRICS
                        </p>

                        <h2>가사</h2>

                        <div className="lyrics">
                            {row.lyrics.map(
                                (line, index) => (
                                    <p key={index}>
                                        {line}
                                    </p>
                                )
                            )}
                        </div>
                    </section>
                )}

            {Array.isArray(row.activities) &&
                row.activities.length > 0 && (
                    <section
                        className="content-card"
                        style={{
                            marginTop: 20
                        }}
                    >
                        <p className="eyebrow">
                            HOME PACKAGE
                        </p>

                        <h2>
                            이 노래로 놀아요
                        </h2>

                        <div className="steps">
                            {row.activities.map(
                                (activity, index) => (
                                    <div
                                        className="step"
                                        key={`${row.slug}-${index}`}
                                    >
                                        <span>
                                            {index + 1}
                                        </span>

                                        <div>
                                            <strong>
                                                {activity.title}
                                            </strong>

                                            <p>
                                                {activity.description}
                                            </p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </section>
                )}
        </section>
    );
}
