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


function canAccessSong(
    song,
    loggedIn,
    membership
) {

    if (
        !loggedIn ||
        !membership
    ) {
        return false;
    }


    if (
        membership.plan ===
        'premium'
    ) {
        return true;
    }


    if (
        membership.plan !==
        'basic'
    ) {
        return false;
    }


    if (
        song.premiumOnly
    ) {
        return false;
    }


    if (
        !song.releaseDate
    ) {
        return false;
    }


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
    membership
}) {

    const [
        selectedProgram,
        setSelectedProgram
    ] =
        useState(
            'all'
        );


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


    const planLabel =
        !loggedIn
            ? '로그인 필요'
            : !membership
                ? '멤버십 없음'
                : membership.plan ===
                    'premium'
                    ? 'Premium'
                    : 'Basic';

    const accessibleSlugs =
        useMemo(
            () =>
                filteredSongs
                    .filter(
                        song =>
                            canAccessSong(
                                song,
                                loggedIn,
                                membership
                            )
                    )
                    .map(
                        song =>
                            song.slug
                    ),
            [
                filteredSongs,
                loggedIn,
                membership
            ]
        );

    return (

        <section className="section top-section">


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



            {/* 멤버십 상태 */}

            <div
                style={{
                    display:
                        'inline-flex',

                    alignItems:
                        'center',

                    gap:
                        6,

                    marginBottom:
                        18,

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



            {/* 프로그램 필터 */}

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


                <button
                    type="button"
                    onClick={() =>
                        setSelectedProgram(
                            'all'
                        )
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
                            selectedProgram ===
                            'all'
                                ? '#f9b846'
                                : '#f4eee6',

                        color:
                            '#3d3026'
                    }}
                >
                    전체
                </button>


                <button
                    type="button"
                    onClick={() =>
                        setSelectedProgram(
                            'Sunshine Toddler'
                        )
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
                            selectedProgram ===
                            'Sunshine Toddler'
                                ? '#f9b846'
                                : '#f4eee6',

                        color:
                            '#3d3026'
                    }}
                >
                    Sunshine Toddler
                </button>


                <button
                    type="button"
                    onClick={() =>
                        setSelectedProgram(
                            'Melody Book Club'
                        )
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
                            selectedProgram ===
                            'Melody Book Club'
                                ? '#f9b846'
                                : '#f4eee6',

                        color:
                            '#3d3026'
                    }}
                >
                    Melody Book Club
                </button>

            </div>



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

            <PlaylistPlayer
                songs={
                    filteredSongs
                }
                accessibleSlugs={
                    accessibleSlugs
                }
            />


            {/* 곡 목록 */}

            {filteredSongs.length >
            0 ? (

                <div className="card-grid">

                    {filteredSongs.map(
                        song => {

                            const accessible =
                                canAccessSong(
                                    song,
                                    loggedIn,
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

            )}


        </section>

    );
}