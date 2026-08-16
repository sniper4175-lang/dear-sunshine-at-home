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


    /*
     * 반복 방식
     *
     * one      = 1곡 반복
     * all      = 전체 반복
     * selected = 선택곡 반복
     */
    const [
        mode,
        setMode
    ] =
        useState('all');


    /*
     * 아직 플레이리스트에 담기 전
     * 사용자가 체크한 곡
     */
    const [
        selectedSlugs,
        setSelectedSlugs
    ] =
        useState([]);


    /*
     * 실제 재생 목록
     */
    const [
        playlist,
        setPlaylist
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


    /*
     * 현재 회원이 재생할 수 있는 곡만
     */
    const playableSongs =
        songs.filter(
            song =>
                accessibleSlugs.includes(
                    song.slug
                )
        );


    const currentSong =
        playlist.find(
            song =>
                song.slug ===
                currentSlug
        ) || null;


    /*
     * signed URL
     */
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


    /*
     * 특정 곡 바로 재생
     */
    async function playSong(
        song
    ) {

        if (!song) {
            return;
        }


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


    /*
     * URL이 바뀌면 자동 재생
     */
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


    /*
     * 곡 선택
     */
    function toggleSelected(
        slug
    ) {

        /*
         * 1곡 반복은
         * 하나만 선택 가능
         */
        if (
            mode ===
            'one'
        ) {

            setSelectedSlugs(
                previous =>
                    previous.includes(
                        slug
                    )
                        ? []
                        : [
                            slug
                        ]
            );


            return;

        }


        /*
         * 선택곡 반복은
         * 여러 개 선택 가능
         */
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


    /*
     * 반복 모드 변경
     */
    function changeMode(
        nextMode
    ) {

        setMode(
            nextMode
        );


        /*
         * 새로운 모드를 선택하면
         * 체크 목록 초기화
         */
        setSelectedSlugs(
            []
        );

    }


    /*
     * 설정한 곡을
     * 실제 플레이리스트에 담고 재생
     */
    async function makePlaylistAndPlay() {

        let nextPlaylist =
            [];


        /*
         * 전체 반복
         */
        if (
            mode ===
            'all'
        ) {

            nextPlaylist =
                playableSongs;

        }


        /*
         * 1곡 반복
         */
        if (
            mode ===
            'one'
        ) {

            if (
                selectedSlugs.length !==
                1
            ) {

                setError(
                    '반복할 노래 한 곡을 선택해주세요.'
                );

                return;

            }


            nextPlaylist =
                playableSongs.filter(
                    song =>
                        selectedSlugs.includes(
                            song.slug
                        )
                );

        }


        /*
         * 선택곡 반복
         */
        if (
            mode ===
            'selected'
        ) {

            if (
                selectedSlugs.length ===
                0
            ) {

                setError(
                    '반복할 노래를 선택해주세요.'
                );

                return;

            }


            nextPlaylist =
                playableSongs.filter(
                    song =>
                        selectedSlugs.includes(
                            song.slug
                        )
                );

        }


        if (
            nextPlaylist.length ===
            0
        ) {

            setError(
                '재생할 수 있는 노래가 없습니다.'
            );

            return;

        }


        setError(
            ''
        );


        setPlaylist(
            nextPlaylist
        );


        await playSong(
            nextPlaylist[0]
        );

    }


    /*
     * 재생 / 일시정지
     */
    async function togglePlay() {

        /*
         * 아직 실제 playlist가 없으면
         * 먼저 만들어서 재생
         */
        if (
            playlist.length ===
            0
        ) {

            await makePlaylistAndPlay();

            return;

        }


        const audio =
            audioRef.current;


        if (!audio) {

            await playSong(
                playlist[0]
            );

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


    function currentIndex() {

        return playlist.findIndex(
            song =>
                song.slug ===
                currentSlug
        );

    }


    /*
     * 다음곡
     */
    async function nextSong() {

        if (
            playlist.length ===
            0
        ) {
            return;
        }


        /*
         * 한 곡 반복
         */
        if (
            mode ===
            'one'
        ) {

            await playSong(
                currentSong ||
                playlist[0]
            );

            return;

        }


        const index =
            currentIndex();


        const nextIndex =
            index < 0 ||
            index >=
                playlist.length - 1
                ? 0
                : index + 1;


        await playSong(
            playlist[
                nextIndex
            ]
        );

    }


    /*
     * 이전곡
     */
    async function previousSong() {

        if (
            playlist.length ===
            0
        ) {
            return;
        }


        if (
            mode ===
            'one'
        ) {

            await playSong(
                currentSong ||
                playlist[0]
            );

            return;

        }


        const index =
            currentIndex();


        const previousIndex =
            index <= 0
                ? playlist.length - 1
                : index - 1;


        await playSong(
            playlist[
                previousIndex
            ]
        );

    }


    /*
     * 곡 끝났을 때
     */
    async function handleEnded() {

        if (
            playlist.length ===
            0
        ) {
            return;
        }


        /*
         * 한 곡 반복
         */
        if (
            mode ===
            'one'
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
         * 전체 / 선택곡 반복
         */
        await nextSong();

    }


    /*
     * 플레이리스트에서 삭제
     */
    async function removeFromPlaylist(
        slug
    ) {

        const removeIndex =
            playlist.findIndex(
                song =>
                    song.slug ===
                    slug
            );


        const wasCurrent =
            slug ===
            currentSlug;


        const nextPlaylist =
            playlist.filter(
                song =>
                    song.slug !==
                    slug
            );


        setPlaylist(
            nextPlaylist
        );


        /*
         * 선택 상태에서도 같이 제거
         */
        setSelectedSlugs(
            previous =>
                previous.filter(
                    item =>
                        item !== slug
                )
        );


        /*
         * 현재 재생곡이 아니라면
         * 목록만 삭제
         */
        if (!wasCurrent) {
            return;
        }


        /*
         * 현재곡을 삭제했고
         * 남은 곡도 없다면 정지
         */
        if (
            nextPlaylist.length ===
            0
        ) {

            if (
                audioRef.current
            ) {

                audioRef.current.pause();

            }


            setCurrentSlug(
                ''
            );

            setAudioUrl(
                ''
            );

            setPlaying(
                false
            );


            return;

        }


        /*
         * 삭제한 다음 위치의 곡 재생
         */
        const nextIndex =
            removeIndex >=
            nextPlaylist.length
                ? 0
                : removeIndex;


        await playSong(
            nextPlaylist[
                nextIndex
            ]
        );

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
                        5,

                    fontSize:
                        22
                }}
            >
                나만의 플레이리스트
            </h2>


            <p
                style={{
                    margin:
                        '0 0 16px',

                    color:
                        '#8d8175',

                    fontSize:
                        13,

                    lineHeight:
                        1.6
                }}
            >
                반복 방식을 고르고
                원하는 노래를 담아보세요.
            </p>


            {/* ============================
                반복 방식
            ============================ */}

            <div
                style={{
                    display:
                        'grid',

                    gridTemplateColumns:
                        'repeat(3, minmax(0, 1fr))',

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
                        changeMode(
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
                        changeMode(
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
                        changeMode(
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


            {/* ============================
                선택할 노래
            ============================ */}

            {
                (
                    mode ===
                    'one' ||
                    mode ===
                    'selected'
                ) && (

                    <div
                        style={{
                            marginBottom:
                                14,

                            padding:
                                12,

                            borderRadius:
                                16,

                            background:
                                '#fff'
                        }}
                    >

                        <strong
                            style={{
                                display:
                                    'block',

                                marginBottom:
                                    9,

                                fontSize:
                                    14
                            }}
                        >
                            {
                                mode ===
                                'one'
                                    ? '반복할 노래 한 곡 선택'
                                    : '반복할 노래 선택'
                            }
                        </strong>


                        <div
                            style={{
                                display:
                                    'grid',

                                gap:
                                    7,

                                maxHeight:
                                    260,

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

                                                    color:
                                                        '#3d3026',

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

                                                        overflow:
                                                            'hidden',

                                                        textOverflow:
                                                            'ellipsis',

                                                        whiteSpace:
                                                            'nowrap',

                                                        fontSize:
                                                            13,

                                                        fontWeight:
                                                            750
                                                    }}
                                                >
                                                    {song.title}
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
                            {selectedSlugs.length}곡 선택됨
                        </p>

                    </div>

                )
            }


            {/* 플레이리스트 만들기 */}

            <button
                type="button"
                onClick={
                    makePlaylistAndPlay
                }
                disabled={
                    loading
                }
                style={{
                    width:
                        '100%',

                    marginBottom:
                        18,

                    padding:
                        '13px 15px',

                    border:
                        'none',

                    borderRadius:
                        14,

                    background:
                        '#f9b846',

                    color:
                        '#3d3026',

                    fontWeight:
                        900,

                    cursor:
                        'pointer'
                }}
            >
                {
                    mode ===
                    'all'
                        ? '전체곡 플레이리스트 재생 ▶'
                        : '플레이리스트에 담고 재생 ▶'
                }
            </button>


            {/* 실제 audio */}

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


            {/* ============================
                현재 재생
            ============================ */}

            <div
                style={{
                    marginBottom:
                        14,

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

                <small
                    style={{
                        display:
                            'block',

                        marginBottom:
                            4,

                        opacity:
                            0.7
                    }}
                >
                    NOW PLAYING
                </small>


                <strong
                    style={{
                        display:
                            'block',

                        minHeight:
                            22,

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
                            ? `${currentSong.emoji || '🎵'} ${currentSong.title}`
                            : '재생 중인 노래가 없어요'
                    }
                </strong>


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


            {/* ============================
                실제 플레이리스트 화면
            ============================ */}

            <div
                style={{
                    padding:
                        13,

                    border:
                        '1px solid #eee3d5',

                    borderRadius:
                        16,

                    background:
                        '#fff'
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
                            10,

                        marginBottom:
                            10
                    }}
                >

                    <strong>
                        재생 목록
                    </strong>


                    <span
                        style={{
                            color:
                                '#8d8175',

                            fontSize:
                                12
                        }}
                    >
                        {playlist.length}곡
                    </span>

                </div>


                {
                    playlist.length ===
                    0 ? (

                        <p
                            style={{
                                margin:
                                    '18px 0',

                                textAlign:
                                    'center',

                                color:
                                    '#a3978c',

                                fontSize:
                                    13
                            }}
                        >
                            아직 담긴 노래가 없어요.
                        </p>

                    ) : (

                        <div
                            style={{
                                display:
                                    'grid',

                                gap:
                                    7
                            }}
                        >

                            {
                                playlist.map(
                                    (
                                        song,
                                        index
                                    ) => {

                                        const active =
                                            song.slug ===
                                            currentSlug;


                                        return (

                                            <div
                                                key={
                                                    song.slug
                                                }
                                                style={{
                                                    display:
                                                        'grid',

                                                    gridTemplateColumns:
                                                        'minmax(0, 1fr) 36px',

                                                    gap:
                                                        6,

                                                    alignItems:
                                                        'center'
                                                }}
                                            >

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        playSong(
                                                            song
                                                        )
                                                    }
                                                    style={{
                                                        display:
                                                            'flex',

                                                        alignItems:
                                                            'center',

                                                        gap:
                                                            10,

                                                        minWidth:
                                                            0,

                                                        padding:
                                                            '10px 11px',

                                                        border:
                                                            active
                                                                ? '1px solid #f9b846'
                                                                : '1px solid #f1e7dc',

                                                        borderRadius:
                                                            12,

                                                        background:
                                                            active
                                                                ? '#fff3cf'
                                                                : '#fffaf5',

                                                        color:
                                                            '#3d3026',

                                                        textAlign:
                                                            'left',

                                                        cursor:
                                                            'pointer'
                                                    }}
                                                >

                                                    <span
                                                        style={{
                                                            width:
                                                                21,

                                                            flexShrink:
                                                                0,

                                                            color:
                                                                active
                                                                    ? '#b7771f'
                                                                    : '#a3978c',

                                                            fontSize:
                                                                12,

                                                            fontWeight:
                                                                900,

                                                            textAlign:
                                                                'center'
                                                        }}
                                                    >
                                                        {
                                                            active
                                                                ? '▶'
                                                                : index + 1
                                                        }
                                                    </span>


                                                    <span
                                                        style={{
                                                            fontSize:
                                                                18
                                                        }}
                                                    >
                                                        {
                                                            song.emoji ||
                                                            '🎵'
                                                        }
                                                    </span>


                                                    <span
                                                        style={{
                                                            minWidth:
                                                                0,

                                                            overflow:
                                                                'hidden',

                                                            textOverflow:
                                                                'ellipsis',

                                                            whiteSpace:
                                                                'nowrap',

                                                            fontSize:
                                                                13,

                                                            fontWeight:
                                                                active
                                                                    ? 900
                                                                    : 700
                                                        }}
                                                    >
                                                        {song.title}
                                                    </span>

                                                </button>


                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeFromPlaylist(
                                                            song.slug
                                                        )
                                                    }
                                                    aria-label={`${song.title} 플레이리스트에서 삭제`}
                                                    title="플레이리스트에서 삭제"
                                                    style={{
                                                        width:
                                                            36,

                                                        height:
                                                            36,

                                                        border:
                                                            'none',

                                                        borderRadius:
                                                            '50%',

                                                        background:
                                                            '#f4eee6',

                                                        color:
                                                            '#8d8175',

                                                        cursor:
                                                            'pointer',

                                                        fontSize:
                                                            15,

                                                        fontWeight:
                                                            900
                                                    }}
                                                >
                                                    ×
                                                </button>

                                            </div>

                                        );

                                    }
                                )
                            }

                        </div>

                    )
                }

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
                    '11px 4px',

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