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


    const enrolledInProgram =
        Array.isArray(
            userPrograms
        ) &&
        userPrograms.includes(
            song.program
        );


    function openSong() {

        if (!loggedIn) {

            router.push(
                `/login?next=${encodeURIComponent(
                    `/song/${song.slug}`
                )}`
            );

            return;

        }


        if (!membership) {

            router.push(
                '/membership'
            );

            return;

        }


        if (!enrolledInProgram) {

            alert(
                `${song.program} 수강 회원만 이용할 수 있는 음원입니다.`
            );

            return;

        }


        if (accessible) {

            router.push(
                `/song/${song.slug}`
            );

            return;

        }


        router.push(
            '/membership'
        );

    }


    function getLockedMessage() {

        if (!loggedIn) {
            return '로그인 후 이용';
        }


        if (!membership) {
            return 'Song Club 멤버십 필요';
        }


        if (!enrolledInProgram) {
            return `${song.program} 수강 회원 전용`;
        }


        return '현재 이용할 수 없는 콘텐츠';
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
