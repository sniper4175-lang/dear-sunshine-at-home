'use client';

import {
    useEffect,
    useRef,
    useState
} from 'react';


const URL_CACHE_MS =
    7 * 60 * 1000;


/*
 * =====================================================
 * PlaylistPlayer
 * =====================================================
 */
export default function PlaylistPlayer({
    songs,
    accessibleSlugs
}) {

    /*
     * =================================================
     * 실제 AUDIO
     * =================================================
     */

    const audioRef =
        useRef(null);



    /*
     * =================================================
     * React State
     * =================================================
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
     * off
     * all
     * one
     */
    const [
        repeatMode,
        setRepeatMode
    ] =
        useState(
            'all'
        );


    const [
        shuffle,
        setShuffle
    ] =
        useState(false);


    const [
        addOpen,
        setAddOpen
    ] =
        useState(false);


    const [
        selectedSlugs,
        setSelectedSlugs
    ] =
        useState([]);


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
     * =================================================
     * BACKGROUND용 REF
     *
     * 화면이 꺼진 상태에서는
     * React state/render에 최대한 의존하지 않고
     * ref 값으로 다음곡을 결정한다.
     * =================================================
     */

    const playlistRef =
        useRef([]);


    const currentSlugRef =
        useRef('');


    const repeatModeRef =
        useRef('all');


    const shuffleRef =
        useRef(false);


    /*
     * 현재 재생 URL
     */
    const currentAudioUrlRef =
        useRef('');


    /*
     * signed URL cache
     *
     * slug => {
     *     url,
     *     createdAt
     * }
     */
    const audioUrlCacheRef =
        useRef(
            new Map()
        );


    /*
     * 바로 다음 곡
     */
    const preparedNextRef =
        useRef({
            slug:
                '',

            url:
                ''
        });


    /*
     * ended 이벤트 중복 방지
     */
    const changingTrackRef =
        useRef(false);



    /*
     * =================================================
     * STATE → REF 동기화
     * =================================================
     */

    useEffect(
        () => {

            playlistRef.current =
                playlist;

        },
        [
            playlist
        ]
    );


    useEffect(
        () => {

            currentSlugRef.current =
                currentSlug;

        },
        [
            currentSlug
        ]
    );


    useEffect(
        () => {

            repeatModeRef.current =
                repeatMode;

        },
        [
            repeatMode
        ]
    );


    useEffect(
        () => {

            shuffleRef.current =
                shuffle;

        },
        [
            shuffle
        ]
    );



    /*
     * =================================================
     * 현재 이용 가능한 곡
     * =================================================
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
        ) ||
        null;



    /*
     * =================================================
     * signed URL
     * =================================================
     */

    async function getAudioUrl(
        slug,
        showLoading = true
    ) {

        if (!slug) {
            return null;
        }


        /*
         * -----------------------------
         * 유효한 캐시 확인
         * -----------------------------
         */

        const cached =
            audioUrlCacheRef.current.get(
                slug
            );


        if (
            cached?.url &&
            Date.now() -
                cached.createdAt <
                URL_CACHE_MS
        ) {

            return cached.url;

        }


        if (
            showLoading
        ) {

            setLoading(
                true
            );

        }


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


            const item = {
                url:
                    data.url,

                createdAt:
                    Date.now()
            };


            audioUrlCacheRef
                .current
                .set(
                    slug,
                    item
                );


            return item.url;


        } catch (e) {

            console.error(
                'audio URL error:',
                e
            );


            if (
                showLoading
            ) {

                setError(
                    e?.message ||
                    '음원을 불러오지 못했습니다.'
                );

            }


            return null;


        } finally {

            if (
                showLoading
            ) {

                setLoading(
                    false
                );

            }

        }

    }



    /*
     * =================================================
     * 곡 찾기
     * =================================================
     */

    function findSong(
        slug
    ) {

        return (
            playlistRef.current.find(
                song =>
                    song.slug ===
                    slug
            ) ||
            null
        );

    }



    /*
     * =================================================
     * 랜덤곡
     * =================================================
     */

    function getRandomSongFromRefs() {

        const list =
            playlistRef.current;


        if (
            list.length ===
            0
        ) {

            return null;

        }


        if (
            list.length ===
            1
        ) {

            return list[0];

        }


        const current =
            currentSlugRef.current;


        const candidates =
            list.filter(
                song =>
                    song.slug !==
                    current
            );


        const index =
            Math.floor(
                Math.random() *
                candidates.length
            );


        return (
            candidates[
                index
            ] ||
            null
        );

    }



    /*
     * =================================================
     * 다음곡 계산
     *
     * 중요:
     * React state가 아니라 ref 기준
     * =================================================
     */

    function getNextSongFromRefs() {

        const list =
            playlistRef.current;


        if (
            list.length ===
            0
        ) {

            return null;

        }


        const current =
            currentSlugRef.current;


        const repeat =
            repeatModeRef.current;


        const shuffleOn =
            shuffleRef.current;



        /*
         * 한 곡 반복
         */
        if (
            repeat ===
            'one'
        ) {

            return (
                findSong(
                    current
                ) ||
                list[0]
            );

        }



        /*
         * 셔플
         */
        if (
            shuffleOn
        ) {

            return (
                getRandomSongFromRefs()
            );

        }



        const index =
            list.findIndex(
                song =>
                    song.slug ===
                    current
            );


        /*
         * 현재곡 없음
         */
        if (
            index < 0
        ) {

            return list[0];

        }


        /*
         * 마지막곡
         */
        if (
            index ===
            list.length - 1
        ) {

            if (
                repeat ===
                'all'
            ) {

                return list[0];

            }


            return null;

        }


        return (
            list[
                index + 1
            ] ||
            null
        );

    }



    /*
     * =================================================
     * 이전곡 계산
     * =================================================
     */

    function getPreviousSongFromRefs() {

        const list =
            playlistRef.current;


        if (
            list.length ===
            0
        ) {

            return null;

        }


        if (
            shuffleRef.current
        ) {

            return (
                getRandomSongFromRefs()
            );

        }


        const index =
            list.findIndex(
                song =>
                    song.slug ===
                    currentSlugRef.current
            );


        if (
            index <= 0
        ) {

            return (
                list[
                    list.length - 1
                ] ||
                null
            );

        }


        return (
            list[
                index - 1
            ] ||
            null
        );

    }



    /*
     * =================================================
     * Media Session Metadata
     * =================================================
     */

    function updateMediaMetadata(
        song
    ) {

        if (
            typeof navigator ===
                'undefined' ||
            !(
                'mediaSession'
                in navigator
            ) ||
            !song
        ) {

            return;

        }


        try {

            navigator
                .mediaSession
                .metadata =
                new MediaMetadata({
                    title:
                        song.title ||
                        'Dear Sunshine',

                    artist:
                        'Dear Sunshine',

                    album:
                        song.program ||
                        'Dear Sunshine 음원 어플'
                });


            navigator
                .mediaSession
                .playbackState =
                'playing';


        } catch (e) {

            console.log(
                'MediaSession metadata:',
                e
            );

        }

    }



    /*
     * =================================================
     * 다음 곡 미리 준비
     * =================================================
     */

    async function prepareNextSong() {

        const nextSong =
            getNextSongFromRefs();


        if (
            !nextSong
        ) {

            preparedNextRef.current = {
                slug:
                    '',

                url:
                    ''
            };


            return;

        }


        /*
         * 1곡 반복이면
         * 현재 URL 그대로
         */
        if (
            nextSong.slug ===
                currentSlugRef.current &&
            currentAudioUrlRef.current
        ) {

            preparedNextRef.current = {
                slug:
                    nextSong.slug,

                url:
                    currentAudioUrlRef.current
            };


            return;

        }


        const url =
            await getAudioUrl(
                nextSong.slug,
                false
            );


        if (
            !url
        ) {

            return;

        }


        /*
         * 그 사이 현재곡이 바뀌었을 수도 있으므로
         * 다시 다음곡 확인
         */

        const stillNext =
            getNextSongFromRefs();


        if (
            stillNext?.slug !==
            nextSong.slug
        ) {

            return;

        }


        preparedNextRef.current = {
            slug:
                nextSong.slug,

            url
        };

    }



    /*
     * =================================================
     * 실제 AUDIO 객체에 곡 연결
     *
     * 핵심 함수
     *
     * React의 src/state 변경을 기다리지 않고
     * audio.src 직접 변경
     * =================================================
     */

    async function startAudioDirect(
        song,
        suppliedUrl = null
    ) {

        if (
            !song
        ) {

            return false;

        }


        const audio =
            audioRef.current;


        if (
            !audio
        ) {

            return false;

        }


        let url =
            suppliedUrl;


        /*
         * 준비된 다음곡 URL 확인
         */
        if (
            !url &&
            preparedNextRef
                .current
                .slug ===
                song.slug &&
            preparedNextRef
                .current
                .url
        ) {

            url =
                preparedNextRef
                    .current
                    .url;

        }


        /*
         * 없으면 API 요청
         */
        if (
            !url
        ) {

            url =
                await getAudioUrl(
                    song.slug
                );

        }


        if (
            !url
        ) {

            return false;

        }


        /*
         * 다음 준비정보 소비
         */
        if (
            preparedNextRef
                .current
                .slug ===
            song.slug
        ) {

            preparedNextRef.current = {
                slug:
                    '',

                url:
                    ''
            };

        }


        /*
         * ---------------------------------------------
         * 중요:
         *
         * React setState 전에 ref부터 변경
         * ---------------------------------------------
         */

        currentSlugRef.current =
            song.slug;


        currentAudioUrlRef.current =
            url;


        /*
         * UI 업데이트
         */
        setCurrentSlug(
            song.slug
        );


        setCurrentTime(
            0
        );


        setDuration(
            0
        );


        setError(
            ''
        );


        /*
         * ---------------------------------------------
         * 핵심:
         *
         * audio.src 직접 변경
         * ---------------------------------------------
         */

        if (
            audio.src !==
            url
        ) {

            audio.src =
                url;

            audio.load();

        } else {

            audio.currentTime =
                0;

        }


        updateMediaMetadata(
            song
        );


        try {

            await audio.play();


            setPlaying(
                true
            );


            /*
             * 다음 곡 미리 준비
             *
             * await하지 않는다.
             * 현재 재생을 방해하지 않도록
             * 백그라운드 실행.
             */
            void prepareNextSong();


            return true;


        } catch (e) {

            /*
             * src 변경 때문에 이전 play가
             * 중단된 경우는 무시
             */
            if (
                e?.name !==
                'AbortError'
            ) {

                console.error(
                    'play error:',
                    e
                );


                setError(
                    '음원을 재생하지 못했습니다.'
                );

            }


            return false;

        }

    }



    /*
     * =================================================
     * 화면에서 곡 직접 클릭
     * =================================================
     */

    async function playSong(
        song
    ) {

        if (
            !song
        ) {
            return;
        }


        setLoading(
            true
        );


        try {

            await startAudioDirect(
                song
            );

        } finally {

            setLoading(
                false
            );

        }

    }



    /*
     * =================================================
     * 곡 종료
     *
     * 이 함수가 이번 수정의 핵심.
     * =================================================
     */

    async function handleEndedDirect() {

        /*
         * 중복 실행 방지
         */
        if (
            changingTrackRef.current
        ) {

            return;

        }


        changingTrackRef.current =
            true;


        try {

            const audio =
                audioRef.current;


            if (
                !audio
            ) {

                return;

            }



            /*
             * -----------------------------------------
             * 1곡 반복
             *
             * src 변경 자체가 필요 없음
             * -----------------------------------------
             */

            if (
                repeatModeRef.current ===
                'one'
            ) {

                audio.currentTime =
                    0;


                try {

                    await audio.play();


                    setPlaying(
                        true
                    );


                    if (
                        'mediaSession'
                        in navigator
                    ) {

                        navigator
                            .mediaSession
                            .playbackState =
                            'playing';

                    }


                } catch (e) {

                    console.error(
                        'repeat play error:',
                        e
                    );

                }


                return;

            }



            /*
             * -----------------------------------------
             * 다음곡
             * -----------------------------------------
             */

            const nextSong =
                getNextSongFromRefs();


            if (
                !nextSong
            ) {

                setPlaying(
                    false
                );


                try {

                    if (
                        'mediaSession'
                        in navigator
                    ) {

                        navigator
                            .mediaSession
                            .playbackState =
                            'paused';

                    }

                } catch {}


                return;

            }



            /*
             * -----------------------------------------
             * 가장 중요
             *
             * 미리 받아놓은 URL을 바로 사용.
             *
             * 화면이 꺼진 순간에는 여기서
             * fetch를 새로 하지 않는 것이 목표.
             * -----------------------------------------
             */

            let nextUrl =
                null;


            if (
                preparedNextRef
                    .current
                    .slug ===
                    nextSong.slug &&
                preparedNextRef
                    .current
                    .url
            ) {

                nextUrl =
                    preparedNextRef
                        .current
                        .url;

            }



            /*
             * 혹시 준비 실패했다면
             * 마지막 fallback으로 요청
             */

            if (
                !nextUrl
            ) {

                nextUrl =
                    await getAudioUrl(
                        nextSong.slug,
                        false
                    );

            }


            if (
                !nextUrl
            ) {

                setPlaying(
                    false
                );

                return;

            }



            /*
             * -----------------------------------------
             * React 렌더를 기다리지 않고
             * 즉시 같은 audio 객체에 다음 src 설정
             * -----------------------------------------
             */

            currentSlugRef.current =
                nextSong.slug;


            currentAudioUrlRef.current =
                nextUrl;


            preparedNextRef.current = {
                slug:
                    '',

                url:
                    ''
            };


            /*
             * UI는 나중에 업데이트되어도 상관없음
             */
            setCurrentSlug(
                nextSong.slug
            );


            setCurrentTime(
                0
            );


            setDuration(
                0
            );


            /*
             * 핵심
             */
            audio.src =
                nextUrl;


            audio.load();


            updateMediaMetadata(
                nextSong
            );


            try {

                await audio.play();


                setPlaying(
                    true
                );


                /*
                 * 다음 다음 곡 준비
                 */
                void prepareNextSong();


            } catch (e) {

                console.error(
                    'background next track error:',
                    e
                );


                setPlaying(
                    false
                );

            }


        } finally {

            changingTrackRef.current =
                false;

        }

    }



    /*
     * =================================================
     * AUDIO 이벤트 직접 연결
     *
     * JSX onEnded보다 명확하게
     * 실제 DOM audio 객체에 붙인다.
     * =================================================
     */

    useEffect(
        () => {

            const audio =
                audioRef.current;


            if (
                !audio
            ) {

                return;

            }


            const handleEnded =
                () => {

                    void handleEndedDirect();

                };


            const handlePlay =
                () => {

                    setPlaying(
                        true
                    );


                    try {

                        if (
                            'mediaSession'
                            in navigator
                        ) {

                            navigator
                                .mediaSession
                                .playbackState =
                                'playing';

                        }

                    } catch {}

                };


            const handlePause =
                () => {

                    setPlaying(
                        false
                    );


                    try {

                        if (
                            'mediaSession'
                            in navigator
                        ) {

                            navigator
                                .mediaSession
                                .playbackState =
                                'paused';

                        }

                    } catch {}

                };


            const handleMetadata =
                () => {

                    setDuration(
                        Number.isFinite(
                            audio.duration
                        )
                            ? audio.duration
                            : 0
                    );

                };


            const handleTime =
                () => {

                    setCurrentTime(
                        audio.currentTime ||
                        0
                    );

                };


            audio.addEventListener(
                'ended',
                handleEnded
            );


            audio.addEventListener(
                'play',
                handlePlay
            );


            audio.addEventListener(
                'pause',
                handlePause
            );


            audio.addEventListener(
                'loadedmetadata',
                handleMetadata
            );


            audio.addEventListener(
                'timeupdate',
                handleTime
            );


            return () => {

                audio.removeEventListener(
                    'ended',
                    handleEnded
                );


                audio.removeEventListener(
                    'play',
                    handlePlay
                );


                audio.removeEventListener(
                    'pause',
                    handlePause
                );


                audio.removeEventListener(
                    'loadedmetadata',
                    handleMetadata
                );


                audio.removeEventListener(
                    'timeupdate',
                    handleTime
                );

            };

        },
        []
    );



    /*
     * =================================================
     * 현재곡 / 플레이리스트가 바뀌면
     * 다음곡 미리 준비
     * =================================================
     */

    useEffect(
        () => {

            if (
                !currentSlug ||
                playlist.length ===
                    0
            ) {

                return;

            }


            void prepareNextSong();


        },
        [
            currentSlug,
            playlist,
            repeatMode,
            shuffle
        ]
    );



    /*
     * =================================================
     * 화면이 꺼지기 직전에도
     * 다음곡 준비를 한번 더 확인
     * =================================================
     */

    useEffect(
        () => {

            function handleVisibility() {

                if (
                    document
                        .visibilityState ===
                    'hidden'
                ) {

                    void prepareNextSong();

                }

            }


            document.addEventListener(
                'visibilitychange',
                handleVisibility
            );


            return () => {

                document.removeEventListener(
                    'visibilitychange',
                    handleVisibility
                );

            };

        },
        []
    );



    /*
     * =================================================
     * Media Session
     *
     * 한 번만 등록.
     *
     * 핸들러 안에서는 ref 사용.
     * =================================================
     */

    useEffect(
        () => {

            if (
                typeof navigator ===
                    'undefined' ||
                !(
                    'mediaSession'
                    in navigator
                )
            ) {

                return;

            }


            try {

                navigator.mediaSession.setActionHandler(
                    'play',
                    async () => {

                        const audio =
                            audioRef.current;


                        if (
                            !audio
                        ) {
                            return;
                        }


                        try {

                            await audio.play();

                        } catch (e) {

                            console.error(
                                e
                            );

                        }

                    }
                );


                navigator.mediaSession.setActionHandler(
                    'pause',
                    () => {

                        audioRef
                            .current
                            ?.pause();

                    }
                );


                navigator.mediaSession.setActionHandler(
                    'nexttrack',
                    () => {

                        void nextSong();

                    }
                );


                navigator.mediaSession.setActionHandler(
                    'previoustrack',
                    () => {

                        void previousSong();

                    }
                );


                navigator.mediaSession.setActionHandler(
                    'seekto',
                    details => {

                        const audio =
                            audioRef.current;


                        if (
                            !audio ||
                            details
                                .seekTime ==
                                null
                        ) {

                            return;

                        }


                        audio.currentTime =
                            details.seekTime;

                    }
                );


            } catch (e) {

                console.log(
                    'MediaSession unsupported:',
                    e
                );

            }


            return () => {

                try {

                    navigator.mediaSession.setActionHandler(
                        'play',
                        null
                    );

                    navigator.mediaSession.setActionHandler(
                        'pause',
                        null
                    );

                    navigator.mediaSession.setActionHandler(
                        'nexttrack',
                        null
                    );

                    navigator.mediaSession.setActionHandler(
                        'previoustrack',
                        null
                    );

                    navigator.mediaSession.setActionHandler(
                        'seekto',
                        null
                    );

                } catch {}

            };

        },
        []
    );



    /*
     * =================================================
     * PLAY / PAUSE
     * =================================================
     */

    async function togglePlay() {

        const list =
            playlistRef.current;


        if (
            list.length ===
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


        const audio =
            audioRef.current;


        if (
            !audio
        ) {

            return;

        }


        /*
         * 아직 시작곡 없음
         */
        if (
            !currentSlugRef.current
        ) {

            await playSong(
                list[0]
            );


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
     * =================================================
     * 반복
     * =================================================
     */

    function changeRepeatMode() {

        setRepeatMode(
            previous => {

                let next =
                    'all';


                if (
                    previous ===
                    'all'
                ) {

                    next =
                        'one';

                } else if (
                    previous ===
                    'one'
                ) {

                    next =
                        'off';

                }


                repeatModeRef.current =
                    next;


                return next;

            }
        );

    }



    /*
     * =================================================
     * 셔플
     * =================================================
     */

    function toggleShuffle() {

        setShuffle(
            previous => {

                const next =
                    !previous;


                shuffleRef.current =
                    next;


                return next;

            }
        );

    }



    /*
     * =================================================
     * 다음곡 버튼
     * =================================================
     */

    async function nextSong() {

        const next =
            getNextSongFromRefs();


        if (
            !next
        ) {

            return;

        }


        await playSong(
            next
        );

    }



    /*
     * =================================================
     * 이전곡 버튼
     * =================================================
     */

    async function previousSong() {

        const previous =
            getPreviousSongFromRefs();


        if (
            !previous
        ) {

            return;

        }


        await playSong(
            previous
        );

    }



    /*
     * =================================================
     * 곡 추가 선택
     * =================================================
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
                            item !==
                            slug
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
     * =================================================
     * 플레이리스트 추가용
     * =================================================
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
            playlistRef.current.map(
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


        const nextPlaylist = [
            ...playlistRef.current,
            ...newSongs
        ];


        /*
         * ref를 먼저 변경
         */
        playlistRef.current =
            nextPlaylist;


        setError(
            ''
        );


        return {
            nextPlaylist,
            selectedSongs
        };

    }



    /*
     * =================================================
     * 담기
     * =================================================
     */

    function addOnly() {

        const result =
            buildAddedPlaylist();


        if (
            !result
        ) {

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


        /*
         * 기존 재생중이면
         * 다음곡 준비 갱신
         */
        if (
            currentSlugRef.current
        ) {

            void prepareNextSong();

        }

    }



    /*
     * =================================================
     * 담고 재생
     * =================================================
     */

    async function addAndPlay() {

        const result =
            buildAddedPlaylist();


        if (
            !result
        ) {

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
            result
                .selectedSongs
                .length >
            0
        ) {

            await playSong(
                result
                    .selectedSongs[
                    0
                ]
            );

        }

    }



    /*
     * =================================================
     * 플레이리스트 삭제
     * =================================================
     */

    async function removeFromPlaylist(
        slug
    ) {

        const oldList =
            playlistRef.current;


        const removeIndex =
            oldList.findIndex(
                song =>
                    song.slug ===
                    slug
            );


        const wasCurrent =
            slug ===
            currentSlugRef.current;


        const nextPlaylist =
            oldList.filter(
                song =>
                    song.slug !==
                    slug
            );


        /*
         * ref 먼저
         */
        playlistRef.current =
            nextPlaylist;


        setPlaylist(
            nextPlaylist
        );


        /*
         * 재생곡 아닌 경우
         */
        if (
            !wasCurrent
        ) {

            void prepareNextSong();

            return;

        }


        /*
         * 전부 삭제
         */
        if (
            nextPlaylist.length ===
            0
        ) {

            const audio =
                audioRef.current;


            if (
                audio
            ) {

                audio.pause();

                audio.removeAttribute(
                    'src'
                );

                audio.load();

            }


            currentSlugRef.current =
                '';


            currentAudioUrlRef.current =
                '';


            preparedNextRef.current = {
                slug:
                    '',

                url:
                    ''
            };


            setCurrentSlug(
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
         * 삭제된 곡 다음 위치 재생
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
     * =================================================
     * SEEK
     * =================================================
     */

    function seekAudio(
        e
    ) {

        const value =
            Number(
                e.target.value
            );


        const audio =
            audioRef.current;


        if (
            audio
        ) {

            audio.currentTime =
                value;

        }


        setCurrentTime(
            value
        );

    }



    /*
     * =================================================
     * TIME
     * =================================================
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
     * =================================================
     * 반복 표시
     * =================================================
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



    /*
     * =================================================
     * RENDER
     * =================================================
     */

    return (

        <div
            style={{
                marginBottom:
                    30
            }}
        >

            {/*
             * ==========================================
             * 실제 AUDIO
             *
             * src를 React prop으로 제어하지 않는다.
             * ==========================================
             */}

            <audio
                ref={
                    audioRef
                }
                preload="auto"
            />



            {/*
             * ==========================================
             * PLAYER
             * ==========================================
             */}

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

                {/*
                 * 앨범 이미지
                 */}

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



                {/*
                 * 곡 제목
                 */}

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



                {/*
                 * 진행바
                 */}

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



                {/*
                 * 컨트롤
                 */}

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

                    {/*
                     * 반복
                     */}

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



                    {/*
                     * 이전
                     */}

                    <ControlButton
                        onClick={
                            previousSong
                        }
                    >
                        ⏮
                    </ControlButton>



                    {/*
                     * 재생
                     */}

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



                    {/*
                     * 다음
                     */}

                    <ControlButton
                        onClick={
                            nextSong
                        }
                    >
                        ⏭
                    </ControlButton>



                    {/*
                     * 셔플
                     */}

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



            {/*
             * ==========================================
             * PLAYLIST HEADER
             * ==========================================
             */}

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



            {/*
             * ==========================================
             * PLAYLIST
             * ==========================================
             */}

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



            {/*
             * ==========================================
             * 곡 추가
             * ==========================================
             */}

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



            {
                error && (

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

                )
            }

        </div>

    );

}



/*
 * =====================================================
 * Control Button
 * =====================================================
 */

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