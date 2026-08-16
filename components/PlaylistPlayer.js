'use client';

import {
    useEffect,
    useRef,
    useState
} from 'react';


export default function PlaylistPlayer({
    songs,
    accessibleSlugs
}) {

    const audioRef =
        useRef(null);


    const [
        mode,
        setMode
    ] =
        useState('all');


    const [
        selectedSlugs,
        setSelectedSlugs
    ] =
        useState([]);


    const [
        currentSlug,
        setCurrentSlug
    ] =
        useState('');


    const [
        audioUrl,
        setAudioUrl
    ] =
        useState('');


    const [
        playing,
        setPlaying
    ] =
        useState(false);


    const [
        loading,
        setLoading
    ] =
        useState(false);


    const [
        error,
        setError
    ] =
        useState('');


    const playableSongs =
        songs.filter(
            song =>
                accessibleSlugs.includes(
                    song.slug
                )
        );


    const selectedSongs =
        playableSongs.filter(
            song =>
                selectedSlugs.includes(
                    song.slug
                )
        );


    const queue =
        mode === 'selected'
            ? selectedSongs
            : playableSongs;


    const currentSong =
        playableSongs.find(
            song =>
                song.slug ===
                currentSlug
        ) || null;


    async function getAudioUrl(
        slug
    ) {

        setLoading(
            true
        );

        setError(
            ''
        );


        try {

            const response =
                await fetch(
                    `/api/audio-url?slug=${encodeURIComponent(
                        slug
                    )}`,
                    {
                        cache:
                            'no-store'
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.url
            ) {

                throw new Error(
                    data.error ||
                    '음원을 불러오지 못했습니다.'
                );

            }


            return data.url;


        } catch (e) {

            console.error(
                e
            );


            setError(
                e.message ||
                '음원을 불러오지 못했습니다.'
            );


            return null;


        } finally {

            setLoading(
                false
            );

        }

    }


    async function playSong(
        song
    ) {

        if (!song) {
            return;
        }


        setError(
            ''
        );


        const url =
            await getAudioUrl(
                song.slug
            );


        if (!url) {
            return;
        }


        setCurrentSlug(
            song.slug
        );

        setAudioUrl(
            url
        );

    }


    useEffect(
        () => {

            if (
                !audioUrl ||
                !audioRef.current
            ) {
                return;
            }


            const audio =
                audioRef.current;


            audio
                .play()
                .then(
                    () =>
                        setPlaying(
                            true
                        )
                )
                .catch(
                    e => {

                        if (
                            e?.name !==
                            'AbortError'
                        ) {

                            console.error(
                                e
                            );

                            setError(
                                '음원을 재생하지 못했습니다.'
                            );

                        }

                    }
                );

        },
        [
            audioUrl
        ]
    );


    function toggleSelected(
        slug
    ) {

        setSelectedSlugs(
            previous => {

                if (
                    previous.includes(
                        slug
                    )
                ) {

                    return previous.filter(
                        item =>
                            item !== slug
                    );

                }


                return [
                    ...previous,
                    slug
                ];

            }
        );

    }


    async function startPlaylist() {

        if (
            queue.length ===
            0
        ) {

            setError(
                mode === 'selected'
                    ? '반복할 노래를 먼저 선택해주세요.'
                    : '재생 가능한 노래가 없습니다.'
            );

            return;

        }


        await playSong(
            queue[0]
        );

    }


    async function togglePlay() {

        if (
            !currentSong
        ) {

            await startPlaylist();

            return;

        }


        const audio =
            audioRef.current;


        if (!audio) {
            return;
        }


        if (
            audio.paused
        ) {

            try {

                await audio.play();

            } catch (e) {

                console.error(
                    e
                );

            }

        } else {

            audio.pause();

        }

    }


    function currentQueueIndex() {

        return queue.findIndex(
            song =>
                song.slug ===
                currentSlug
        );

    }


    async function nextSong() {

        if (
            queue.length ===
            0
        ) {
            return;
        }


        const index =
            currentQueueIndex();


        const nextIndex =
            index < 0 ||
            index >=
                queue.length - 1
                ? 0
                : index + 1;


        await playSong(
            queue[
                nextIndex
            ]
        );

    }


    async function previousSong() {

        if (
            queue.length ===
            0
        ) {
            return;
        }


        const index =
            currentQueueIndex();


        const previousIndex =
            index <= 0
                ? queue.length - 1
                : index - 1;


        await playSong(
            queue[
                previousIndex
            ]
        );

    }


    async function handleEnded() {

        /*
         * 한 곡 반복
         */
        if (
            mode === 'one'
        ) {

            const audio =
                audioRef.current;


            if (audio) {

                audio.currentTime =
                    0;


                try {

                    await audio.play();

                } catch (e) {

                    console.error(
                        e
                    );

                }

            }


            return;

        }


        /*
         * 전체 반복 / 선택곡 반복
         */
        await nextSong();

    }


    return (

        <div
            style={{
                marginBottom:
                    26,

                padding:
                    18,

                border:
                    '1px solid #eee0cf',

                borderRadius:
                    22,

                background:
                    '#fffaf2'
            }}
        >

            <p
                className="eyebrow"
                style={{
                    marginBottom:
                        7
                }}
            >
                PLAYLIST
            </p>


            <h2
                style={{
                    marginTop:
                        0,

                    marginBottom:
                        6,

                    fontSize:
                        22
                }}
            >
                플레이리스트
            </h2>


            <p
                style={{
                    marginTop:
                        0,

                    marginBottom:
                        16,

                    color:
                        '#8d8175',

                    fontSize:
                        13,

                    lineHeight:
                        1.6
                }}
            >
                원하는 방식으로 노래를
                연속해서 들어보세요.
            </p>


            {/* 반복 모드 */}

            <div
                style={{
                    display:
                        'grid',

                    gridTemplateColumns:
                        'repeat(3, 1fr)',

                    gap:
                        7,

                    marginBottom:
                        16
                }}
            >

                <ModeButton
                    active={
                        mode ===
                        'one'
                    }
                    onClick={() =>
                        setMode(
                            'one'
                        )
                    }
                >
                    🔂
                    <small>
                        1곡 반복
                    </small>
                </ModeButton>


                <ModeButton
                    active={
                        mode ===
                        'all'
                    }
                    onClick={() =>
                        setMode(
                            'all'
                        )
                    }
                >
                    🔁
                    <small>
                        전체 반복
                    </small>
                </ModeButton>


                <ModeButton
                    active={
                        mode ===
                        'selected'
                    }
                    onClick={() =>
                        setMode(
                            'selected'
                        )
                    }
                >
                    ✓
                    <small>
                        선택곡 반복
                    </small>
                </ModeButton>

            </div>


            {/* 선택곡 설정 */}

            {
                mode ===
                'selected' && (

                    <div
                        style={{
                            marginBottom:
                                16,

                            padding:
                                12,

                            borderRadius:
                                16,

                            background:
                                '#ffffff'
                        }}
                    >

                        <strong
                            style={{
                                display:
                                    'block',

                                marginBottom:
                                    10,

                                fontSize:
                                    14
                            }}
                        >
                            반복할 노래 선택
                        </strong>


                        <div
                            style={{
                                display:
                                    'grid',

                                gap:
                                    7,

                                maxHeight:
                                    240,

                                overflowY:
                                    'auto'
                            }}
                        >

                            {
                                playableSongs.map(
                                    song => {

                                        const checked =
                                            selectedSlugs.includes(
                                                song.slug
                                            );


                                        return (

                                            <button
                                                key={
                                                    song.slug
                                                }
                                                type="button"
                                                onClick={() =>
                                                    toggleSelected(
                                                        song.slug
                                                    )
                                                }
                                                style={{
                                                    display:
                                                        'flex',

                                                    alignItems:
                                                        'center',

                                                    gap:
                                                        10,

                                                    width:
                                                        '100%',

                                                    padding:
                                                        '10px 11px',

                                                    border:
                                                        checked
                                                            ? '1px solid #f9b846'
                                                            : '1px solid #eee3d5',

                                                    borderRadius:
                                                        12,

                                                    background:
                                                        checked
                                                            ? '#fff3cf'
                                                            : '#fff',

                                                    textAlign:
                                                        'left',

                                                    cursor:
                                                        'pointer'
                                                }}
                                            >

                                                <span
                                                    style={{
                                                        display:
                                                            'grid',

                                                        placeItems:
                                                            'center',

                                                        width:
                                                            24,

                                                        height:
                                                            24,

                                                        flexShrink:
                                                            0,

                                                        borderRadius:
                                                            '50%',

                                                        background:
                                                            checked
                                                                ? '#f9b846'
                                                                : '#f4eee6',

                                                        fontWeight:
                                                            900
                                                    }}
                                                >
                                                    {
                                                        checked
                                                            ? '✓'
                                                            : ''
                                                    }
                                                </span>


                                                <span
                                                    style={{
                                                        minWidth:
                                                            0,

                                                        fontSize:
                                                            13,

                                                        fontWeight:
                                                            750
                                                    }}
                                                >
                                                    {
                                                        song.title
                                                    }
                                                </span>

                                            </button>

                                        );

                                    }
                                )
                            }

                        </div>


                        <p
                            style={{
                                margin:
                                    '10px 0 0',

                                color:
                                    '#b7771f',

                                fontSize:
                                    12,

                                fontWeight:
                                    800
                            }}
                        >
                            {
                                selectedSlugs.length
                            }곡 선택됨
                        </p>

                    </div>

                )
            }


            <audio
                ref={
                    audioRef
                }
                src={
                    audioUrl ||
                    undefined
                }
                preload="none"
                onPlay={() =>
                    setPlaying(
                        true
                    )
                }
                onPause={() =>
                    setPlaying(
                        false
                    )
                }
                onEnded={
                    handleEnded
                }
            />


            {/* 현재 재생곡 */}

            <div
                style={{
                    padding:
                        14,

                    borderRadius:
                        17,

                    background:
                        '#403226',

                    color:
                        '#fff'
                }}
            >

                <div
                    style={{
                        display:
                            'flex',

                        alignItems:
                            'center',

                        gap:
                            12
                    }}
                >

                    <div
                        style={{
                            minWidth:
                                0,

                            flex:
                                1
                        }}
                    >

                        <small
                            style={{
                                display:
                                    'block',

                                marginBottom:
                                    3,

                                opacity:
                                    0.7
                            }}
                        >
                            {
                                currentSong
                                    ? '현재 재생'
                                    : '재생할 노래'
                            }
                        </small>


                        <strong
                            style={{
                                display:
                                    'block',

                                overflow:
                                    'hidden',

                                textOverflow:
                                    'ellipsis',

                                whiteSpace:
                                    'nowrap'
                            }}
                        >
                            {
                                currentSong
                                    ? currentSong.title
                                    : mode ===
                                        'selected'
                                        ? `${selectedSongs.length}곡 선택됨`
                                        : `${playableSongs.length}곡 재생 가능`
                            }
                        </strong>

                    </div>


                    <span
                        style={{
                            fontSize:
                                12,

                            opacity:
                                0.75
                        }}
                    >
                        {
                            mode === 'one'
                                ? '🔂 1곡'
                                : mode === 'selected'
                                    ? '🔁 선택곡'
                                    : '🔁 전체'
                        }
                    </span>

                </div>


                <div
                    style={{
                        display:
                            'grid',

                        gridTemplateColumns:
                            '1fr 1.3fr 1fr',

                        gap:
                            8,

                        marginTop:
                            13
                    }}
                >

                    <PlayerButton
                        onClick={
                            previousSong
                        }
                    >
                        ⏮
                    </PlayerButton>


                    <PlayerButton
                        onClick={
                            togglePlay
                        }
                        primary
                        disabled={
                            loading
                        }
                    >
                        {
                            loading
                                ? '…'
                                : playing
                                    ? '❚❚'
                                    : '▶'
                        }
                    </PlayerButton>


                    <PlayerButton
                        onClick={
                            nextSong
                        }
                    >
                        ⏭
                    </PlayerButton>

                </div>

            </div>


            {error && (

                <p
                    style={{
                        margin:
                            '10px 0 0',

                        color:
                            '#bd3d3d',

                        fontSize:
                            13
                    }}
                >
                    {error}
                </p>

            )}

        </div>

    );
}


function ModeButton({
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
                display:
                    'grid',

                justifyItems:
                    'center',

                gap:
                    4,

                padding:
                    '11px 5px',

                border:
                    active
                        ? '2px solid #f9b846'
                        : '1px solid #eee3d5',

                borderRadius:
                    14,

                background:
                    active
                        ? '#fff1c9'
                        : '#fff',

                color:
                    '#3d3026',

                cursor:
                    'pointer',

                fontSize:
                    18,

                fontWeight:
                    900
            }}
        >
            {children}
        </button>

    );
}


function PlayerButton({
    onClick,
    children,
    primary = false,
    disabled = false
}) {

    return (

        <button
            type="button"
            onClick={
                onClick
            }
            disabled={
                disabled
            }
            style={{
                minHeight:
                    44,

                border:
                    'none',

                borderRadius:
                    13,

                background:
                    primary
                        ? '#f9b846'
                        : 'rgba(255,255,255,0.12)',

                color:
                    primary
                        ? '#3d3026'
                        : '#fff',

                cursor:
                    disabled
                        ? 'default'
                        : 'pointer',

                fontSize:
                    18,

                fontWeight:
                    900
            }}
        >
            {children}
        </button>

    );
}