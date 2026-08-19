import Link from 'next/link';

import {
    getSongs
} from '../lib/content';

import {
    getCurrentMembership
} from '../lib/membership';

import {
    canAccessSong
} from '../lib/content-access';

import SongCard
    from '../components/SongCard';


export const dynamic =
    'force-dynamic';


/*
 * 한국 기준 YYYY-MM
 */
function currentMonthKST() {

    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone:
                    'Asia/Seoul',

                year:
                    'numeric',

                month:
                    '2-digit'
            }
        )
            .formatToParts(
                new Date()
            );


    const year =
        parts.find(
            part =>
                part.type ===
                'year'
        )?.value;


    const month =
        parts.find(
            part =>
                part.type ===
                'month'
        )?.value;


    return `${year}-${month}`;
}



export default async function HomePage() {

    /*
     * 공개된 콘텐츠 전체
     */
    const songs =
        await getSongs();


    /*
     * 현재 로그인 사용자 + 멤버십
     */
    const {
        user,
        membership
    } =
        await getCurrentMembership();


    const loggedIn =
        Boolean(
            user
        );


    /*
     * =====================================
     * 이번 달 신규곡
     * =====================================
     */

    const monthKey =
        currentMonthKST();


    const thisMonthSongs =
        songs
            .filter(
                song =>
                    song.releaseDate &&
                    song.releaseDate.startsWith(
                        monthKey
                    )
            )
            .slice(
                0,
                4
            );


    /*
     * 이번 달 공개곡이 아직 없으면
     * 최신곡 4곡 표시
     */
    const newSongs =
        thisMonthSongs.length > 0
            ? thisMonthSongs
            : songs.slice(
                0,
                4
            );


    /*
     * =====================================
     * 인기곡
     * =====================================
     */

    const popularSongs =
        songs
            .filter(
                song =>
                    song.popular
            )
            .slice(
                0,
                4
            );


    /*
     * 멤버십 표시
     */
    const planLabel =
        !loggedIn
            ? '로그인 필요'
            : !membership
                ? '멤버십 없음'
                : membership.plan ===
                    'premium'
                    ? 'Premium'
                    : 'Basic';


    return (

        <>


            {/* =====================================
                HERO
            ====================================== */}

            <section className="hero">


                <div className="sun">
                    ☀️
                </div>


                <p className="eyebrow">
                    DEAR SUNSHINE SONG PLAY
                </p>


                <h1>
                    수업에서 좋아했던 영어노래를
                    <br />
                    집에서도 이어가요
                </h1>


                <p className="hero-copy">
                    노래를 듣고,
                    가사지를 보고,
                    바로 따라 할 수 있는
                    영어놀이까지.
                </p>



                {/* 현재 회원 상태 */}

                <Link
                    href={
                        loggedIn
                            ? '/membership'
                            : '/login'
                    }
                    className="plan-pill"
                >

                    {
                        membership?.plan ===
                        'premium'
                            ? '✨ Premium 이용 중'
                            : membership?.plan ===
                                'basic'
                                ? '☀️ Basic 이용 중'
                                : loggedIn
                                    ? '멤버십 선택하기'
                                    : '로그인하기'
                    }

                </Link>


            </section>



            {/* =====================================
                이번 달 새로운 노래
            ====================================== */}

            <section className="section">


                <div className="section-head">


                    <div>

                        <p className="eyebrow">
                            NEW THIS MONTH
                        </p>


                        <h2>
                            이번 달 새로운 노래
                        </h2>

                    </div>


                    <Link href="/library">
                        전체 보기
                    </Link>


                </div>



                {newSongs.length > 0 ? (

                    <div className="card-grid">


                        {newSongs.map(
                            song => {

                                const accessible =
                                    canAccessSong(
                                        song,
                                        membership
                                    );


                                return (

                                    <SongCard
                                        key={
                                            song.slug
                                        }
                                        song={
                                            song
                                        }
                                        accessible={
                                            accessible
                                        }
                                        loggedIn={
                                            loggedIn
                                        }
                                        membership={
                                            membership
                                        }
                                    />

                                );

                            }
                        )}


                    </div>

                ) : (

                    <div
                        className="content-card"
                        style={{
                            textAlign:
                                'center'
                        }}
                    >

                        <p className="muted">
                            공개된 새로운 노래가
                            아직 없습니다.
                        </p>

                    </div>

                )}


            </section>



            {/* =====================================
                인기곡
            ====================================== */}

            <section className="section">


                <div className="section-head">


                    <div>

                        <p className="eyebrow">
                            KIDS&apos; FAVORITES
                        </p>


                        <h2>
                            아이들이 좋아해요 💛
                        </h2>

                    </div>


                    <Link href="/library">
                        전체 보기
                    </Link>


                </div>



                {popularSongs.length > 0 ? (

                    <div className="card-grid">


                        {popularSongs.map(
                            song => {

                                const accessible =
                                    canAccessSong(
                                        song,
                                        membership
                                    );


                                return (

                                    <SongCard
                                        key={
                                            song.slug
                                        }
                                        song={
                                            song
                                        }
                                        accessible={
                                            accessible
                                        }
                                        loggedIn={
                                            loggedIn
                                        }
                                        membership={
                                            membership
                                        }
                                    />

                                );

                            }
                        )}


                    </div>

                ) : (

                    <div
                        className="content-card"
                        style={{
                            textAlign:
                                'center'
                        }}
                    >

                        <p className="muted">
                            아직 인기곡으로 지정된
                            콘텐츠가 없습니다.
                        </p>

                    </div>

                )}


            </section>



            {/* =====================================
                멤버십 안내
            ====================================== */}

            <section className="membership-banner">


                <p className="eyebrow">
                    MEMBERSHIP
                </p>


                <h2>
                    Dear Sunshine Song Library
                </h2>


                <p>
                    Basic은 최근 3개월 콘텐츠를,
                    Premium은 공개된 전체 음원과
                    가사지를 이용할 수 있어요.
                </p>



                <div
                    style={{
                        margin:
                            '16px 0'
                    }}
                >

                    <strong>
                        현재 상태: {planLabel}
                    </strong>

                </div>



                <Link
                    className="primary-button"
                    href="/membership"
                >
                    {
                        membership
                            ? '내 멤버십 보기'
                            : '멤버십 보기'
                    }
                </Link>


            </section>


        </>

    );
}