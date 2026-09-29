import { Suspense } from 'react';

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import { getSongBySlug } from '../../../lib/content';
import { getCurrentMembership } from '../../../lib/membership';
import { canAccessSong } from '../../../lib/content-access';
import { createAdminSupabase } from '../../../lib/supabase-server';
import { getUserPrograms } from '../../../lib/program-access';

import AudioPlayer from '../../../components/AudioPlayer';
import SongResourceBundleServer, {
    SongResourceFallback
} from '../../../components/SongResourceBundleServer';

export const dynamic = 'force-dynamic';


function mapRawSong(row) {
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
        audioPath: row.audio_path || '',
        lyricsPath: row.lyrics_path || '',
        printablePath: row.printable_path || '',
        playIdeasPath: row.play_ideas_path || '',
        lyrics: Array.isArray(row.lyrics) ? row.lyrics : [],
        activities: Array.isArray(row.activities) ? row.activities : [],
        popular: Boolean(row.is_popular),
        premiumOnly: Boolean(row.premium_only),
        published: Boolean(row.is_published),
        isPublished: Boolean(row.is_published),
        releaseDate: row.release_date || ''
    };
}

export default async function SongPage({ params }) {
    const { slug } = await params;

    /*
     * 중요: /song/[slug]는 원래 Song Club 공개곡용 주소입니다.
     * 하지만 Home Package 카드/오래된 링크가 이 주소로 들어오는 경우에도
     * Song Club 비공개곡이 404가 되지 않도록 먼저 원본 곡 ID를 확인합니다.
     *
     * 현재 Home Package에서 이미 열린 song_id라면 is_published와 관계없이
     * 전용 상세페이지로 즉시 이동합니다.
     */
    const db = createAdminSupabase();

    const [
        song,
        membershipState,
        rawSongResult
    ] = await Promise.all([
        getSongBySlug(slug),
        getCurrentMembership({
            includeBillingProfile: false
        }),
        db
            .from('ds_content_songs')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()
    ]);

    const {
        user,
        membership
    } = membershipState;

    const homePackageUnlockedSongIds =
        Array.isArray(
            membership?.home_package_unlocked_song_ids
        )
            ? membership.home_package_unlocked_song_ids
            : [];

    const accountBonusSongIds =
        Array.isArray(
            membership?.account_bonus_song_ids
        )
            ? membership.account_bonus_song_ids
            : [];

    const rawSong =
        rawSongResult?.data ||
        null;

    if (
        user &&
        rawSong?.id &&
        homePackageUnlockedSongIds.includes(
            rawSong.id
        )
    ) {
        redirect(
            `/home-package/song/${encodeURIComponent(
                rawSong.slug || slug
            )}`
        );
    }

    const allowedByAccountBonus =
        Boolean(
            user &&
            rawSong?.id &&
            accountBonusSongIds.includes(rawSong.id)
        );

    /*
     * Song Club 비공개곡이라도 관리자가 이 이메일 계정에 직접 지급한
     * 추가곡이면 원본 row로 상세페이지를 열 수 있습니다.
     */
    const effectiveSong =
        song ||
        (
            allowedByAccountBonus
                ? mapRawSong(rawSong)
                : null
        );

    if (!effectiveSong) {
        notFound();
    }

    const loggedIn = Boolean(user);

    let userPrograms = [];

    /*
     * Home Package 전용 계정은 개별 song_id로 접근을 판단하므로
     * 프로그램 권한 조회 자체를 생략합니다.
     */
    const needsProgramLookup =
        Boolean(user) &&
        Boolean(membership) &&
        membership?.product_type !== 'home_package' &&
        membership?.song_club_active !== false;

    if (needsProgramLookup) {
        try {
            userPrograms = await getUserPrograms(
                db,
                user.id
            );
        } catch (error) {
            console.error(
                'Song program access error:',
                error
            );
        }
    }

    const accessible = canAccessSong(
        effectiveSong,
        membership,
        userPrograms
    );

    let lockedTitle = '';
    let lockedDescription = '';
    let lockedButton = '';
    let lockedHref = '';

    if (!loggedIn) {
        lockedTitle = '로그인 후 들을 수 있어요';
        lockedDescription =
            'DEAR SUNSHINE MONTHLY SONG CLUB에 로그인하면 이용 가능한 음원을 확인할 수 있어요.';
        lockedButton = '로그인하기';
        lockedHref = '/login';
    } else if (!membership) {
        lockedTitle = 'Song Club 멤버십이 필요해요';
        lockedDescription =
            'Dear Sunshine Monthly Song Club 회원은 수업에서 만난 노래와 자료를 집에서도 이용할 수 있어요.';
        lockedButton = 'Song Club 보기';
        lockedHref = '/membership';
    } else if (membership?.product_type === 'home_package') {
        lockedTitle = '아직 열리지 않은 노래예요';
        lockedDescription =
            'Home Package에서는 시작일을 기준으로 주차에 맞춰 노래가 자동으로 열려요.';
        lockedButton = 'Home Package 보기';
        lockedHref = '/home-package';
    } else {
        lockedTitle = '현재 이용할 수 없는 콘텐츠예요';
        lockedDescription =
            `${effectiveSong.program} 수강 회원만 이용할 수 있는 콘텐츠예요.`;
        lockedButton = '멤버십 보기';
        lockedHref = '/membership';
    }

    const backToHomePackage =
        membership?.product_type === 'home_package';

    return (
        <section className="song-page">
            <Link
                className="back-link"
                href={
                    backToHomePackage
                        ? '/home-package'
                        : '/library'
                }
            >
                ← {backToHomePackage ? 'Home Package' : '노래 목록'}
            </Link>

            <div className="song-cover large">
                <span>{effectiveSong.emoji || '🎵'}</span>
            </div>

            {effectiveSong.program && (
                <p className="eyebrow">
                    {effectiveSong.program}
                </p>
            )}

            {effectiveSong.category && (
                <p
                    className="eyebrow"
                    style={{
                        marginTop: 4
                    }}
                >
                    {effectiveSong.category}
                </p>
            )}

            <h1>{effectiveSong.title}</h1>

            {effectiveSong.subtitle && (
                <p className="page-copy">
                    {effectiveSong.subtitle}
                </p>
            )}

            {accessible ? (
                <>
                    {/*
                     * 음원 signed URL은 재생 버튼을 눌렀을 때만 요청합니다.
                     * 상세페이지 최초 표시를 음원 요청이 막지 않습니다.
                     */}
                    <AudioPlayer
                        title={effectiveSong.title}
                        slug={effectiveSong.slug}
                    />

                    {/*
                     * 가사지/놀이아이디어/플래시카드는 서버 Suspense로 스트리밍합니다.
                     * 기존처럼 브라우저에서 3개의 API 인증 요청을 다시 하지 않습니다.
                     */}
                    <Suspense
                        fallback={
                            <SongResourceFallback scope="song-club" />
                        }
                    >
                        <SongResourceBundleServer
                            song={effectiveSong}
                            scope="song-club"
                        />
                    </Suspense>

                    {Array.isArray(effectiveSong.lyrics) &&
                        effectiveSong.lyrics.length > 0 && (
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
                                    {effectiveSong.lyrics.map(
                                        (line, index) => (
                                            <p key={index}>
                                                {line}
                                            </p>
                                        )
                                    )}
                                </div>
                            </section>
                        )}

                    {Array.isArray(effectiveSong.activities) &&
                        effectiveSong.activities.length > 0 && (
                            <section
                                className="content-card"
                                style={{
                                    marginTop: 20
                                }}
                            >
                                <p className="eyebrow">
                                    {membership?.product_type === 'home_package'
                                        ? 'HOME PACKAGE'
                                        : 'MONTHLY SONG CLUB'}
                                </p>

                                <h2>이렇게 놀아요</h2>

                                <div className="steps">
                                    {effectiveSong.activities.map(
                                        (activity, index) => (
                                            <div
                                                className="step"
                                                key={`${effectiveSong.slug}-${index}`}
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
                </>
            ) : (
                <section
                    className="content-card"
                    style={{
                        marginTop: 20,
                        textAlign: 'center',
                        padding: '34px 22px'
                    }}
                >
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            margin: '0 auto 16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff1c9',
                            fontSize: 28
                        }}
                    >
                        🔒
                    </div>

                    <p className="eyebrow">
                        MEMBERSHIP
                    </p>

                    <h2>{lockedTitle}</h2>

                    <p
                        className="page-copy"
                        style={{
                            maxWidth: 440,
                            margin: '0 auto 22px'
                        }}
                    >
                        {lockedDescription}
                    </p>

                    <Link
                        href={lockedHref}
                        className="primary-button"
                    >
                        {lockedButton}
                    </Link>
                </section>
            )}
        </section>
    );
}
