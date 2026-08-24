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

    const songs =
        await getSongs();


    const {
        user,
        membership
    } =
        await getCurrentMembership();


    const loggedIn =
        Boolean(
            user
        );


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


    const newSongs =
        thisMonthSongs.length > 0
            ? thisMonthSongs
            : songs.slice(
                0,
                4
            );


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


    const membershipLabel =
        !loggedIn
            ? '로그인 필요'
            : membership
                ? 'Song Club 이용 중'
                : '멤버십 없음';


    return (

        <>


            <section className="hero">


                <div className="sun">
                    ☀️
                </div>


                <p className="eyebrow">
                    DEAR SUNSHINE MONTHLY SONG CLUB
                </p>


                <h1>
                    아이들이 사랑한 Dear Sunshine의 노래,
                    <br />
                    이제 집에서도 만나요!
                </h1>


                <p className="hero-copy">
                    Dear Sunshine 정규 수강생만 가입할 수 있는
                    특별한 Song Membership ♡
                </p>


                <Link
                    href={
                        loggedIn
                            ? '/membership'
                            : '/login'
                    }
                    className="plan-pill"
                >
                    {
                        membership
                            ? '☀️ Song Club 이용 중'
                            : loggedIn
                                ? 'Song Club 시작하기'
                                : '로그인하기'
                    }
                </Link>


            </section>



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



            <section className="membership-banner">


                <p className="eyebrow">
                    MEMBERSHIP
                </p>


                <h2>
                    Dear Sunshine Monthly Song Club
                </h2>


                <p>
                    🎵 매월 수업곡 4~5곡
                    <br />
                    📝 Lyrics · 💡 Play Ideas · 🎨 Printable Materials
                </p>


                <p>
                    <strong>
                        첫 7일 FREE
                    </strong>
                    <br />
                    이후 월 12,900원
                </p>


                <div
                    style={{
                        margin:
                            '16px 0'
                    }}
                >

                    <strong>
                        현재 상태: {membershipLabel}
                    </strong>

                </div>



                <Link
                    className="primary-button"
                    href="/membership"
                >
                    {
                        membership
                            ? '내 멤버십 보기'
                            : 'Song Club 보기'
                    }
                </Link>


            </section>


        </>

    );
}
