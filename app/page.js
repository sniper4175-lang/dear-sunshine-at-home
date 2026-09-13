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


/*
 * 서울 시간을 기준으로 현재 달을 구한 뒤
 * offset만큼 이동한 월 정보를 반환합니다.
 *
 * offset  0 = 이번 달
 * offset  1 = 다음 달
 * offset -1 = 지난 달
 */
function monthInfoKST(
    offset = 0
) {

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


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1 + offset,
                1
            )
        );


    const next =
        new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth() + 1,
                1
            )
        );


    const yyyy =
        date.getUTCFullYear();

    const mm =
        String(
            date.getUTCMonth() + 1
        ).padStart(
            2,
            '0'
        );


    const nextYyyy =
        next.getUTCFullYear();

    const nextMm =
        String(
            next.getUTCMonth() + 1
        ).padStart(
            2,
            '0'
        );


    return {
        key:
            `${yyyy}-${mm}`,

        label:
            `${date.getUTCMonth() + 1}월`,

        start:
            `${yyyy}-${mm}-01`,

        end:
            `${nextYyyy}-${nextMm}-01`
    };

}


function EmptyMonth({
    children
}) {

    return (
        <div
            className="content-card"
            style={{
                textAlign:
                    'center'
            }}
        >
            <p
                className="muted"
                style={{
                    margin:
                        0
                }}
            >
                {children}
            </p>
        </div>
    );

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
     * 활성 Song Club 회원에게는
     * 관리자가 연결한 프로그램의 곡만 보여줍니다.
     */
    const visibleSongs =
        membership
            ? songs.filter(
                song =>
                    userPrograms.includes(
                        song.program
                    )
            )
            : songs;


    const currentMonth =
        monthInfoKST(
            0
        );

    const nextMonth =
        monthInfoKST(
            1
        );

    const previousMonth =
        monthInfoKST(
            -1
        );


    /*
     * 이번 달 공개된 곡만 정확히 표시합니다.
     * getSongs() 자체가 공개일이 오늘 이전인 곡만 반환합니다.
     */
    const currentMonthSongs =
        visibleSongs
            .filter(
                song =>
                    song.releaseDate &&
                    song.releaseDate.startsWith(
                        currentMonth.key
                    )
            )
            .slice(
                0,
                4
            );


    /*
     * 지난 달에 공개된 곡
     */
    const previousMonthSongs =
        visibleSongs
            .filter(
                song =>
                    song.releaseDate &&
                    song.releaseDate.startsWith(
                        previousMonth.key
                    )
            )
            .slice(
                0,
                4
            );


    /*
     * COMING UP NEXT
     *
     * 관리자에서 'COMING UP NEXT'로 직접 지정한 곡을 보여줍니다.
     * 공개일이 다음 달로 입력되어 있지 않아도 is_upcoming=true이면
     * 예고 영역에는 표시합니다. 실제 음원/자료 공개 여부는
     * 기존 공개일 및 is_published 규칙을 그대로 따릅니다.
     */
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


    if (
        membership
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


    return (

        <>

            <section className="hero">

                <div className="sun">
                    ☀️
                </div>

                <p className="eyebrow">
                    DEAR SUNSHINE SONG CLUB
                </p>

                <h1>
                    아이들이 사랑한 Dear Sunshine의 노래,
                    <br />
                    이제 집에서도 만나요!
                </h1>

                <p className="hero-copy">
                    수업에서 만난 노래와 자료를
                    집에서도 즐겁게 이어가요.
                </p>

                <Link
                    href={
                        loggedIn
                            ? '/my'
                            : '/login'
                    }
                    className="plan-pill"
                >
                    {
                        membership
                            ? '☀️ Song Club 이용 중'
                            : loggedIn
                                ? 'MY에서 이용권 확인'
                                : '로그인하기'
                    }
                </Link>

            </section>


            {/* 이번 달 */}
            <section className="section">

                <div className="section-head">

                    <div>

                        <p className="eyebrow">
                            THIS MONTH&apos;S SONGS
                        </p>

                        <h2>
                            {currentMonth.label} 노래
                        </h2>

                        <p
                            className="muted"
                            style={{
                                margin:
                                    '6px 0 0'
                            }}
                        >
                            이번 달 새롭게 공개된 노래예요.
                        </p>

                    </div>

                    <Link href="/library">
                        전체 노래
                    </Link>

                </div>


                {currentMonthSongs.length > 0 ? (

                    <div className="card-grid">

                        {currentMonthSongs.map(
                            song => {

                                const accessible =
                                    canAccessSong(
                                        song,
                                        membership,
                                        userPrograms
                                    );

                                return (
                                    <SongCard
                                        key={song.slug}
                                        song={song}
                                        accessible={accessible}
                                        loggedIn={loggedIn}
                                        membership={membership}
                                        userPrograms={userPrograms}
                                    />
                                );

                            }
                        )}

                    </div>

                ) : (

                    <EmptyMonth>
                        {currentMonth.label}에 공개된 노래가 아직 없어요.
                    </EmptyMonth>

                )}

            </section>


            {/* 다음 달 예고 */}
            <section className="section">

                <div className="section-head">

                    <div>

                        <p className="eyebrow">
                            COMING UP NEXT
                        </p>

                        <h2>
                            {nextMonth.label}에 만나요 ✨
                        </h2>

                        <p
                            className="muted"
                            style={{
                                margin:
                                    '6px 0 0'
                            }}
                        >
                            다음 달 새롭게 공개될 노래를 미리 만나보세요.
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
                                            {song.emoji || '🎵'}
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
                                                    15,

                                                lineHeight:
                                                    1.4
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
                                            {song.category
                                                ? ` · ${song.category}`
                                                : ''}
                                        </p>

                                        <p
                                            style={{
                                                margin:
                                                    '8px 0 0',

                                                fontSize:
                                                    12,

                                                fontWeight:
                                                    800,

                                                color:
                                                    '#d48618'
                                            }}
                                        >
                                            🎵 {nextMonth.label} 공개 예정
                                        </p>

                                    </div>

                                </article>

                            )
                        )}

                    </div>

                ) : (

                    <EmptyMonth>
                        {nextMonth.label} 새로운 노래를 준비하고 있어요 ☀️
                    </EmptyMonth>

                )}

            </section>


            {/* 지난 달 */}
            <section className="section">

                <div className="section-head">

                    <div>

                        <p className="eyebrow">
                            LAST MONTH&apos;S SONGS
                        </p>

                        <h2>
                            {previousMonth.label} 노래
                        </h2>

                        <p
                            className="muted"
                            style={{
                                margin:
                                    '6px 0 0'
                            }}
                        >
                            지난달 공개된 노래를 다시 들어보세요.
                        </p>

                    </div>

                    <Link href="/library">
                        전체 노래
                    </Link>

                </div>


                {previousMonthSongs.length > 0 ? (

                    <div className="card-grid">

                        {previousMonthSongs.map(
                            song => {

                                const accessible =
                                    canAccessSong(
                                        song,
                                        membership,
                                        userPrograms
                                    );

                                return (
                                    <SongCard
                                        key={song.slug}
                                        song={song}
                                        accessible={accessible}
                                        loggedIn={loggedIn}
                                        membership={membership}
                                        userPrograms={userPrograms}
                                    />
                                );

                            }
                        )}

                    </div>

                ) : (

                    <EmptyMonth>
                        {previousMonth.label}에 공개된 노래가 없어요.
                    </EmptyMonth>

                )}

            </section>


            <div
                style={{
                    padding:
                        '0 18px 36px'
                }}
            >

                <Link
                    href="/library"
                    className="primary-button wide"
                >
                    🎵 전체 노래 라이브러리 보기
                </Link>

            </div>

        </>

    );
}
