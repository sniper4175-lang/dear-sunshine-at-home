'use client';

import {
    useRouter
} from 'next/navigation';


export default function SongCard({
    song,
    accessible,
    loggedIn,
    membership,
    userPrograms = []
}) {

    const router =
        useRouter();


    /*
     * 현재 이 곡의 수업을
     * 실제로 수강 중인지
     */
    const enrolledInProgram =
        Array.isArray(
            userPrograms
        ) &&
        userPrograms.includes(
            song.program
        );


    /*
     * ==========================================
     * 곡 클릭
     * ==========================================
     */
    function openSong() {

        /*
         * 로그인 전
         */
        if (
            !loggedIn
        ) {

            router.push(
                `/login?next=${encodeURIComponent(
                    `/song/${song.slug}`
                )}`
            );


            return;

        }


        /*
         * Song Club 멤버십 없음
         */
        if (
            !membership
        ) {

            router.push(
                '/membership'
            );


            return;

        }


        /*
         * 현재 수강하지 않는 클래스
         */
        if (
            !enrolledInProgram
        ) {

            alert(
                `${song.program} 수강 회원만 이용할 수 있는 음원입니다.`
            );


            return;

        }


        /*
         * 접근 가능
         */
        if (
            accessible
        ) {

            router.push(
                `/song/${song.slug}`
            );


            return;

        }


        /*
         * 수업은 수강 중이지만
         * 현재 멤버십 플랜으로 접근 불가
         */
        router.push(
            '/membership'
        );

    }



    /*
     * ==========================================
     * 잠금 안내 문구
     * ==========================================
     */
    function getLockedMessage() {

        if (
            !loggedIn
        ) {

            return '로그인 후 이용';

        }


        if (
            !membership
        ) {

            return '멤버십 필요';

        }


        if (
            !enrolledInProgram
        ) {

            return `${song.program} 수강 회원 전용`;

        }


        if (
            song.premiumOnly
        ) {

            return 'Premium 전용';

        }


        return 'Premium에서 전체 이용';

    }



    return (

        <button
            type="button"
            onClick={
                openSong
            }
            className="song-card"
            style={{
                textAlign:
                    'left',

                width:
                    '100%',

                cursor:
                    'pointer',

                opacity:
                    accessible
                        ? 1
                        : 0.72
            }}
        >

            {/* ==================================
                COVER
            =================================== */}

            <div
                className="song-cover"
            >

                <span>
                    {
                        song.emoji ||
                        '🎵'
                    }
                </span>


                {
                    song.popular && (

                        <em>
                            인기
                        </em>

                    )
                }


                {
                    !accessible && (

                        <b
                            className="lock"
                        >
                            🔒
                        </b>

                    )
                }

            </div>



            {/* ==================================
                SONG INFO
            =================================== */}

            <div
                className="song-meta"
            >

                <strong>
                    {song.title}
                </strong>


                <span>
                    {song.program}

                    {
                        song.category
                            ? ` · ${song.category}`
                            : ''
                    }
                </span>


                {
                    !accessible && (

                        <span
                            style={{
                                marginTop:
                                    5,

                                color:
                                    !enrolledInProgram &&
                                    loggedIn &&
                                    membership
                                        ? '#9a6b48'
                                        : '#b7771f',

                                fontSize:
                                    12,

                                fontWeight:
                                    800,

                                lineHeight:
                                    1.45
                            }}
                        >
                            {getLockedMessage()}
                        </span>

                    )
                }

            </div>

        </button>

    );

}