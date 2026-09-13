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

import {
    createAdminSupabase
} from '../lib/supabase-server';

import {
    getUserPrograms
} from '../lib/program-access';

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


function nextMonthRangeKST() {

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
        Number(
            parts.find(
                part =>
                    part.type ===
                    'year'
            )?.value
        );


    const month =
        Number(
            parts.find(
                part =>
                    part.type ===
                    'month'
            )?.value
        );


    /*
     * JS의 month는 0부터 시작하므로
     * 현재 month 값을 그대로 넣으면 다음 달이 됩니다.
     *
     * 예:
     * 현재 9월 → Date.UTC(2026, 9, 1) = 10월 1일
     */
    const nextMonthStart =
        new Date(
            Date.UTC(
                year,
                month,
                1
            )
        );


    const monthAfterNextStart =
        new Date(
            Date.UTC(
                year,
                month + 1,
                1
            )
        );


    function dateString(date) {

        return (
            `${date.getUTCFullYear()}-` +
            `${String(
                date.getUTCMonth() + 1
            ).padStart(
                2,
                '0'
            )}-01`
        );

    }


    return {
        start:
            dateString(
                nextMonthStart
            ),

        end:
            dateString(
                monthAfterNextStart
            ),

        label:
            `${nextMonthStart.getUTCMonth() + 1}월`
    };

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


    const db =
        createAdminSupabase();


    let userPrograms =
        [];


    if (user) {

        try {

            userPrograms =
                await getUserPrograms(
                    db,
                    user.id
                );

        } catch (error) {

            console.error(
                'Home program access error:',
                error
            );

        }

    }


    /*
     * =====================================
     * 다음 달 공개 예정곡
     * =====================================
     *
     * 실제 음원 URL은 보내지 않고
     * 제목 / 프로그램 / 이모지 / 공개일만
     * 홈 화면 미리보기에 사용합니다.
     */
    const {
        start:
            nextMonthStart,

        end:
            monthAfterNextStart,

        label:
            nextMonthLabel
    } =
        nextMonthRangeKST();


    const {
        data: upcomingRows,
        error: upcomingError
    } =
        await db
            .from(
                'ds_content_songs'
            )
            .select(
                'id,slug,title,subtitle,program,category,emoji,release_date,is_upcoming'
            )
            .eq(
                'is_upcoming',
                true
            )
            .order(
                'release_date',
                {
                    ascending:
                        true
                }
            )
            .order(
                'title',
                {
                    ascending:
                        true
                }
            )
            .limit(
                8
            );


    if (upcomingError) {

        console.error(
            'Upcoming songs load error:',
            upcomingError
        );

    }


    let upcomingSongs =
        (
            upcomingRows ||
            []
        )
            .map(
                row => ({
                    id:
                        row.id,

                    slug:
                        row.slug,

                    title:
                        row.title,

                    subtitle:
                        row.subtitle,

                    program:
                        row.program,

                    category:
                        row.category,

                    emoji:
                        row.emoji,

                    releaseDate:
                        row.release_date
                })
            );


    /*
     * Song Club 이용 중이고
     * 관리자에서 프로그램 권한을 지정했다면
     * 해당 프로그램의 예고곡만 보여줍니다.
     */
    if (
        membership &&
        userPrograms.length > 0
    ) {

        upcomingSongs =
            upcomingSongs.filter(
                song =>
                    userPrograms.includes(
                        song.program
                    )
            );

    }


    upcomingSongs =
        upcomingSongs.slice(
            0,
            4
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
                            THIS MONTH SONG
                        </p>


                        <h2>
                            이달의 노래
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
                                        membership,
                                        userPrograms
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
                다음 달 새로운 노래
            ====================================== */}

            <section className="section">

                <div className="section-head">

                    <div>

                        <p className="eyebrow">
                            COMING UP NEXT
                        </p>


                        <h2>
                            다음 달에 만나요 ✨
                        </h2>


                        <p
                            className="muted"
                            style={{
                                margin:
                                    '6px 0 0'
                            }}
                        >
                            다음 달 새롭게 공개될 노래를
                            미리 만나보세요.
                        </p>

                    </div>

                </div>


                {upcomingSongs.length > 0 ? (

                    <div className="card-grid">

                        {upcomingSongs.map(
                            song => (

                                <article
                                    key={
                                        song.id ||
                                        song.slug
                                    }
                                    className="content-card"
                                    style={{
                                        padding:
                                            12
                                    }}
                                >

                                    <div
                                        style={{
                                            minHeight:
                                                140,

                                            borderRadius:
                                                18,

                                            background:
                                                'linear-gradient(135deg, #fff7dc 0%, #fff0ee 100%)',

                                            display:
                                                'flex',

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',

                                            position:
                                                'relative'
                                        }}
                                    >

                                        <span
                                            style={{
                                                fontSize:
                                                    58
                                            }}
                                        >
                                            {
                                                song.emoji ||
                                                '🎵'
                                            }
                                        </span>


                                        <span
                                            style={{
                                                position:
                                                    'absolute',

                                                top:
                                                    10,

                                                right:
                                                    10,

                                                padding:
                                                    '6px 9px',

                                                borderRadius:
                                                    999,

                                                background:
                                                    '#fff',

                                                fontSize:
                                                    10,

                                                fontWeight:
                                                    800,

                                                letterSpacing:
                                                    '0.06em',

                                                color:
                                                    '#d48618'
                                            }}
                                        >
                                            COMING SOON
                                        </span>

                                    </div>


                                    <div
                                        style={{
                                            padding:
                                                '12px 4px 4px'
                                        }}
                                    >

                                        <strong
                                            style={{
                                                display:
                                                    'block',

                                                fontSize:
                                                    15
                                            }}
                                        >
                                            {song.title}
                                        </strong>


                                        <p
                                            className="muted"
                                            style={{
                                                margin:
                                                    '5px 0 0',

                                                fontSize:
                                                    12
                                            }}
                                        >
                                            {song.program}
                                        </p>


                                        <p
                                            style={{
                                                margin:
                                                    '8px 0 0',

                                                fontSize:
                                                    12,

                                                fontWeight:
                                                    700,

                                                color:
                                                    '#d48618'
                                            }}
                                        >
                                            🎵 {nextMonthLabel} 공개 예정
                                        </p>

                                    </div>

                                </article>

                            )
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
                            다음 달 새로운 노래를
                            준비하고 있어요 ☀️
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
                                        membership,
                                        userPrograms
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

                <div
                    style={{
                        margin: '18px 0',
                        lineHeight: 1.8
                    }}
                >
                    <strong>
                        OPENING SPECIAL
                    </strong>

                    <br />

                    1개월 12,900원

                    <br />

                    6개월 73,500원 · 약 5% SAVE

                    <br />

                    12개월 139,000원 · 약 10% SAVE

                    <br />

                    <span
                        style={{
                            fontSize: 13
                        }}
                    >
                        자동결제 없이 원하는 기간만 이용해요.
                    </span>
                </div>

                <div
                    style={{
                        margin: '16px 0'
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
                            : 'Song Club 멤버십 보기'
                    }
                </Link>

            </section>


        </>

    );
}
