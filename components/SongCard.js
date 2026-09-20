'use client';

import { useRouter } from 'next/navigation';

export default function SongCard({
    song,
    accessible,
    loggedIn,
    membership,
    userPrograms = []
}) {
    const router = useRouter();

    const enrolledInProgram =
        !song?.program ||
        !Array.isArray(userPrograms) ||
        userPrograms.length === 0 ||
        userPrograms.includes(song.program);

    /*
     * Home Package에서 현재 열린 곡은 Song Club 공개 여부와 관계없이
     * /home-package/song/[slug] 상세화면으로 이동해야 합니다.
     *
     * 기존 /song/[slug] 화면은 Song Club 공개 상태를 기준으로 동작할 수 있어
     * Home Package 전용 비공개곡을 그쪽으로 보내면 404가 발생할 수 있습니다.
     */
    const isHomePackageSong = Boolean(song?.homePackageUnlocked);

    const songHref = isHomePackageSong
        ? `/home-package/song/${encodeURIComponent(song.slug)}`
        : `/song/${encodeURIComponent(song.slug)}`;

    function openSong() {
        if (!song?.slug) {
            alert('이 노래의 연결 정보가 없습니다. 관리자에게 문의해주세요.');
            return;
        }

        if (!loggedIn) {
            router.push(
                `/login?next=${encodeURIComponent(songHref)}`
            );
            return;
        }

        if (!membership) {
            router.push('/membership');
            return;
        }

        if (!enrolledInProgram) {
            alert(
                `${song.program} 이용 회원만 이용할 수 있는 음원입니다.`
            );
            return;
        }

        if (accessible || isHomePackageSong) {
            router.push(songHref);
            return;
        }

        router.push('/membership');
    }

    function getLockedMessage() {
        if (!loggedIn) {
            return '로그인 후 이용';
        }

        if (!membership) {
            return '이용권이 필요해요';
        }

        if (!enrolledInProgram) {
            return `${song.program} 이용 회원 전용`;
        }

        return '현재 이용할 수 없는 콘텐츠';
    }

    return (
        <button
            type="button"
            onClick={openSong}
            className="song-card"
            style={{
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                opacity: accessible || isHomePackageSong ? 1 : 0.72
            }}
        >
            <div className="song-cover">
                <span>{song.emoji || '🎵'}</span>

                {song.popular && (
                    <em>인기</em>
                )}

                {!accessible && !isHomePackageSong && (
                    <b className="lock">🔒</b>
                )}
            </div>

            <div className="song-meta">
                <strong>{song.title}</strong>

                <span>
                    {song.program}
                    {song.category ? ` · ${song.category}` : ''}
                </span>

                {!accessible && !isHomePackageSong && (
                    <span
                        style={{
                            marginTop: 5,
                            color:
                                !enrolledInProgram && loggedIn && membership
                                    ? '#9a6b48'
                                    : '#b7771f',
                            fontSize: 12,
                            fontWeight: 800,
                            lineHeight: 1.45
                        }}
                    >
                        {getLockedMessage()}
                    </span>
                )}
            </div>
        </button>
    );
}
