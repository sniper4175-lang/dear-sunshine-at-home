'use client';

import {
    useMemo,
    useState
} from 'react';

import {
    useRouter
} from 'next/navigation';


const PROGRAM_OPTIONS = [
    'Sunshine Toddler',
    'Melody Book Club'
];


function canAccessSong(
    song,
    loggedIn,
    membership,
    userPrograms
) {

    if (
        !loggedIn ||
        !membership
    ) {
        return false;
    }


    if (
        !Array.isArray(
            userPrograms
        ) ||
        !song?.program
    ) {
        return false;
    }


    return userPrograms.includes(
        song.program
    );

}


function monthKey(
    releaseDate
) {

    if (!releaseDate) {
        return 'unknown';
    }

    return String(
        releaseDate
    ).slice(
        0,
        7
    );

}


function monthLabel(
    key
) {

    if (
        !key ||
        key === 'unknown'
    ) {
        return '기타 노래';
    }


    const [
        year,
        month
    ] =
        key.split(
            '-'
        );


    if (
        !year ||
        !month
    ) {
        return key;
    }


    return `${Number(month)}월 노래`;

}


export default function LibraryClient({
    songs,
    loggedIn,
    membership,
    userPrograms = []
}) {

    const router =
        useRouter();


    const availablePrograms =
        useMemo(
            () =>
                PROGRAM_OPTIONS.filter(
                    program =>
                        userPrograms.includes(
                            program
                        )
                ),
            [
                userPrograms
            ]
        );


    const [
        selectedProgram,
        setSelectedProgram
    ] =
        useState(
            () =>
                availablePrograms.length === 1
                    ? availablePrograms[0]
                    : 'all'
        );


    const visibleSongs =
        useMemo(
            () => {

                if (
                    !loggedIn ||
                    !membership
                ) {
                    return songs;
                }


                if (
                    availablePrograms.length ===
                    0
                ) {
                    return [];
                }


                return songs.filter(
                    song =>
                        availablePrograms.includes(
                            song.program
                        )
                );

            },
            [
                songs,
                loggedIn,
                membership,
                availablePrograms
            ]
        );


    const effectiveSelectedProgram =
        availablePrograms.length === 1
            ? availablePrograms[0]
            : selectedProgram;


    const filteredSongs =
        useMemo(
            () => {

                if (
                    effectiveSelectedProgram ===
                    'all'
                ) {
                    return visibleSongs;
                }


                return visibleSongs.filter(
                    song =>
                        song.program ===
                        effectiveSelectedProgram
                );

            },
            [
                visibleSongs,
                effectiveSelectedProgram
            ]
        );


    const groupedSongs =
        useMemo(
            () => {

                const groups =
                    new Map();


                filteredSongs.forEach(
                    song => {

                        const key =
                            monthKey(
                                song.releaseDate
                            );


                        if (
                            !groups.has(
                                key
                            )
                        ) {
                            groups.set(
                                key,
                                []
                            );
                        }


                        groups.get(
                            key
                        ).push(
                            song
                        );

                    }
                );


                return Array.from(
                    groups.entries()
                ).sort(
                    ([keyA], [keyB]) =>
                        keyB.localeCompare(
                            keyA
                        )
                );

            },
            [
                filteredSongs
            ]
        );


    const tabs =
        loggedIn &&
        membership
            ? (
                availablePrograms.length > 1
                    ? [
                        'all',
                        ...availablePrograms
                    ]
                    : availablePrograms
            )
            : [
                'all',
                ...PROGRAM_OPTIONS
            ];


    function openSong(
        song
    ) {

        const accessible =
            canAccessSong(
                song,
                loggedIn,
                membership,
                userPrograms
            );


        if (!loggedIn) {

            router.push(
                `/login?next=${encodeURIComponent(`/song/${song.slug}`)}`
            );

            return;

        }


        if (!membership) {

            router.push(
                '/membership'
            );

            return;

        }


        if (!accessible) {

            router.push(
                '/membership'
            );

            return;

        }


        router.push(
            `/song/${song.slug}`
        );

    }


    return (

        <section
            className="section top-section"
        >

            <p className="eyebrow">
                SONG LIBRARY
            </p>

            <h1>
                전체 노래
            </h1>

            <p className="page-copy">
                지금까지 공개된 Dear Sunshine의 노래를
                월별로 모아봤어요.
            </p>


            {loggedIn &&
                membership &&
                availablePrograms.length === 0 && (

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
                    현재 계정에 연결된 수강 클래스가 없습니다.
                    수강 정보 연결 후 해당 클래스의 노래를 이용할 수 있어요.
                </div>

            )}


            {tabs.length > 0 && (

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

                    {tabs.map(
                        program => (

                            <ProgramButton
                                key={program}
                                active={
                                    effectiveSelectedProgram ===
                                    program
                                }
                                onClick={() =>
                                    setSelectedProgram(
                                        program
                                    )
                                }
                            >
                                {
                                    program === 'all'
                                        ? '전체'
                                        : program
                                }
                            </ProgramButton>

                        )
                    )}

                </div>

            )}


            <div
                style={{
                    display:
                        'flex',

                    alignItems:
                        'center',

                    justifyContent:
                        'space-between',

                    gap:
                        12,

                    marginBottom:
                        18
                }}
            >

                <span
                    className="muted"
                    style={{
                        fontSize:
                            13
                    }}
                >
                    {
                        effectiveSelectedProgram === 'all'
                            ? '전체 프로그램'
                            : effectiveSelectedProgram
                    }
                </span>

                <strong>
                    {filteredSongs.length}곡
                </strong>

            </div>


            {groupedSongs.length > 0 ? (

                <div
                    style={{
                        display:
                            'grid',

                        gap:
                            18
                    }}
                >

                    {groupedSongs.map(
                        ([key, monthSongs]) => (

                            <section
                                key={key}
                                className="content-card"
                                style={{
                                    margin:
                                        0,

                                    padding:
                                        '18px 18px 6px'
                                }}
                            >

                                <div
                                    style={{
                                        display:
                                            'flex',

                                        justifyContent:
                                            'space-between',

                                        alignItems:
                                            'center',

                                        gap:
                                            12,

                                        paddingBottom:
                                            12,

                                        borderBottom:
                                            '1px solid #eee3d5'
                                    }}
                                >

                                    <h2
                                        style={{
                                            margin:
                                                0,

                                            fontSize:
                                                22
                                        }}
                                    >
                                        {monthLabel(key)}
                                    </h2>

                                    <span
                                        className="muted"
                                        style={{
                                            fontSize:
                                                13,

                                            fontWeight:
                                                800
                                        }}
                                    >
                                        {monthSongs.length}곡
                                    </span>

                                </div>


                                <div>

                                    {monthSongs.map(
                                        song => {

                                            const accessible =
                                                canAccessSong(
                                                    song,
                                                    loggedIn,
                                                    membership,
                                                    userPrograms
                                                );


                                            return (

                                                <button
                                                    key={song.slug}
                                                    type="button"
                                                    onClick={() =>
                                                        openSong(
                                                            song
                                                        )
                                                    }
                                                    style={{
                                                        width:
                                                            '100%',

                                                        border:
                                                            'none',

                                                        borderBottom:
                                                            '1px solid #f2e9de',

                                                        background:
                                                            'transparent',

                                                        padding:
                                                            '13px 0',

                                                        display:
                                                            'grid',

                                                        gridTemplateColumns:
                                                            '54px minmax(0, 1fr) 26px',

                                                        gap:
                                                            12,

                                                        alignItems:
                                                            'center',

                                                        textAlign:
                                                            'left',

                                                        cursor:
                                                            'pointer'
                                                    }}
                                                >

                                                    <span
                                                        style={{
                                                            width:
                                                                54,

                                                            height:
                                                                54,

                                                            borderRadius:
                                                                15,

                                                            display:
                                                                'grid',

                                                            placeItems:
                                                                'center',

                                                            background:
                                                                'linear-gradient(145deg,#fff6db,#fff0ee)',

                                                            fontSize:
                                                                29
                                                        }}
                                                    >
                                                        {song.emoji || '🎵'}
                                                    </span>


                                                    <span
                                                        style={{
                                                            minWidth:
                                                                0,

                                                            display:
                                                                'grid',

                                                            gap:
                                                                4
                                                        }}
                                                    >

                                                        <strong
                                                            style={{
                                                                fontSize:
                                                                    15,

                                                                lineHeight:
                                                                    1.35
                                                            }}
                                                        >
                                                            {song.title}
                                                        </strong>

                                                        <span
                                                            className="muted"
                                                            style={{
                                                                fontSize:
                                                                    12,

                                                                lineHeight:
                                                                    1.4
                                                            }}
                                                        >
                                                            {song.program}
                                                            {song.category
                                                                ? ` · ${song.category}`
                                                                : ''}
                                                        </span>

                                                    </span>


                                                    <span
                                                        style={{
                                                            justifySelf:
                                                                'end',

                                                            color:
                                                                accessible
                                                                    ? '#a09184'
                                                                    : '#b7771f',

                                                            fontSize:
                                                                accessible
                                                                    ? 24
                                                                    : 16
                                                        }}
                                                    >
                                                        {accessible
                                                            ? '›'
                                                            : '🔒'}
                                                    </span>

                                                </button>

                                            );

                                        }
                                    )}

                                </div>

                            </section>

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
                    <p
                        className="muted"
                        style={{
                            margin:
                                0
                        }}
                    >
                        {
                            loggedIn &&
                            membership &&
                            availablePrograms.length === 0
                                ? '이용 가능한 클래스가 아직 연결되지 않았습니다.'
                                : '공개된 노래가 없습니다.'
                        }
                    </p>
                </div>

            )}

        </section>

    );

}


function ProgramButton({
    active,
    onClick,
    children
}) {

    return (

        <button
            type="button"
            onClick={onClick}
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
