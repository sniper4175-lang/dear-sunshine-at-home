'use client';

import {
    useMemo,
    useState
} from 'react';

import SongCard
    from './SongCard';

import PlaylistPlayer
    from './PlaylistPlayer';



function todayKST() {

    return new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone:
                'Asia/Seoul',

            year:
                'numeric',

            month:
                '2-digit',

            day:
                '2-digit'
        }
    ).format(
        new Date()
    );

}



function monthsAgo(
    dateString,
    months
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split('-')
            .map(Number);


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    date.setUTCMonth(
        date.getUTCMonth() -
        months
    );


    return date
        .toISOString()
        .slice(
            0,
            10
        );

}



/*
 * ==========================================
 * 해당 곡을 현재 사용자가 들을 수 있는지
 * ==========================================
 */
function canAccessSong(
    song,
    loggedIn,
    membership,
    userPrograms
) {

    /*
     * 로그인 안 됨
     */
    if (
        !loggedIn
    ) {
        return false;
    }


    /*
     * At Home 멤버십 없음
     */
    if (
        !membership
    ) {
        return false;
    }


    /*
     * ======================================
     * 현재 수강 중인 프로그램 확인
     *
     * Sunshine Toddler 수강생
     * → Sunshine Toddler 음원만
     *
     * Melody Book Club 수강생
     * → Melody Book Club 음원만
     *
     * 둘 다 수강
     * → 둘 다 이용
     * ======================================
     */
    if (
        !Array.isArray(
            userPrograms
        ) ||
        !userPrograms.includes(
            song.program
        )
    ) {

        return false;

    }


    /*
     * ======================================
     * Premium
     *
     * 현재 수강 중인 프로그램 안에서는
     * Premium 전용곡까지 모두 이용 가능
     * ======================================
     */
    if (
        membership.plan ===
        'premium'
    ) {

        return true;

    }


    /*
     * Basic 이외의 플랜이면 접근 불가
     */
    if (
        membership.plan !==
        'basic'
    ) {

        return false;

    }


    /*
     * Premium 전용곡
     */
    if (
        song.premiumOnly
    ) {

        return false;

    }


    /*
     * releaseDate 없는 곡
     */
    if (
        !song.releaseDate
    ) {

        return false;

    }


    /*
     * Basic
     *
     * 최근 3개월 곡만 이용
     */
    const today =
        todayKST();


    const threshold =
        monthsAgo(
            today,
            3
        );


    return (
        song.releaseDate >=
            threshold &&
        song.releaseDate <=
            today
    );

}



export default function LibraryClient({
    songs,
    loggedIn,
    membership,
    userPrograms = []
}) {

    /*
     * ==========================================
     * 선택한 프로그램
     * ==========================================
     */

    const [
        selectedProgram,
        setSelectedProgram
    ] =
        useState(
            'all'
        );



    /*
     * ==========================================
     * 프로그램별 곡 필터
     * ==========================================
     */

    const filteredSongs =
        useMemo(
            () => {

                if (
                    selectedProgram ===
                    'all'
                ) {

                    return songs;

                }


                return songs.filter(
                    song =>
                        song.program ===
                        selectedProgram
                );

            },
            [
                songs,
                selectedProgram
            ]
        );



    /*
     * ==========================================
     * 현재 필터에서 실제 재생 가능한 곡
     *
     * PlaylistPlayer에도 이 목록만 전달
     * ==========================================
     */

    const accessibleSlugs =
        useMemo(
            () => {

                return filteredSongs
                    .filter(
                        song =>
                            canAccessSong(
                                song,
                                loggedIn,
                                membership,
                                userPrograms
                            )
                    )
                    .map(
                        song =>
                            song.slug
                    );

            },
            [
                filteredSongs,
                loggedIn,
                membership,
                userPrograms
            ]
        );



    /*
     * ==========================================
     * 멤버십 표시
     * ==========================================
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



    /*
     * ==========================================
     * 현재 수강 프로그램 표시
     * ==========================================
     */

    const programLabel =
        !loggedIn
            ? ''
            : userPrograms.length ===
                0
                ? '연결된 수강 클래스 없음'
                : userPrograms.join(
                    ' · '
                );



    return (

        <section
            className="section top-section"
        >

            <p className="eyebrow">
                SONG LIBRARY
            </p>


            <h1>
                노래
            </h1>


            <p className="page-copy">
                Dear Sunshine 수업에서
                아이들이 즐겨 부른 노래를
                모았어요.
            </p>



            {/* ==================================
                멤버십 상태
            =================================== */}

            <div
                style={{
                    display:
                        'flex',

                    alignItems:
                        'center',

                    gap:
                        7,

                    flexWrap:
                        'wrap',

                    marginBottom:
                        10
                }}
            >

                <div
                    style={{
                        display:
                            'inline-flex',

                        alignItems:
                            'center',

                        gap:
                            6,

                        padding:
                            '8px 12px',

                        borderRadius:
                            999,

                        background:
                            '#fff1c9',

                        fontSize:
                            13,

                        fontWeight:
                            800
                    }}
                >
                    ☀️ {planLabel}
                </div>


                {
                    loggedIn &&
                    userPrograms.length >
                        0 && (

                        <div
                            style={{
                                display:
                                    'inline-flex',

                                alignItems:
                                    'center',

                                padding:
                                    '8px 12px',

                                borderRadius:
                                    999,

                                background:
                                    '#f4eee6',

                                color:
                                    '#695b50',

                                fontSize:
                                    12,

                                fontWeight:
                                    750
                            }}
                        >
                            {programLabel}
                        </div>

                    )
                }

            </div>



            {/* ==================================
                수강 연결 안내
            =================================== */}

            {
                loggedIn &&
                membership &&
                userPrograms.length ===
                    0 && (

                    <div
                        style={{
                            marginBottom:
                                18,

                            padding:
                                '12px 14px',

                            borderRadius:
                                14,

                            background:
                                '#fff7e8',

                            color:
                                '#8b6528',

                            fontSize:
                                13,

                            lineHeight:
                                1.6
                        }}
                    >
                        현재 계정에 연결된
                        수강 클래스가 없습니다.
                        수강 정보 연결 후 해당
                        클래스의 음원을 이용할 수 있어요.
                    </div>

                )
            }



            {/* ==================================
                프로그램 필터
            =================================== */}

            <div
                style={{
                    display:
                        'flex',

                    gap:
                        8,

                    overflowX:
                        'auto',

                    paddingBottom:
                        18
                }}
            >

                <ProgramButton
                    active={
                        selectedProgram ===
                        'all'
                    }
                    onClick={() =>
                        setSelectedProgram(
                            'all'
                        )
                    }
                >
                    전체
                </ProgramButton>


                <ProgramButton
                    active={
                        selectedProgram ===
                        'Sunshine Toddler'
                    }
                    onClick={() =>
                        setSelectedProgram(
                            'Sunshine Toddler'
                        )
                    }
                >
                    Sunshine Toddler
                </ProgramButton>


                <ProgramButton
                    active={
                        selectedProgram ===
                        'Melody Book Club'
                    }
                    onClick={() =>
                        setSelectedProgram(
                            'Melody Book Club'
                        )
                    }
                >
                    Melody Book Club
                </ProgramButton>

            </div>



            {/* ==================================
                곡 수
            =================================== */}

            <div
                style={{
                    marginBottom:
                        16
                }}
            >

                <p
                    style={{
                        margin:
                            0,

                        fontSize:
                            13,

                        color:
                            '#8d8175'
                    }}
                >
                    {
                        selectedProgram ===
                        'all'
                            ? '전체 프로그램'
                            : selectedProgram
                    }
                </p>


                <strong
                    style={{
                        display:
                            'block',

                        marginTop:
                            4,

                        fontSize:
                            17
                    }}
                >
                    {filteredSongs.length}곡
                </strong>

            </div>



            {/* ==================================
                플레이리스트

                실제 접근 가능한 곡만
                플레이리스트에서 재생 가능
            =================================== */}

            {
                loggedIn &&
                membership && (

                    <PlaylistPlayer
                        songs={
                            filteredSongs
                        }
                        accessibleSlugs={
                            accessibleSlugs
                        }
                    />

                )
            }



            {/* ==================================
                곡 목록
            =================================== */}

            {
                filteredSongs.length >
                0 ? (

                    <div
                        className="card-grid"
                    >

                        {
                            filteredSongs.map(
                                song => {

                                    const accessible =
                                        canAccessSong(
                                            song,
                                            loggedIn,
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
                                            userPrograms={
                                                userPrograms
                                            }
                                        />

                                    );

                                }
                            )
                        }

                    </div>

                ) : (

                    <div
                        style={{
                            padding:
                                '40px 20px',

                            textAlign:
                                'center',

                            color:
                                '#8d8175'
                        }}
                    >
                        공개된 노래가 없습니다.
                    </div>

                )
            }

        </section>

    );

}



/*
 * ==========================================
 * 프로그램 필터 버튼
 * ==========================================
 */
function ProgramButton({
    active,
    onClick,
    children
}) {

    return (

        <button
            type="button"
            onClick={
                onClick
            }
            style={{
                flexShrink:
                    0,

                border:
                    'none',

                borderRadius:
                    999,

                padding:
                    '10px 16px',

                cursor:
                    'pointer',

                fontWeight:
                    800,

                background:
                    active
                        ? '#f9b846'
                        : '#f4eee6',

                color:
                    '#3d3026'
            }}
        >
            {children}
        </button>

    );

}