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
     * 실제 플레이리스트
     */
    const [
        playlist,
        setPlaylist
    ] =
        useState([]);


    /*
     * 현재 재생곡
     */
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
     * 반복
     *
     * off = 반복 없음
     * all = 플레이리스트 전체 반복
     * one = 현재곡 반복
     */
    const [
        repeatMode,
        setRepeatMode
    ] =
        useState(
            'all'
        );


    /*
     * 셔플
     */
    const [
        shuffle,
        setShuffle
    ] =
        useState(false);


    /*
     * 곡 추가창
     */
    const [
        addOpen,
        setAddOpen
    ] =
        useState(false);


    /*
     * 추가하려고 선택한 곡
     */
    const [
        selectedSlugs,
        setSelectedSlugs
    ] =
        useState([]);


    /*
     * 재생 시간
     */
    const [
        currentTime,
        setCurrentTime
    ] =
        useState(0);


    const [
        duration,
        setDuration
    ] =
        useState(0);



    /*
     * ==========================================
     * 현재 회원이 재생할 수 있는 곡만
     * ==========================================
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
     * ==========================================
     * signed URL 가져오기
     * ==========================================
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
     * ==========================================
     * 특정 곡 재생
     * ==========================================
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


        setCurrentTime(
            0
        );


        setDuration(
            0
        );


        setAudioUrl(
            url
        );

    }



    /*
     * URL 변경 후 자동 재생
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
     * ==========================================
     * 플레이 / 일시정지
     * ==========================================
     */
    async function togglePlay() {

        if (
            playlist.length ===
            0
        ) {

            setAddOpen(
                true
            );


            setError(
                '먼저 플레이리스트에 노래를 담아주세요.'
            );


            return;

        }


        if (
            !currentSong
        ) {

            await playSong(
                playlist[0]
            );


            return;

        }


        const audio =
            audioRef.current;


        if (!audio) {
            return;
        }


        try {

            if (
                audio.paused
            ) {

                await audio.play();

            } else {

                audio.pause();

            }

        } catch (e) {

            console.error(
                e
            );

        }

    }



    /*
     * ==========================================
     * 반복 버튼
     *
     * 전체 → 한곡 → 끄기 → 전체
     * ==========================================
     */
    function changeRepeatMode() {

        setRepeatMode(
            previous => {

                if (
                    previous ===
                    'all'
                ) {
                    return 'one';
                }


                if (
                    previous ===
                    'one'
                ) {
                    return 'off';
                }


                return 'all';

            }
        );

    }



    /*
     * ==========================================
     * 셔플
     * ==========================================
     */
    function toggleShuffle() {

        setShuffle(
            previous =>
                !previous
        );

    }



    /*
     * 현재곡 index
     */
    function getCurrentIndex() {

        return playlist.findIndex(
            song =>
                song.slug ===
                currentSlug
        );

    }



    /*
     * ==========================================
     * 랜덤곡
     * ==========================================
     */
    function getRandomSong() {

        if (
            playlist.length ===
            0
        ) {
            return null;
        }


        if (
            playlist.length ===
            1
        ) {
            return playlist[0];
        }


        const candidates =
            playlist.filter(
                song =>
                    song.slug !==
                    currentSlug
            );


        const index =
            Math.floor(
                Math.random() *
                candidates.length
            );


        return candidates[
            index
        ];

    }



    /*
     * ==========================================
     * 다음곡
     * ==========================================
     */
    async function nextSong(
        fromEnded = false
    ) {

        if (
            playlist.length ===
            0
        ) {
            return;
        }


        /*
         * 한곡 반복
         */
        if (
            repeatMode ===
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
         * 셔플
         */
        if (
            shuffle
        ) {

            const randomSong =
                getRandomSong();


            if (randomSong) {

                await playSong(
                    randomSong
                );

            }


            return;

        }


        const currentIndex =
            getCurrentIndex();


        /*
         * 아직 선택된 곡 없음
         */
        if (
            currentIndex < 0
        ) {

            await playSong(
                playlist[0]
            );


            return;

        }


        /*
         * 마지막곡
         */
        if (
            currentIndex ===
            playlist.length - 1
        ) {

            if (
                repeatMode ===
                'all'
            ) {

                await playSong(
                    playlist[0]
                );


                return;

            }


            /*
             * 반복 꺼짐
             */
            if (
                fromEnded
            ) {

                setPlaying(
                    false
                );


                return;

            }


            /*
             * 다음 버튼 직접 클릭 시
             * 첫 곡으로 이동
             */
            await playSong(
                playlist[0]
            );


            return;

        }


        await playSong(
            playlist[
                currentIndex + 1
            ]
        );

    }



    /*
     * ==========================================
     * 이전곡
     * ==========================================
     */
    async function previousSong() {

        if (
            playlist.length ===
            0
        ) {
            return;
        }


        /*
         * 셔플일 때 랜덤
         */
        if (
            shuffle
        ) {

            const randomSong =
                getRandomSong();


            if (randomSong) {

                await playSong(
                    randomSong
                );

            }


            return;

        }


        const currentIndex =
            getCurrentIndex();


        if (
            currentIndex <= 0
        ) {

            await playSong(
                playlist[
                    playlist.length - 1
                ]
            );


            return;

        }


        await playSong(
            playlist[
                currentIndex - 1
            ]
        );

    }



    /*
     * ==========================================
     * 곡이 끝났을 때
     * ==========================================
     */
    async function handleEnded() {

        await nextSong(
            true
        );

    }



    /*
     * ==========================================
     * 추가할 곡 선택
     * ==========================================
     */
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



    /*
     * ==========================================
     * 플레이리스트에 추가
     *
     * 기존 목록은 유지하고
     * 중복되지 않는 곡만 뒤에 추가
     * ==========================================
     */
    function buildAddedPlaylist() {

        if (
            selectedSlugs.length ===
            0
        ) {

            setError(
                '추가할 노래를 선택해주세요.'
            );


            return null;

        }


        const selectedSongs =
            playableSongs.filter(
                song =>
                    selectedSlugs.includes(
                        song.slug
                    )
            );


        const existingSlugs =
            playlist.map(
                song =>
                    song.slug
            );


        const newSongs =
            selectedSongs.filter(
                song =>
                    !existingSlugs.includes(
                        song.slug
                    )
            );


        const nextPlaylist =
            [
                ...playlist,
                ...newSongs
            ];


        setError(
            ''
        );


        return {
            nextPlaylist,
            selectedSongs
        };

    }



    /*
     * 담기만
     */
    function addOnly() {

        const result =
            buildAddedPlaylist();


        if (!result) {
            return;
        }


        setPlaylist(
            result.nextPlaylist
        );


        setSelectedSlugs(
            []
        );


        setAddOpen(
            false
        );

    }



    /*
     * 담고 바로 재생
     */
    async function addAndPlay() {

        const result =
            buildAddedPlaylist();


        if (!result) {
            return;
        }


        setPlaylist(
            result.nextPlaylist
        );


        setSelectedSlugs(
            []
        );


        setAddOpen(
            false
        );


        if (
            result.selectedSongs.length >
            0
        ) {

            await playSong(
                result.selectedSongs[0]
            );

        }

    }



    /*
     * ==========================================
     * 플레이리스트에서 삭제
     * ==========================================
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


        if (!wasCurrent) {
            return;
        }


        /*
         * 전부 삭제됨
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


            setCurrentTime(
                0
            );


            setDuration(
                0
            );


            return;

        }


        /*
         * 삭제한 곡 다음 위치 재생
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



    /*
     * ==========================================
     * 재생 위치 변경
     * ==========================================
     */
    function seekAudio(
        e
    ) {

        const value =
            Number(
                e.target.value
            );


        if (
            audioRef.current
        ) {

            audioRef.current.currentTime =
                value;

        }


        setCurrentTime(
            value
        );

    }



    /*
     * ==========================================
     * 시간 표시
     * ==========================================
     */
    function formatTime(
        seconds
    ) {

        if (
            !Number.isFinite(
                seconds
            )
        ) {
            return '0:00';
        }


        const minutes =
            Math.floor(
                seconds /
                60
            );


        const remainingSeconds =
            Math.floor(
                seconds %
                60
            );


        return `${minutes}:${String(
            remainingSeconds
        ).padStart(
            2,
            '0'
        )}`;

    }



    /*
     * 반복 아이콘
     */
    const repeatIcon =
        repeatMode ===
        'one'
            ? '🔂'
            : '🔁';


    const repeatLabel =
        repeatMode ===
        'one'
            ? '1곡 반복'
            : repeatMode ===
                'all'
                ? '전체 반복'
                : '반복 끄기';



    return (

        <div
            style={{
                marginBottom:
                    30
            }}
        >

            {/* ==================================
                실제 AUDIO
            =================================== */}

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

                onLoadedMetadata={e =>
                    setDuration(
                        e.currentTarget.duration ||
                        0
                    )
                }

                onTimeUpdate={e =>
                    setCurrentTime(
                        e.currentTarget.currentTime ||
                        0
                    )
                }

                onEnded={
                    handleEnded
                }
            />



            {/* ==================================
                PLAYER
            =================================== */}

            <div
                style={{
                    padding:
                        '24px 18px 20px',

                    borderRadius:
                        26,

                    background:
                        'linear-gradient(145deg, #544233, #8b725c)',

                    color:
                        '#fff',

                    boxShadow:
                        '0 14px 35px rgba(61,48,38,0.16)'
                }}
            >

                {/* 앨범 이미지 느낌 */}

                <div
                    style={{
                        display:
                            'grid',

                        placeItems:
                            'center',

                        width:
                            150,

                        height:
                            150,

                        margin:
                            '0 auto 18px',

                        borderRadius:
                            25,

                        background:
                            'linear-gradient(145deg, #fff7e5, #f4d797)',

                        boxShadow:
                            '0 12px 25px rgba(0,0,0,0.15)',

                        fontSize:
                            72
                    }}
                >
                    {
                        currentSong?.emoji ||
                        '🎵'
                    }
                </div>


                <div
                    style={{
                        textAlign:
                            'center',

                        minHeight:
                            67
                    }}
                >

                    <strong
                        style={{
                            display:
                                'block',

                            overflow:
                                'hidden',

                            textOverflow:
                                'ellipsis',

                            whiteSpace:
                                'nowrap',

                            fontSize:
                                21
                        }}
                    >
                        {
                            currentSong
                                ? currentSong.title
                                : '플레이리스트'
                        }
                    </strong>


                    <span
                        style={{
                            display:
                                'block',

                            marginTop:
                                6,

                            opacity:
                                0.72,

                            fontSize:
                                14
                        }}
                    >
                        {
                            currentSong
                                ? currentSong.program
                                : '노래를 추가해보세요'
                        }
                    </span>

                </div>



                {/* 진행바 */}

                <input
                    type="range"
                    min="0"
                    max={
                        duration ||
                        0
                    }
                    step="0.1"
                    value={
                        Math.min(
                            currentTime,
                            duration ||
                            0
                        )
                    }
                    onChange={
                        seekAudio
                    }
                    disabled={
                        !currentSong
                    }
                    style={{
                        width:
                            '100%',

                        marginTop:
                            12,

                        accentColor:
                            '#f9b846'
                    }}
                />


                <div
                    style={{
                        display:
                            'flex',

                        justifyContent:
                            'space-between',

                        marginTop:
                            3,

                        opacity:
                            0.75,

                        fontSize:
                            11
                    }}
                >
                    <span>
                        {
                            formatTime(
                                currentTime
                            )
                        }
                    </span>

                    <span>
                        {
                            formatTime(
                                duration
                            )
                        }
                    </span>
                </div>



                {/* 컨트롤 */}

                <div
                    style={{
                        display:
                            'grid',

                        gridTemplateColumns:
                            '1fr 1fr 1.35fr 1fr 1fr',

                        alignItems:
                            'center',

                        gap:
                            7,

                        marginTop:
                            13
                    }}
                >

                    {/* 반복 */}

                    <button
                        type="button"
                        onClick={
                            changeRepeatMode
                        }
                        style={{
                            border:
                                'none',

                            background:
                                'transparent',

                            color:
                                repeatMode ===
                                'off'
                                    ? 'rgba(255,255,255,0.55)'
                                    : '#f9b846',

                            cursor:
                                'pointer'
                        }}
                    >

                        <span
                            style={{
                                display:
                                    'block',

                                fontSize:
                                    26
                            }}
                        >
                            {repeatIcon}
                        </span>


                        <small
                            style={{
                                display:
                                    'block',

                                marginTop:
                                    2,

                                whiteSpace:
                                    'nowrap'
                            }}
                        >
                            {repeatLabel}
                        </small>

                    </button>



                    {/* 이전 */}

                    <ControlButton
                        onClick={
                            previousSong
                        }
                    >
                        ⏮
                    </ControlButton>



                    {/* 재생 */}

                    <button
                        type="button"
                        onClick={
                            togglePlay
                        }
                        disabled={
                            loading
                        }
                        style={{
                            display:
                                'grid',

                            placeItems:
                                'center',

                            width:
                                68,

                            height:
                                68,

                            margin:
                                '0 auto',

                            border:
                                'none',

                            borderRadius:
                                '50%',

                            background:
                                '#fff',

                            color:
                                '#3d3026',

                            boxShadow:
                                '0 8px 18px rgba(0,0,0,0.15)',

                            cursor:
                                'pointer',

                            fontSize:
                                27,

                            fontWeight:
                                900
                        }}
                    >
                        {
                            loading
                                ? '…'
                                : playing
                                    ? '❚❚'
                                    : '▶'
                        }
                    </button>



                    {/* 다음 */}

                    <ControlButton
                        onClick={() =>
                            nextSong(
                                false
                            )
                        }
                    >
                        ⏭
                    </ControlButton>



                    {/* 셔플 */}

                    <button
                        type="button"
                        onClick={
                            toggleShuffle
                        }
                        style={{
                            border:
                                'none',

                            background:
                                'transparent',

                            color:
                                shuffle
                                    ? '#f9b846'
                                    : 'rgba(255,255,255,0.65)',

                            cursor:
                                'pointer'
                        }}
                    >

                        <span
                            style={{
                                display:
                                    'block',

                                fontSize:
                                    25
                            }}
                        >
                            🔀
                        </span>


                        <small
                            style={{
                                display:
                                    'block',

                                marginTop:
                                    2
                            }}
                        >
                            셔플
                        </small>

                    </button>

                </div>

            </div>



            {/* ==================================
                PLAYLIST HEADER
            =================================== */}

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

                    marginTop:
                        24,

                    marginBottom:
                        12
                }}
            >

                <div>

                    <h2
                        style={{
                            margin:
                                0,

                            fontSize:
                                22
                        }}
                    >
                        플레이리스트
                    </h2>


                    <span
                        style={{
                            display:
                                'block',

                            marginTop:
                                3,

                            color:
                                '#8d8175',

                            fontSize:
                                12
                        }}
                    >
                        {playlist.length}곡
                    </span>

                </div>


                <button
                    type="button"
                    onClick={() => {

                        setSelectedSlugs(
                            []
                        );


                        setAddOpen(
                            true
                        );

                    }}
                    style={{
                        padding:
                            '10px 14px',

                        border:
                            '1px solid #ecd9bd',

                        borderRadius:
                            14,

                        background:
                            '#fffaf2',

                        color:
                            '#3d3026',

                        cursor:
                            'pointer',

                        fontWeight:
                            850
                    }}
                >
                    ＋ 곡 추가
                </button>

            </div>



            {/* ==================================
                PLAYLIST LIST
            =================================== */}

            <div
                style={{
                    overflow:
                        'hidden',

                    border:
                        '1px solid #eee3d5',

                    borderRadius:
                        18,

                    background:
                        '#fff'
                }}
            >

                {
                    playlist.length ===
                    0 ? (

                        <div
                            style={{
                                padding:
                                    '34px 20px',

                                textAlign:
                                    'center',

                                color:
                                    '#9d9186'
                            }}
                        >
                            <div
                                style={{
                                    fontSize:
                                        30,

                                    marginBottom:
                                        8
                                }}
                            >
                                🎶
                            </div>

                            아직 담긴 노래가 없어요.
                            <br />

                            <button
                                type="button"
                                onClick={() =>
                                    setAddOpen(
                                        true
                                    )
                                }
                                style={{
                                    marginTop:
                                        12,

                                    border:
                                        'none',

                                    background:
                                        'transparent',

                                    color:
                                        '#b7771f',

                                    fontWeight:
                                        850,

                                    cursor:
                                        'pointer'
                                }}
                            >
                                노래 추가하기
                            </button>
                        </div>

                    ) : (

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
                                                'minmax(0,1fr) 42px',

                                            alignItems:
                                                'center',

                                            minHeight:
                                                62,

                                            borderBottom:
                                                index ===
                                                playlist.length - 1
                                                    ? 'none'
                                                    : '1px solid #f1e7dc',

                                            background:
                                                active
                                                    ? '#fff7df'
                                                    : '#fff'
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
                                                    '11px 13px',

                                                border:
                                                    'none',

                                                background:
                                                    'transparent',

                                                color:
                                                    '#3d3026',

                                                cursor:
                                                    'pointer',

                                                textAlign:
                                                    'left'
                                            }}
                                        >

                                            <span
                                                style={{
                                                    width:
                                                        22,

                                                    flexShrink:
                                                        0,

                                                    color:
                                                        active
                                                            ? '#d89017'
                                                            : '#a3978c',

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
                                                        21
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

                                                    flex:
                                                        1
                                                }}
                                            >

                                                <strong
                                                    style={{
                                                        display:
                                                            'block',

                                                        overflow:
                                                            'hidden',

                                                        textOverflow:
                                                            'ellipsis',

                                                        whiteSpace:
                                                            'nowrap',

                                                        fontSize:
                                                            14
                                                    }}
                                                >
                                                    {song.title}
                                                </strong>


                                                <small
                                                    style={{
                                                        display:
                                                            'block',

                                                        marginTop:
                                                            2,

                                                        overflow:
                                                            'hidden',

                                                        textOverflow:
                                                            'ellipsis',

                                                        whiteSpace:
                                                            'nowrap',

                                                        color:
                                                            '#9b8e82'
                                                    }}
                                                >
                                                    {song.program}
                                                </small>

                                            </span>

                                        </button>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeFromPlaylist(
                                                    song.slug
                                                )
                                            }
                                            aria-label={`${song.title} 삭제`}
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
                                                    'transparent',

                                                color:
                                                    '#9d9186',

                                                cursor:
                                                    'pointer',

                                                fontSize:
                                                    21
                                            }}
                                        >
                                            ×
                                        </button>

                                    </div>

                                );

                            }
                        )

                    )
                }

            </div>



            {/* ==================================
                곡 추가 창
            =================================== */}

            {
                addOpen && (

                    <div
                        style={{
                            marginTop:
                                16,

                            padding:
                                16,

                            border:
                                '1px solid #eee0cf',

                            borderRadius:
                                20,

                            background:
                                '#fff',

                            boxShadow:
                                '0 10px 30px rgba(61,48,38,0.10)'
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

                                marginBottom:
                                    5
                            }}
                        >

                            <strong
                                style={{
                                    fontSize:
                                        18
                                }}
                            >
                                곡 추가하기
                            </strong>


                            <button
                                type="button"
                                onClick={() =>
                                    setAddOpen(
                                        false
                                    )
                                }
                                style={{
                                    border:
                                        'none',

                                    background:
                                        'transparent',

                                    cursor:
                                        'pointer',

                                    fontSize:
                                        23,

                                    color:
                                        '#8d8175'
                                }}
                            >
                                ×
                            </button>

                        </div>


                        <p
                            style={{
                                margin:
                                    '0 0 13px',

                                color:
                                    '#8d8175',

                                fontSize:
                                    12
                            }}
                        >
                            플레이리스트에 추가할 노래를 선택하세요.
                        </p>



                        <div
                            style={{
                                maxHeight:
                                    310,

                                overflowY:
                                    'auto',

                                border:
                                    '1px solid #f0e6da',

                                borderRadius:
                                    14
                            }}
                        >

                            {
                                playableSongs.map(
                                    (
                                        song,
                                        index
                                    ) => {

                                        const checked =
                                            selectedSlugs.includes(
                                                song.slug
                                            );


                                        const alreadyAdded =
                                            playlist.some(
                                                item =>
                                                    item.slug ===
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

                                                    minHeight:
                                                        54,

                                                    padding:
                                                        '9px 11px',

                                                    border:
                                                        'none',

                                                    borderBottom:
                                                        index ===
                                                        playableSongs.length - 1
                                                            ? 'none'
                                                            : '1px solid #f2e9df',

                                                    background:
                                                        checked
                                                            ? '#fff7df'
                                                            : '#fff',

                                                    color:
                                                        '#3d3026',

                                                    cursor:
                                                        'pointer',

                                                    textAlign:
                                                        'left'
                                                }}
                                            >

                                                <span
                                                    style={{
                                                        display:
                                                            'grid',

                                                        placeItems:
                                                            'center',

                                                        width:
                                                            25,

                                                        height:
                                                            25,

                                                        flexShrink:
                                                            0,

                                                        border:
                                                            checked
                                                                ? 'none'
                                                                : '1px solid #ddd0c1',

                                                        borderRadius:
                                                            '50%',

                                                        background:
                                                            checked
                                                                ? '#f9b846'
                                                                : '#fff',

                                                        fontSize:
                                                            13,

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
                                                        fontSize:
                                                            20
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

                                                        flex:
                                                            1
                                                    }}
                                                >

                                                    <strong
                                                        style={{
                                                            display:
                                                                'block',

                                                            overflow:
                                                                'hidden',

                                                            textOverflow:
                                                                'ellipsis',

                                                            whiteSpace:
                                                                'nowrap',

                                                            fontSize:
                                                                13
                                                        }}
                                                    >
                                                        {song.title}
                                                    </strong>


                                                    {
                                                        alreadyAdded && (

                                                            <small
                                                                style={{
                                                                    color:
                                                                        '#b7771f'
                                                                }}
                                                            >
                                                                이미 플레이리스트에 있음
                                                            </small>

                                                        )
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
                                    '11px 0',

                                textAlign:
                                    'center',

                                color:
                                    '#8d8175',

                                fontSize:
                                    12,

                                fontWeight:
                                    800
                            }}
                        >
                            {selectedSlugs.length}곡 선택됨
                        </p>



                        <div
                            style={{
                                display:
                                    'grid',

                                gridTemplateColumns:
                                    '0.8fr 1fr 1.25fr',

                                gap:
                                    7
                            }}
                        >

                            <button
                                type="button"
                                onClick={() => {

                                    setSelectedSlugs(
                                        []
                                    );


                                    setAddOpen(
                                        false
                                    );

                                }}
                                style={{
                                    padding:
                                        '12px 5px',

                                    border:
                                        '1px solid #e5d9cc',

                                    borderRadius:
                                        13,

                                    background:
                                        '#fff',

                                    color:
                                        '#66584c',

                                    cursor:
                                        'pointer',

                                    fontWeight:
                                        850
                                }}
                            >
                                취소
                            </button>


                            <button
                                type="button"
                                onClick={
                                    addOnly
                                }
                                style={{
                                    padding:
                                        '12px 5px',

                                    border:
                                        '1px solid #e5d9cc',

                                    borderRadius:
                                        13,

                                    background:
                                        '#fff',

                                    color:
                                        '#3d3026',

                                    cursor:
                                        'pointer',

                                    fontWeight:
                                        900
                                }}
                            >
                                담기
                            </button>


                            <button
                                type="button"
                                onClick={
                                    addAndPlay
                                }
                                style={{
                                    padding:
                                        '12px 5px',

                                    border:
                                        'none',

                                    borderRadius:
                                        13,

                                    background:
                                        '#f9b846',

                                    color:
                                        '#3d3026',

                                    cursor:
                                        'pointer',

                                    fontWeight:
                                        900
                                }}
                            >
                                담고 재생 ▶
                            </button>

                        </div>

                    </div>

                )
            }



            {error && (

                <p
                    style={{
                        margin:
                            '10px 2px 0',

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



function ControlButton({
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
                border:
                    'none',

                background:
                    'transparent',

                color:
                    '#fff',

                cursor:
                    'pointer',

                fontSize:
                    28,

                fontWeight:
                    900
            }}
        >
            {children}
        </button>

    );
}