'use client';

import {
    useEffect,
    useRef,
    useState
} from 'react';

import {
    usePathname
} from 'next/navigation';


export default function AudioPlayer({
    title,
    slug
}) {

    const audioRef =
        useRef(null);


    const pathname =
        usePathname();


    /*
     * 한 번의 실제 재생 세션에서
     * 동일 곡이 여러 번 기록되지 않도록 합니다.
     * 일시정지 후 이어듣기는 같은 세션으로 보고,
     * 곡이 끝난 뒤 다시 재생하면 새 이력으로 기록합니다.
     */
    const playLoggedRef =
        useRef(false);


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


    const [
        looping,
        setLooping
    ] =
        useState(false);


    const [
        shouldPlay,
        setShouldPlay
    ] =
        useState(false);



    /*
     * 상세 페이지가 같은 컴포넌트를 재사용하더라도
     * 곡이 바뀌면 새 재생 세션으로 기록할 수 있게 초기화합니다.
     */
    useEffect(
        () => {

            playLoggedRef.current =
                false;

        },
        [
            slug
        ]
    );


    function playSource() {

        return pathname?.startsWith(
            '/home-package/'
        )
            ? 'home_package'
            : 'song_club';

    }


    function logPlayOnce() {

        if (
            !slug ||
            playLoggedRef.current
        ) {
            return;
        }


        playLoggedRef.current =
            true;


        void fetch(
            '/api/play-history',
            {
                method:
                    'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body:
                    JSON.stringify({
                        slug,
                        source:
                            playSource()
                    }),

                keepalive:
                    true
            }
        )
            .then(
                response => {

                    if (
                        !response.ok
                    ) {

                        playLoggedRef.current =
                            false;

                    }

                }
            )
            .catch(
                () => {

                    /*
                     * 이력 저장 실패가 음원 재생을 막으면 안 됩니다.
                     * 다음 재생 때 다시 기록할 수 있도록 플래그만 되돌립니다.
                     */
                    playLoggedRef.current =
                        false;

                }
            );

    }


    /*
     * signed URL이 준비된 뒤에만 재생
     */
    useEffect(
        () => {

            if (
                !audioUrl ||
                !shouldPlay ||
                !audioRef.current
            ) {
                return;
            }


            const audio =
                audioRef.current;


            async function startPlayback() {

                try {

                    await audio.play();

                    setPlaying(
                        true
                    );

                    setShouldPlay(
                        false
                    );

                } catch (e) {

                    console.error(
                        'Audio playback error:',
                        e
                    );


                    setPlaying(
                        false
                    );

                    setShouldPlay(
                        false
                    );


                    /*
                     * AbortError는
                     * src 변경 과정에서 발생할 수 있으므로
                     * 사용자 오류로 표시하지 않음
                     */
                    if (
                        e?.name !==
                        'AbortError'
                    ) {

                        setError(
                            '음원 재생 중 오류가 발생했습니다.'
                        );

                    }

                }

            }


            startPlayback();

        },
        [
            audioUrl,
            shouldPlay
        ]
    );



    /*
     * Supabase signed URL 가져오기
     */
    async function loadAudio() {

        if (audioUrl) {
            return audioUrl;
        }


        if (!slug) {

            setError(
                '음원 정보가 없습니다.'
            );

            return null;

        }


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


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    '음원을 불러오지 못했습니다.'
                );

            }


            if (!data.url) {

                throw new Error(
                    '음원 주소가 없습니다.'
                );

            }


            setAudioUrl(
                data.url
            );


            return data.url;


        } catch (e) {

            console.error(
                'Audio URL error:',
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
     * 재생 / 일시정지
     */
    async function toggle() {

        if (loading) {
            return;
        }


        setError(
            ''
        );


        /*
         * 아직 signed URL이 없을 경우
         */
        if (!audioUrl) {

            const url =
                await loadAudio();


            if (!url) {
                return;
            }


            /*
             * 여기서 바로 play() 하지 않음.
             *
             * React가 <audio src={audioUrl}>을
             * 먼저 반영하도록 한 뒤
             * useEffect에서 재생.
             */
            setShouldPlay(
                true
            );


            return;

        }


        const audio =
            audioRef.current;


        if (!audio) {
            return;
        }


        try {

            if (audio.paused) {

                await audio.play();

                setPlaying(
                    true
                );

            } else {

                audio.pause();

                setPlaying(
                    false
                );

            }

        } catch (e) {

            console.error(
                'Audio toggle error:',
                e
            );


            /*
             * AbortError는
             * 실제 음원 오류가 아님
             */
            if (
                e?.name !==
                'AbortError'
            ) {

                setError(
                    '음원 재생 중 오류가 발생했습니다.'
                );

            }

        }

    }



    /*
     * 반복 재생
     */
    function toggleLoop() {

        const next =
            !looping;


        setLooping(
            next
        );


        if (
            audioRef.current
        ) {

            audioRef.current.loop =
                next;

        }

    }



    return (

        <div>


            <div className="player">


                <audio
                    ref={
                        audioRef
                    }
                    src={
                        audioUrl ||
                        undefined
                    }
                    preload="none"
                    loop={
                        looping
                    }

                    onPlay={() => {

                        setPlaying(
                            true
                        );

                        setError(
                            ''
                        );

                        logPlayOnce();

                    }}

                    onPause={() =>
                        setPlaying(
                            false
                        )
                    }

                    onEnded={() => {

                        if (!looping) {

                            setPlaying(
                                false
                            );

                            playLoggedRef.current =
                                false;

                        }

                    }}

                    onError={() => {

                        /*
                         * signed URL이 존재하는데
                         * 실제 파일 로딩에 실패한 경우만 표시
                         */
                        if (audioUrl) {

                            setPlaying(
                                false
                            );

                            setError(
                                '음원 파일을 재생할 수 없습니다.'
                            );

                        }

                    }}
                />



                {/* 재생 / 일시정지 */}

                <button
                    type="button"
                    onClick={
                        toggle
                    }
                    disabled={
                        loading
                    }
                    aria-label={
                        playing
                            ? '일시정지'
                            : '재생'
                    }
                >

                    {
                        loading
                            ? '…'
                            : playing
                                ? '❚❚'
                                : '▶'
                    }

                </button>



                {/* 곡 정보 */}

                <div>

                    <strong>
                        {title}
                    </strong>


                    <span>

                        {
                            loading
                                ? '음원 불러오는 중...'
                                : playing
                                    ? '재생 중'
                                    : '노래 듣기'
                        }

                    </span>

                </div>



                {/* 반복 재생 */}

                <button
                    type="button"
                    className="repeat-button"
                    onClick={
                        toggleLoop
                    }
                    aria-label="반복 재생"
                    title={
                        looping
                            ? '반복 재생 켜짐'
                            : '반복 재생 꺼짐'
                    }
                    style={{
                        opacity:
                            looping
                                ? 1
                                : 0.65,

                        outline:
                            looping
                                ? '2px solid #f9b846'
                                : 'none'
                    }}
                >
                    ↻
                </button>


            </div>



            {/* 실제 오류만 표시 */}

            {error && (

                <p
                    style={{
                        marginTop:
                            10,

                        marginBottom:
                            0,

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